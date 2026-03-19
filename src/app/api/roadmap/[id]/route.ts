import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import {
  ACTIONS,
  canPerformAction,
  isAdmin,
  type PermissionUser,
} from '@/lib/permissions';
import {
  isRoadmapIdeaAuthorDeleteable,
  isRoadmapIdeaAuthorEditable,
  isRoadmapIdeaPublic,
} from '@/lib/roadmap-ideas';

const UpdateRoadmapIdeaSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    summary: z.string().trim().min(20).max(500).optional(),
    description: z.string().trim().min(40).max(5000).optional(),
    resubmit: z.boolean().optional(),
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

function canManageIdea(
  permissionUser: PermissionUser,
  idea: { authorUserId: string }
) {
  return isAdmin(permissionUser) || idea.authorUserId === permissionUser.id;
}

function canViewIdea(
  request: NextRequest,
  idea: { status: Parameters<typeof isRoadmapIdeaPublic>[0]; authorUserId: string }
) {
  const permissionUser = buildPermissionUser(request);

  if (isRoadmapIdeaPublic(idea.status)) {
    return true;
  }

  if (!permissionUser) {
    return false;
  }

  return (
    canManageIdea(permissionUser, idea) ||
    canPerformAction(permissionUser, ACTIONS.REVIEW_ROADMAP_IDEA)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idea = await db.roadmapIdea.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustLevel: true,
          },
        },
        mergedInto: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: {
            ballotItems: true,
          },
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Roadmap idea not found' }, { status: 404 });
    }

    if (!canViewIdea(request, idea)) {
      return NextResponse.json({ error: 'Roadmap idea not found' }, { status: 404 });
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('Error fetching roadmap idea:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap idea' },
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

    if (!canPerformAction(permissionUser, ACTIONS.EDIT_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const idea = await db.roadmapIdea.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorUserId: true,
        title: true,
        summary: true,
        description: true,
        status: true,
        staffNotes: true,
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Roadmap idea not found' }, { status: 404 });
    }

    if (!canManageIdea(permissionUser, idea)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const validated = UpdateRoadmapIdeaSchema.parse(await request.json());
    const adminUser = isAdmin(permissionUser);

    if (!adminUser && !isRoadmapIdeaAuthorEditable(idea.status)) {
      return NextResponse.json(
        {
          error: `Ideas in ${idea.status} can no longer be edited by the submitter`,
        },
        { status: 400 }
      );
    }

    const shouldResubmit = Boolean(validated.resubmit && idea.status === 'DECLINED');
    const updated = await db.roadmapIdea.update({
      where: { id: params.id },
      data: {
        ...(validated.title !== undefined ? { title: validated.title } : {}),
        ...(validated.summary !== undefined ? { summary: validated.summary } : {}),
        ...(validated.description !== undefined
          ? { description: validated.description }
          : {}),
        ...(shouldResubmit
          ? {
              status: 'SUBMITTED',
              staffNotes: null,
              mergedIntoIdeaId: null,
            }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustLevel: true,
          },
        },
        mergedInto: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'UPDATE',
      resourceType: 'ROADMAP_IDEA',
      resourceId: updated.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        title: updated.title,
        previousStatus: idea.status,
        status: updated.status,
        resubmitted: shouldResubmit,
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

    console.error('Error updating roadmap idea:', error);
    return NextResponse.json(
      { error: 'Failed to update roadmap idea' },
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

    if (!canPerformAction(permissionUser, ACTIONS.DELETE_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const idea = await db.roadmapIdea.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorUserId: true,
        title: true,
        summary: true,
        status: true,
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Roadmap idea not found' }, { status: 404 });
    }

    if (!canManageIdea(permissionUser, idea)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (!isAdmin(permissionUser) && !isRoadmapIdeaAuthorDeleteable(idea.status)) {
      return NextResponse.json(
        {
          error: `Ideas in ${idea.status} can no longer be deleted by the submitter`,
        },
        { status: 400 }
      );
    }

    await db.roadmapIdea.delete({
      where: { id: params.id },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'DELETE',
      resourceType: 'ROADMAP_IDEA',
      resourceId: idea.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        title: idea.title,
        summary: idea.summary,
        status: idea.status,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting roadmap idea:', error);
    return NextResponse.json(
      { error: 'Failed to delete roadmap idea' },
      { status: 500 }
    );
  }
}
