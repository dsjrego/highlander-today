import { NextRequest, NextResponse } from 'next/server';
import { type Prisma, type MarketplaceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, isAdmin, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const LISTING_CREATE_STATUSES = ['DRAFT', 'PENDING', 'ACTIVE'] as const;
const LISTING_TYPES = ['PRODUCT', 'FOOD', 'SERVICE'] as const;
const PUBLIC_LISTING_STATUSES: MarketplaceStatus[] = ['ACTIVE', 'PENDING', 'SOLD'];

const CreateMarketplaceSchema = z.object({
  storeId: z.string().uuid(),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(5000).optional(),
  priceCents: z.number().int().min(0),
  category: z.string().trim().min(1).max(100),
  listingType: z.enum(LISTING_TYPES).optional(),
  contactMethod: z.string().trim().min(1).max(50).default('message'),
  expiresAt: z.string().datetime().optional(),
  images: z.array(z.string()).max(5).optional(),
  status: z.enum(LISTING_CREATE_STATUSES).optional(),
});

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

function canManageStore(
  permissionUser: PermissionUser,
  store: {
    ownerUserId: string;
    memberships: Array<{ role: 'OWNER' | 'MANAGER' }>;
  }
) {
  return (
    isAdmin(permissionUser) ||
    store.ownerUserId === permissionUser.id ||
    store.memberships.some((membership) =>
      membership.role === 'OWNER' || membership.role === 'MANAGER'
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const category = searchParams.get('category')?.trim();
    const storeId = searchParams.get('storeId')?.trim();
    const listingType = searchParams.get('listingType')?.trim().toUpperCase();
    const communityId = await resolveCommunityId(request);

    if (!communityId) {
      return NextResponse.json({
        listings: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const where: Prisma.MarketplaceListingWhereInput = {
      communityId,
      status: {
        in: PUBLIC_LISTING_STATUSES,
      },
      store: {
        status: 'APPROVED',
      },
    };

    if (category) {
      where.category = category;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (listingType && LISTING_TYPES.includes(listingType as (typeof LISTING_TYPES)[number])) {
      where.listingType = listingType as (typeof LISTING_TYPES)[number];
    }

    const total = await db.marketplaceListing.count({ where });
    const listings = await db.marketplaceListing.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
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
    const validated = CreateMarketplaceSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');

    const store = await db.store.findFirst({
      where: {
        id: validated.storeId,
        communityId,
      },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        memberships: {
          where: {
            userId: permissionUser.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (store.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Store must be approved before listings can be published' },
        { status: 403 }
      );
    }

    if (!canManageStore(permissionUser, store)) {
      return NextResponse.json(
        { error: 'You do not manage this store' },
        { status: 403 }
      );
    }

    const listing = await db.marketplaceListing.create({
      data: {
        storeId: store.id,
        authorUserId: permissionUser.id,
        communityId,
        title: validated.title,
        description: validated.description || null,
        priceCents: validated.priceCents,
        category: validated.category,
        listingType: validated.listingType ?? 'PRODUCT',
        contactMethod: validated.contactMethod,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        status: validated.status ?? 'ACTIVE',
        photos: validated.images?.length
          ? {
              create: validated.images.map((url, index) => ({
                imageUrl: url,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
      },
    });

    await logActivity({
      userId: permissionUser.id,
      action: 'CREATE',
      resourceType: 'MARKETPLACE_LISTING',
      resourceId: listing.id,
      ipAddress,
      metadata: {
        storeId: listing.storeId,
        title: listing.title,
        status: listing.status,
        listingType: listing.listingType,
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    );
  }
}
