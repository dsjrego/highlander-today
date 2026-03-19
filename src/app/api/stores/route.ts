import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, isAdmin, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const CreateStoreSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  bannerUrl: z.string().trim().url().optional().or(z.literal('')),
  websiteUrl: z.string().trim().url().optional().or(z.literal('')),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40).optional(),
});

function buildPermissionUser(request: NextRequest): PermissionUser | null {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || '';
  const userTrustLevel = request.headers.get('x-user-trust-level') || '';
  const communityId = request.headers.get('x-community-id') || undefined;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    role: userRole,
    trust_level: userTrustLevel,
    community_id: communityId,
  };
}

async function resolveCommunityId(request: NextRequest) {
  const headerCommunityId = request.headers.get('x-community-id');

  if (headerCommunityId) {
    return headerCommunityId;
  }

  const community = await db.community.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return community?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mine = searchParams.get('mine') === '1';
    const includeListings = searchParams.get('includeListings') === '1';
    const status = searchParams.get('status')?.trim().toUpperCase();
    const communityId = await resolveCommunityId(request);

    if (!communityId) {
      return NextResponse.json({ stores: [] });
    }

    const permissionUser = buildPermissionUser(request);
    if (mine && !permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: Record<string, unknown> = {
      communityId,
    };

    if (status) {
      where.status = status;
    }

    if (mine && permissionUser) {
      where.OR = [
        { ownerUserId: permissionUser.id },
        { memberships: { some: { userId: permissionUser.id } } },
      ];
    } else if (!mine) {
      where.status = 'APPROVED';
    }

    const stores = await db.store.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        memberships: {
          where: permissionUser
            ? {
                userId: permissionUser.id,
              }
            : undefined,
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            listings: true,
          },
        },
        listings:
          mine && includeListings
            ? {
                select: {
                  id: true,
                  title: true,
                  status: true,
                  priceCents: true,
                  createdAt: true,
                  updatedAt: true,
                  category: true,
                  listingType: true,
                  photos: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1,
                    select: {
                      id: true,
                      imageUrl: true,
                    },
                  },
                },
                orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
              }
            : false,
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      stores: stores.map((store) => ({
        ...store,
        canManage:
          Boolean(permissionUser) &&
          (isAdmin(permissionUser as PermissionUser) ||
            store.ownerUserId === permissionUser?.id ||
            store.memberships.some(
              (membership) =>
                membership.role === 'OWNER' || membership.role === 'MANAGER'
            )),
      })),
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

function createBaseSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'store';
}

export async function POST(request: NextRequest) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.CREATE_MARKETPLACE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateStoreSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');

    const baseSlug = createBaseSlug(validated.name);
    const existingCount = await db.store.count({
      where: {
        communityId,
        slug: {
          startsWith: baseSlug,
        },
      },
    });
    const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

    const store = await db.store.create({
      data: {
        communityId,
        ownerUserId: permissionUser.id,
        name: validated.name,
        slug,
        description: validated.description || null,
        logoUrl: validated.logoUrl || null,
        bannerUrl: validated.bannerUrl || null,
        websiteUrl: validated.websiteUrl || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        status: 'PENDING_APPROVAL',
        memberships: {
          create: {
            userId: permissionUser.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    await logActivity({
      userId: permissionUser.id,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: store.id,
      ipAddress,
      metadata: {
        entityType: 'STORE',
        name: store.name,
        slug: store.slug,
        status: store.status,
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
