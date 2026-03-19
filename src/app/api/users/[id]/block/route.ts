import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserBlockStatus } from '@/lib/blocks';
import { logUserBlockAction } from '@/lib/activity-log';

function getUserId(request: NextRequest) {
  return request.headers.get('x-user-id');
}

async function getTargetRole(userId: string) {
  const membership = await db.userCommunityMembership.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: { role: true },
  });

  return membership?.role ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorUserId = getUserId(request);
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUser = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetRole = await getTargetRole(params.id);
    const canBlock =
      actorUserId !== params.id &&
      !['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(targetRole ?? '');
    const status = await getUserBlockStatus(actorUserId, params.id);

    return NextResponse.json({
      blockedByYou: status.blockedByViewer,
      hasBlockedYou: status.blockedViewer,
      canMessage: !status.blockedByViewer && !status.blockedViewer,
      canBlock,
    });
  } catch (error) {
    console.error('Error fetching block status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorUserId = getUserId(request);
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (actorUserId === params.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetRole = await getTargetRole(params.id);
    if (targetRole === 'EDITOR' || targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot block staff members' },
        { status: 403 }
      );
    }

    const existing = await db.userBlock.findUnique({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: actorUserId,
          blockedUserId: params.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already blocked this user' },
        { status: 400 }
      );
    }

    const block = await db.userBlock.create({
      data: {
        blockerUserId: actorUserId,
        blockedUserId: params.id,
      },
    });

    await logUserBlockAction(
      actorUserId,
      params.id,
      'block',
      request.headers.get('x-client-ip')
    );

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Failed to block user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorUserId = getUserId(request);
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await db.userBlock.findUnique({
      where: {
        blockerUserId_blockedUserId: {
          blockerUserId: actorUserId,
          blockedUserId: params.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    await db.userBlock.delete({
      where: { id: existing.id },
    });

    await logUserBlockAction(
      actorUserId,
      params.id,
      'unblock',
      request.headers.get('x-client-ip')
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
