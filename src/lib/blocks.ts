import { db } from '@/lib/db';

export interface UserBlockStatus {
  blockedByViewer: boolean;
  blockedViewer: boolean;
}

export function toUserBlockStatus(
  viewerId: string,
  targetUserId: string,
  blocks: Array<{ blockerUserId: string; blockedUserId: string }>
): UserBlockStatus {
  let blockedByViewer = false;
  let blockedViewer = false;

  for (const block of blocks) {
    if (
      block.blockerUserId === viewerId &&
      block.blockedUserId === targetUserId
    ) {
      blockedByViewer = true;
    }

    if (
      block.blockerUserId === targetUserId &&
      block.blockedUserId === viewerId
    ) {
      blockedViewer = true;
    }
  }

  return {
    blockedByViewer,
    blockedViewer,
  };
}

export async function getUserBlockStatus(
  viewerId: string,
  targetUserId: string
): Promise<UserBlockStatus> {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return {
      blockedByViewer: false,
      blockedViewer: false,
    };
  }

  const blocks = await db.userBlock.findMany({
    where: {
      OR: [
        {
          blockerUserId: viewerId,
          blockedUserId: targetUserId,
        },
        {
          blockerUserId: targetUserId,
          blockedUserId: viewerId,
        },
      ],
    },
    select: {
      blockerUserId: true,
      blockedUserId: true,
    },
  });

  return toUserBlockStatus(viewerId, targetUserId, blocks);
}

export async function areUsersBlocked(
  firstUserId: string,
  secondUserId: string
): Promise<boolean> {
  const status = await getUserBlockStatus(firstUserId, secondUserId);
  return status.blockedByViewer || status.blockedViewer;
}
