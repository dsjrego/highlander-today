import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  bio: z.string().max(1000).optional(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  dateOfBirth: z.string().optional(),
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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        profilePhotoUrl: true,
        trustLevel: true,
        isIdentityLocked: true,
        dateOfBirth: true,
        createdAt: true,
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
    const totalPosts =
      user._count.articles +
      user._count.eventsSubmitted +
      user._count.marketplaceListings;

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      trustLevel: user.trustLevel,
      isIdentityLocked: user.isIdentityLocked,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      role,
      community,
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

    const user = await db.user.findUnique({
      where: { id: userId },
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
    if (user.isIdentityLocked && isChangingLockedIdentityField) {
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

    const updated = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        profilePhotoUrl: true,
        trustLevel: true,
        isIdentityLocked: true,
        createdAt: true,
      },
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
