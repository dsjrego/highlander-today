import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, isAdmin, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import {
  canTransitionSellerMarketplaceStatus,
  isPublicMarketplaceStatus,
  SELLER_STATUS_TRANSITIONS,
} from '@/lib/marketplace-status';
import { z } from 'zod';

const UPDATE_STATUSES = ['DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'ARCHIVED', 'REMOVED'] as const;
const LISTING_TYPES = ['PRODUCT', 'FOOD', 'SERVICE'] as const;

const UpdateMarketplaceSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().min(10).max(5000).nullable().optional(),
    priceCents: z.number().int().min(0).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    listingType: z.enum(LISTING_TYPES).optional(),
    contactMethod: z.string().trim().min(1).max(50).optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(UPDATE_STATUSES).optional(),
    images: z.array(z.string()).max(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
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

function canManageListing(
  permissionUser: PermissionUser,
  listing: {
    authorUserId: string;
    store: {
      ownerUserId: string;
      memberships: Array<{ role: 'OWNER' | 'MANAGER'; userId: string }>;
    };
  }
) {
  return (
    isAdmin(permissionUser) ||
    listing.authorUserId === permissionUser.id ||
    listing.store.ownerUserId === permissionUser.id ||
    listing.store.memberships.some(
      (membership) =>
        membership.userId === permissionUser.id &&
        (membership.role === 'OWNER' || membership.role === 'MANAGER')
    )
  );
}

function canViewListing(
  request: NextRequest,
  listing: {
    status: string;
    authorUserId: string;
    store: {
      status: string;
      ownerUserId: string;
      memberships: Array<{ role: 'OWNER' | 'MANAGER'; userId: string }>;
      contactEmail: string | null;
      contactPhone: string | null;
    };
  }
) {
  const permissionUser = buildPermissionUser(request);
  const isPublic =
    isPublicMarketplaceStatus(listing.status) &&
    listing.store.status === 'APPROVED';

  if (isPublic) {
    return true;
  }

  if (!permissionUser) {
    return false;
  }

  return canManageListing(permissionUser, listing);
}

function canSeeSellerContact(request: NextRequest, listing: Parameters<typeof canViewListing>[1]) {
  const permissionUser = buildPermissionUser(request);

  if (!permissionUser) {
    return false;
  }

  return (
    permissionUser.trust_level === 'TRUSTED' ||
    canManageListing(permissionUser, listing)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listing = await db.marketplaceListing.findUnique({
      where: { id: params.id },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        store: {
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
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (!canViewListing(request, listing)) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    const includeSellerContact = canSeeSellerContact(request, listing);
    const { contactEmail, contactPhone, memberships, ...store } = listing.store;

    return NextResponse.json({
      ...listing,
      store: {
        ...store,
        ...(includeSellerContact
          ? { contactEmail, contactPhone }
          : { contactEmail: null, contactPhone: null }),
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.EDIT_MARKETPLACE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const listing = await db.marketplaceListing.findUnique({
      where: { id: params.id },
      include: {
        store: {
          select: {
            id: true,
            ownerUserId: true,
            memberships: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (!canManageListing(permissionUser, listing)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateMarketplaceSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');
    const adminUser = isAdmin(permissionUser);

    if (validated.status !== undefined && !adminUser) {
      if (
        !canTransitionSellerMarketplaceStatus(listing.status, validated.status) &&
        validated.status !== listing.status
      ) {
        return NextResponse.json(
          {
            error: `Listings can move from ${listing.status} only to ${(
              SELLER_STATUS_TRANSITIONS[
                listing.status as keyof typeof SELLER_STATUS_TRANSITIONS
              ] || []
            ).join(', ') || 'no seller-managed states'}`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await db.marketplaceListing.update({
      where: { id: params.id },
      data: {
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.description !== undefined
          ? { description: validated.description }
          : {}),
        ...(validated.priceCents !== undefined
          ? { priceCents: validated.priceCents }
          : {}),
        ...(validated.category !== undefined
          ? { category: validated.category }
          : {}),
        ...(validated.listingType !== undefined
          ? { listingType: validated.listingType }
          : {}),
        ...(validated.contactMethod !== undefined
          ? { contactMethod: validated.contactMethod }
          : {}),
        ...(validated.expiresAt !== undefined
          ? {
              expiresAt: validated.expiresAt
                ? new Date(validated.expiresAt)
                : null,
            }
          : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.images !== undefined
          ? {
              photos: {
                deleteMany: {},
                create: validated.images.map((url, index) => ({
                  imageUrl: url,
                  sortOrder: index,
                })),
              },
            }
          : {}),
      },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    await logActivity({
      userId: permissionUser.id,
      action: 'UPDATE',
      resourceType: 'MARKETPLACE_LISTING',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        previousStatus: listing.status,
        status: updated.status,
        statusChanged: listing.status !== updated.status,
        listingType: updated.listingType,
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
    console.error('Error updating marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.DELETE_MARKETPLACE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const listing = await db.marketplaceListing.findUnique({
      where: { id: params.id },
      include: {
        photos: true,
        store: {
          select: {
            id: true,
            ownerUserId: true,
            memberships: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    if (!canManageListing(permissionUser, listing)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const ipAddress = request.headers.get('x-client-ip');

    await db.marketplaceListing.delete({
      where: { id: params.id },
    });

    await logActivity({
      userId: permissionUser.id,
      action: 'DELETE',
      resourceType: 'MARKETPLACE_LISTING',
      resourceId: listing.id,
      ipAddress,
      metadata: {
        title: listing.title,
        storeId: listing.storeId,
        status: listing.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting marketplace listing:', error);
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    );
  }
}
