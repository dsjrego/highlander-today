import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const ApproveSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().trim().max(1000).optional(),
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.REVIEW_HELP_WANTED)) {
      return NextResponse.json(
        { error: 'Insufficient permissions — Editor or above required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = ApproveSchema.parse(body);

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

    if (post.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        {
          error: `Help Wanted post is not pending review (current status: ${post.status})`,
        },
        { status: 400 }
      );
    }

    const updated = await db.helpWantedPost.update({
      where: { id: params.id },
      data: {
        status: validated.approved ? 'PUBLISHED' : 'REJECTED',
        publishedAt: validated.approved ? post.publishedAt ?? new Date() : null,
        filledAt: null,
        closedAt: null,
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

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId: permissionUser.id,
      action: validated.approved ? 'APPROVE' : 'REJECT',
      resourceType: 'HELP_WANTED_POST',
      resourceId: post.id,
      ipAddress,
      metadata: {
        title: post.title,
        approved: validated.approved,
        rejectionReason: validated.rejectionReason,
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

    console.error('Error approving Help Wanted post:', error);
    return NextResponse.json(
      { error: 'Failed to approve Help Wanted post' },
      { status: 500 }
    );
  }
}
