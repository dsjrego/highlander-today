import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, isAdmin, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const UpdateStoreSchema = z
  .object({
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(2000).nullable().optional(),
    logoUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
    bannerUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
    websiteUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
    contactEmail: z.string().trim().email().nullable().optional().or(z.literal('')),
    contactPhone: z.string().trim().max(40).nullable().optional(),
    resubmitForApproval: z.boolean().optional(),
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

function canManageStore(
  permissionUser: PermissionUser,
  store: {
    ownerUserId: string;
    memberships: Array<{ userId: string; role: 'OWNER' | 'MANAGER' }>;
  }
) {
  return (
    isAdmin(permissionUser) ||
    store.ownerUserId === permissionUser.id ||
    store.memberships.some(
      (membership) =>
        membership.userId === permissionUser.id &&
        (membership.role === 'OWNER' || membership.role === 'MANAGER')
    )
  );
}

function canSeeStoreContact(
  permissionUser: PermissionUser | null,
  store: {
    ownerUserId: string;
    memberships: Array<{ userId: string; role: 'OWNER' | 'MANAGER' }>;
  }
) {
  if (!permissionUser) {
    return false;
  }

  return (
    permissionUser.trust_level === 'TRUSTED' ||
    canManageStore(permissionUser, store)
  );
}

function createBaseSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'store';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionUser = buildPermissionUser(request);

    const store = await db.store.findUnique({
      where: { id: params.id },
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
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const isPublic = store.status === 'APPROVED';
    const canManage = permissionUser ? canManageStore(permissionUser, store) : false;

    if (!isPublic && !canManage) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...store,
      contactEmail: canSeeStoreContact(permissionUser, store) ? store.contactEmail : null,
      contactPhone: canSeeStoreContact(permissionUser, store) ? store.contactPhone : null,
      canManage,
    });
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
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

    const store = await db.store.findUnique({
      where: { id: params.id },
      include: {
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (!canManageStore(permissionUser, store)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateStoreSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');

    let slugUpdate: string | undefined;
    if (validated.name && validated.name !== store.name) {
      const baseSlug = createBaseSlug(validated.name);
      const existingCount = await db.store.count({
        where: {
          communityId: store.communityId,
          id: { not: store.id },
          slug: { startsWith: baseSlug },
        },
      });
      slugUpdate = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;
    }

    const resubmitting = Boolean(validated.resubmitForApproval);
    if (resubmitting && store.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected stores can be resubmitted for approval' },
        { status: 400 }
      );
    }

    const updated = await db.store.update({
      where: { id: params.id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(slugUpdate ? { slug: slugUpdate } : {}),
        ...(validated.description !== undefined
          ? { description: validated.description || null }
          : {}),
        ...(validated.logoUrl !== undefined
          ? { logoUrl: validated.logoUrl || null }
          : {}),
        ...(validated.bannerUrl !== undefined
          ? { bannerUrl: validated.bannerUrl || null }
          : {}),
        ...(validated.websiteUrl !== undefined
          ? { websiteUrl: validated.websiteUrl || null }
          : {}),
        ...(validated.contactEmail !== undefined
          ? { contactEmail: validated.contactEmail || null }
          : {}),
        ...(validated.contactPhone !== undefined
          ? { contactPhone: validated.contactPhone || null }
          : {}),
        ...(resubmitting
          ? {
              status: 'PENDING_APPROVAL',
              approvedAt: null,
              approvedByUserId: null,
            }
          : {}),
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
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    await logActivity({
      userId: permissionUser.id,
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        entityType: 'STORE',
        name: updated.name,
        status: updated.status,
        resubmitted: resubmitting,
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
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}
