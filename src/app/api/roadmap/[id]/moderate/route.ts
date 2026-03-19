import { NextRequest, NextResponse } from 'next/server';
import type { RoadmapIdeaStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';

const MODERATION_STATUSES = [
  'UNDER_REVIEW',
  'APPROVED_FOR_RANKING',
  'DECLINED',
  'MERGED',
  'PLANNED',
  'IN_PROGRESS',
  'SHIPPED',
] as const;

const ModerateRoadmapIdeaSchema = z.object({
  status: z.enum(MODERATION_STATUSES),
  staffNotes: z.string().trim().max(2000).nullable().optional(),
  mergedIntoIdeaId: z.string().uuid().nullable().optional(),
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

function buildModerationUpdate(
  currentStatus: RoadmapIdeaStatus,
  nextStatus: (typeof MODERATION_STATUSES)[number]
) {
  const now = new Date();

  return {
    status: nextStatus,
    publishedAt:
      nextStatus === 'APPROVED_FOR_RANKING' ||
      nextStatus === 'PLANNED' ||
      nextStatus === 'IN_PROGRESS' ||
      nextStatus === 'SHIPPED'
        ? now
        : currentStatus === 'APPROVED_FOR_RANKING' ||
            currentStatus === 'PLANNED' ||
            currentStatus === 'IN_PROGRESS' ||
            currentStatus === 'SHIPPED'
          ? undefined
          : null,
    plannedAt:
      nextStatus === 'PLANNED' || nextStatus === 'IN_PROGRESS' || nextStatus === 'SHIPPED'
        ? now
        : undefined,
    startedAt:
      nextStatus === 'IN_PROGRESS' || nextStatus === 'SHIPPED' ? now : undefined,
    shippedAt: nextStatus === 'SHIPPED' ? now : undefined,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.REVIEW_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const validated = ModerateRoadmapIdeaSchema.parse(await request.json());

    if (validated.status === 'MERGED' && !validated.mergedIntoIdeaId) {
      return NextResponse.json(
        { error: 'A merge target is required when merging an idea' },
        { status: 400 }
      );
    }

    const idea = await db.roadmapIdea.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        communityId: true,
        title: true,
        status: true,
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Roadmap idea not found' }, { status: 404 });
    }

    let mergeTarget:
      | {
          id: string;
          title: string;
        }
      | null = null;

    if (validated.status === 'MERGED' && validated.mergedIntoIdeaId) {
      if (validated.mergedIntoIdeaId === idea.id) {
        return NextResponse.json(
          { error: 'An idea cannot be merged into itself' },
          { status: 400 }
        );
      }

      mergeTarget = await db.roadmapIdea.findFirst({
        where: {
          id: validated.mergedIntoIdeaId,
          communityId: idea.communityId,
        },
        select: {
          id: true,
          title: true,
        },
      });

      if (!mergeTarget) {
        return NextResponse.json(
          { error: 'Merge target not found in this community' },
          { status: 404 }
        );
      }
    }

    const nextTimestamps = buildModerationUpdate(idea.status, validated.status);

    const updated = await db.roadmapIdea.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        staffNotes: validated.staffNotes ?? null,
        mergedIntoIdeaId: validated.status === 'MERGED' ? validated.mergedIntoIdeaId ?? null : null,
        publishedAt:
          validated.status === 'APPROVED_FOR_RANKING'
            ? nextTimestamps.publishedAt ?? new Date()
            : validated.status === 'DECLINED' || validated.status === 'MERGED'
              ? null
              : nextTimestamps.publishedAt,
        plannedAt:
          validated.status === 'DECLINED' || validated.status === 'MERGED'
            ? null
            : nextTimestamps.plannedAt,
        startedAt:
          validated.status === 'DECLINED' || validated.status === 'MERGED'
            ? null
            : nextTimestamps.startedAt,
        shippedAt:
          validated.status === 'SHIPPED'
            ? nextTimestamps.shippedAt ?? new Date()
            : validated.status === 'DECLINED' || validated.status === 'MERGED'
              ? null
              : undefined,
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
      action:
        validated.status === 'DECLINED'
          ? 'REJECT'
          : validated.status === 'APPROVED_FOR_RANKING'
            ? 'APPROVE'
            : 'UPDATE',
      resourceType: 'ROADMAP_IDEA',
      resourceId: updated.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        title: updated.title,
        previousStatus: idea.status,
        status: updated.status,
        staffNotes: validated.staffNotes,
        mergedIntoIdeaId: mergeTarget?.id ?? null,
        mergedIntoIdeaTitle: mergeTarget?.title ?? null,
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

    console.error('Error moderating roadmap idea:', error);
    return NextResponse.json(
      { error: 'Failed to moderate roadmap idea' },
      { status: 500 }
    );
  }
}
