import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { UserPlaceRelationshipType } from '@prisma/client';

const PLACE_RELATIONSHIP_OPTIONS = [
  UserPlaceRelationshipType.FROM_HERE,
  UserPlaceRelationshipType.FAMILY_IN,
  UserPlaceRelationshipType.WORKS_IN,
  UserPlaceRelationshipType.OWNS_PROPERTY_IN,
  UserPlaceRelationshipType.CARES_ABOUT,
] as const;

const CurrentLocationSchema = z
  .object({
    placeId: z.string().uuid().nullable().optional(),
    fallbackLocationText: z.string().trim().max(255).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    const hasPlaceId = Boolean(value.placeId);
    const hasFallback = Boolean(value.fallbackLocationText?.trim());

    if (!hasPlaceId && !hasFallback) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Current location requires either a place selection or fallback text.',
        path: ['placeId'],
      });
    }
  });

const ConnectedPlaceSchema = z.object({
  placeId: z.string().uuid(),
  relationshipType: z
    .nativeEnum(UserPlaceRelationshipType)
    .refine((value) => PLACE_RELATIONSHIP_OPTIONS.includes(value as (typeof PLACE_RELATIONSHIP_OPTIONS)[number]), {
      message: 'Unsupported connected-place relationship type.',
    }),
});

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  dateOfBirth: z.string().optional(),
  isDirectoryListed: z.boolean().optional(),
  currentLocation: CurrentLocationSchema.optional(),
  connectedPlaces: z.array(ConnectedPlaceSchema).max(3).optional(),
});

/**
 * GET /api/profile — Read the authenticated user's own profile
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = request.headers.get('x-user-role');
    const requestedUserId = request.nextUrl.searchParams.get('userId');
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    if (requestedUserId && !isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const targetUserId = requestedUserId && isSuperAdmin ? requestedUserId : userId;

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        profilePhotoUrl: true,
        isDirectoryListed: true,
        trustLevel: true,
        isIdentityLocked: true,
        dateOfBirth: true,
        createdAt: true,
        placeRelationships: {
          orderBy: [{ isCurrent: 'desc' }, { isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            relationshipType: true,
            isPrimary: true,
            isCurrent: true,
            fallbackLocationText: true,
            source: true,
            place: {
              select: {
                id: true,
                name: true,
                displayName: true,
                slug: true,
                type: true,
                countryCode: true,
                admin1Code: true,
                admin1Name: true,
                admin2Name: true,
              },
            },
          },
        },
        memberships: {
          select: {
            role: true,
            community: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        vouchesReceived: {
          select: { id: true, voucherUserId: true, createdAt: true },
        },
        _count: {
          select: {
            articles: true,
            eventsSubmitted: true,
            marketplaceListings: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = user.memberships?.[0]?.role ?? 'READER';
    const community = user.memberships?.[0]?.community ?? null;
    const coverageAreas = community
      ? await db.tenantCoverageArea.findMany({
          where: {
            communityId: community.id,
            isActive: true,
          },
          orderBy: [
            { coverageType: 'asc' },
            { isPrimary: 'desc' },
            { place: { displayName: 'asc' } },
          ],
          select: {
            coverageType: true,
            isPrimary: true,
            place: {
              select: {
                id: true,
                name: true,
                displayName: true,
                slug: true,
                type: true,
                countryCode: true,
                admin1Code: true,
                admin1Name: true,
                admin2Name: true,
              },
            },
          },
        })
      : [];
    const totalPosts =
      user._count.articles +
      user._count.eventsSubmitted +
      user._count.marketplaceListings;
    const currentLocation =
      user.placeRelationships.find((relationship) => relationship.isCurrent) ?? null;
    const connectedPlaces = user.placeRelationships.filter((relationship) => !relationship.isCurrent);

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      isDirectoryListed: user.isDirectoryListed,
      trustLevel: user.trustLevel,
      isIdentityLocked: user.isIdentityLocked,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      role,
      community,
      coverageAreas,
      currentLocation,
      connectedPlaces,
      vouchCount: user.vouchesReceived.length,
      postCount: totalPosts,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile — Update the authenticated user's own profile
 * Respects identity lock: if user is identity-locked, firstName/lastName are rejected.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = request.headers.get('x-user-role');
    const requestedUserId = request.nextUrl.searchParams.get('userId');
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    if (requestedUserId && !isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const targetUserId = requestedUserId && isSuperAdmin ? requestedUserId : userId;

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        isIdentityLocked: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateProfileSchema.parse(body);

    const normalizedCurrentDob = user.dateOfBirth
      ? user.dateOfBirth.toISOString().split('T')[0]
      : null;
    const normalizedIncomingDob =
      validated.dateOfBirth === undefined
        ? undefined
        : validated.dateOfBirth || null;

    const isChangingLockedIdentityField =
      (validated.firstName !== undefined && validated.firstName !== user.firstName) ||
      (validated.lastName !== undefined && validated.lastName !== user.lastName) ||
      (normalizedIncomingDob !== undefined && normalizedIncomingDob !== normalizedCurrentDob);

    // If identity is locked, reject actual name or DOB changes.
    if (user.isIdentityLocked && isChangingLockedIdentityField && !isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Identity locked',
          message:
            'Your name and date of birth cannot be changed after identity verification. Only bio and photo can be updated.',
        },
        { status: 403 }
      );
    }

    const updateData: Record<string, any> = {};
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.bio !== undefined) updateData.bio = validated.bio;
    if (validated.profilePhotoUrl !== undefined)
      updateData.profilePhotoUrl = validated.profilePhotoUrl;
    if (validated.dateOfBirth !== undefined) {
      updateData.dateOfBirth = validated.dateOfBirth ? new Date(validated.dateOfBirth) : null;
    }
    if (validated.isDirectoryListed !== undefined) {
      updateData.isDirectoryListed = validated.isDirectoryListed;
    }

    if (validated.currentLocation?.placeId) {
      const place = await db.place.findFirst({
        where: {
          id: validated.currentLocation.placeId,
          isActive: true,
          isSelectable: true,
        },
        select: { id: true },
      });

      if (!place) {
        return NextResponse.json({ error: 'Selected place not found' }, { status: 400 });
      }
    }

    if (validated.connectedPlaces?.length) {
      const placeIds = [...new Set(validated.connectedPlaces.map((entry) => entry.placeId))];
      const placeCount = await db.place.count({
        where: {
          id: { in: placeIds },
          isActive: true,
          isSelectable: true,
        },
      });

      if (placeCount !== placeIds.length) {
        return NextResponse.json({ error: 'One or more connected places were not found' }, { status: 400 });
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: targetUserId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          bio: true,
          profilePhotoUrl: true,
          isDirectoryListed: true,
          trustLevel: true,
          isIdentityLocked: true,
          createdAt: true,
        },
      });

      if (validated.currentLocation !== undefined) {
        await tx.userPlaceRelationship.deleteMany({
          where: {
            userId: targetUserId,
            isCurrent: true,
          },
        });

        await tx.userPlaceRelationship.create({
          data: {
            userId: targetUserId,
            placeId: validated.currentLocation.placeId || null,
            relationshipType: UserPlaceRelationshipType.CURRENT_RESIDENT,
            isPrimary: true,
            isCurrent: true,
            fallbackLocationText: validated.currentLocation.fallbackLocationText?.trim() || null,
            source: 'USER_SELECTED',
          },
        });
      }

      if (validated.connectedPlaces !== undefined) {
        await tx.userPlaceRelationship.deleteMany({
          where: {
            userId: targetUserId,
            isCurrent: false,
            relationshipType: {
              in: [...PLACE_RELATIONSHIP_OPTIONS],
            },
          },
        });

        if (validated.connectedPlaces.length > 0) {
          await tx.userPlaceRelationship.createMany({
            data: validated.connectedPlaces.map((entry, index) => ({
              userId: targetUserId,
              placeId: entry.placeId,
              relationshipType: entry.relationshipType,
              isPrimary: index === 0,
              isCurrent: false,
              fallbackLocationText: null,
              source: 'USER_SELECTED',
            })),
          });
        }
      }

      return nextUser;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
