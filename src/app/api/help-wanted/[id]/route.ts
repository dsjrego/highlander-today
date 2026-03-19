import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, isAdmin, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const UPDATE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'FILLED',
  'CLOSED',
  'REJECTED',
] as const;
const POSTING_TYPES = ['EMPLOYMENT', 'SERVICE_REQUEST', 'GIG_TASK'] as const;
const COMPENSATION_TYPES = [
  'HOURLY',
  'SALARY',
  'FIXED',
  'NEGOTIABLE',
  'VOLUNTEER',
  'UNSPECIFIED',
] as const;
const PUBLIC_STATUSES = ['PUBLISHED', 'FILLED', 'CLOSED'] as const;

const UpdateHelpWantedSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    postingType: z.enum(POSTING_TYPES).optional(),
    compensationType: z.enum(COMPENSATION_TYPES).nullable().optional(),
    compensationText: z.string().trim().max(255).nullable().optional(),
    locationText: z.string().trim().max(255).nullable().optional(),
    scheduleText: z.string().trim().max(255).nullable().optional(),
    photoUrl: z.string().trim().max(2048).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    status: z.enum(UPDATE_STATUSES).optional(),
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

function canManagePost(
  permissionUser: PermissionUser,
  post: {
    authorUserId: string;
  }
) {
  return isAdmin(permissionUser) || post.authorUserId === permissionUser.id;
}

function canViewPost(
  request: NextRequest,
  post: {
    status: string;
    authorUserId: string;
  }
) {
  const permissionUser = buildPermissionUser(request);
  const isPublic = PUBLIC_STATUSES.includes(
    post.status as (typeof PUBLIC_STATUSES)[number]
  );

  if (isPublic) {
    return true;
  }

  if (!permissionUser) {
    return false;
  }

  return (
    canManagePost(permissionUser, post) ||
    canPerformAction(permissionUser, ACTIONS.REVIEW_HELP_WANTED)
  );
}

function canTransitionAuthorHelpWantedStatus(currentStatus: string, nextStatus: string) {
  const transitions: Record<string, string[]> = {
    DRAFT: ['DRAFT', 'PENDING_REVIEW'],
    PENDING_REVIEW: ['PENDING_REVIEW', 'DRAFT'],
    PUBLISHED: ['PUBLISHED', 'FILLED', 'CLOSED'],
    FILLED: ['FILLED', 'CLOSED', 'PUBLISHED'],
    CLOSED: ['CLOSED', 'PUBLISHED'],
    REJECTED: ['DRAFT', 'PENDING_REVIEW'],
  };

  return (transitions[currentStatus] || []).includes(nextStatus);
}

function getAllowedAuthorStatusTransitions(currentStatus: string) {
  const transitions: Record<string, string[]> = {
    DRAFT: ['DRAFT', 'PENDING_REVIEW'],
    PENDING_REVIEW: ['PENDING_REVIEW', 'DRAFT'],
    PUBLISHED: ['PUBLISHED', 'FILLED', 'CLOSED'],
    FILLED: ['FILLED', 'CLOSED', 'PUBLISHED'],
    CLOSED: ['CLOSED', 'PUBLISHED'],
    REJECTED: ['DRAFT', 'PENDING_REVIEW'],
  };

  return transitions[currentStatus] || [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await db.helpWantedPost.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Help Wanted post not found' },
        { status: 404 }
      );
    }

    if (!canViewPost(request, post)) {
      return NextResponse.json(
        { error: 'Help Wanted post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching Help Wanted post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Help Wanted post' },
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

    if (!canPerformAction(permissionUser, ACTIONS.EDIT_HELP_WANTED)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const post = await db.helpWantedPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorUserId: true,
        title: true,
        description: true,
        postingType: true,
        status: true,
        compensationType: true,
        compensationText: true,
        locationText: true,
        scheduleText: true,
        photoUrl: true,
        expiresAt: true,
        publishedAt: true,
        filledAt: true,
        closedAt: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Help Wanted post not found' },
        { status: 404 }
      );
    }

    if (!canManagePost(permissionUser, post)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateHelpWantedSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');
    const adminUser = isAdmin(permissionUser);

    if (
      validated.status !== undefined &&
      !adminUser &&
      !canTransitionAuthorHelpWantedStatus(post.status, validated.status)
    ) {
      return NextResponse.json(
        {
          error: `Posts can move from ${post.status} only to ${getAllowedAuthorStatusTransitions(post.status).join(', ') || 'no allowed states'}`,
        },
        { status: 400 }
      );
    }

    const nextStatus = validated.status ?? post.status;
    const nextPublishedAt =
      nextStatus === 'PUBLISHED'
        ? post.publishedAt ?? new Date()
        : adminUser && validated.status !== undefined && validated.status !== 'PUBLISHED'
          ? null
          : post.publishedAt;
    const nextFilledAt =
      nextStatus === 'FILLED'
        ? post.filledAt ?? new Date()
        : validated.status === 'PUBLISHED'
          ? null
          : post.filledAt;
    const nextClosedAt =
      nextStatus === 'CLOSED'
        ? post.closedAt ?? new Date()
        : validated.status === 'PUBLISHED'
          ? null
          : post.closedAt;

    const updated = await db.helpWantedPost.update({
      where: { id: params.id },
      data: {
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.description !== undefined
          ? { description: validated.description }
          : {}),
        ...(validated.postingType !== undefined
          ? { postingType: validated.postingType }
          : {}),
        ...(validated.compensationType !== undefined
          ? { compensationType: validated.compensationType }
          : {}),
        ...(validated.compensationText !== undefined
          ? { compensationText: validated.compensationText }
          : {}),
        ...(validated.locationText !== undefined
          ? { locationText: validated.locationText }
          : {}),
        ...(validated.scheduleText !== undefined
          ? { scheduleText: validated.scheduleText }
          : {}),
        ...(validated.photoUrl !== undefined ? { photoUrl: validated.photoUrl } : {}),
        ...(validated.expiresAt !== undefined
          ? { expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null }
          : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        publishedAt: nextPublishedAt,
        filledAt: nextFilledAt,
        closedAt: nextClosedAt,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'UPDATE',
      resourceType: 'HELP_WANTED_POST',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        before: {
          status: post.status,
          title: post.title,
        },
        after: {
          status: updated.status,
          title: updated.title,
        },
      },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating Help Wanted post:', error);
    return NextResponse.json(
      { error: 'Failed to update Help Wanted post' },
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

    if (!canPerformAction(permissionUser, ACTIONS.DELETE_HELP_WANTED)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const post = await db.helpWantedPost.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorUserId: true,
        title: true,
        status: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Help Wanted post not found' },
        { status: 404 }
      );
    }

    if (!canManagePost(permissionUser, post)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const ipAddress = request.headers.get('x-client-ip');

    await db.helpWantedPost.delete({
      where: { id: params.id },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'DELETE',
      resourceType: 'HELP_WANTED_POST',
      resourceId: post.id,
      ipAddress,
      metadata: {
        title: post.title,
        status: post.status,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Help Wanted post:', error);
    return NextResponse.json(
      { error: 'Failed to delete Help Wanted post' },
      { status: 500 }
    );
  }
}
