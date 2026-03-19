import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';
import { MAX_ROADMAP_BALLOT_SIZE } from '@/lib/roadmap-ranking';

const SaveBallotSchema = z.object({
  ideaIds: z
    .array(z.string().uuid())
    .max(
      MAX_ROADMAP_BALLOT_SIZE,
      `You can rank up to ${MAX_ROADMAP_BALLOT_SIZE} ideas`
    ),
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
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.RANK_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Only trusted users can rank roadmap ideas' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ ideaIds: [] });
    }

    const ballot = await db.roadmapRankingBallot.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: permissionUser.id,
        },
      },
      include: {
        items: {
          orderBy: { rank: 'asc' },
          select: {
            ideaId: true,
            rank: true,
          },
        },
      },
    });

    return NextResponse.json({
      ideaIds: ballot?.items.map((item) => item.ideaId) ?? [],
    });
  } catch (error) {
    console.error('Error fetching roadmap ballot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap ballot' },
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

    if (!canPerformAction(permissionUser, ACTIONS.RANK_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Only trusted users can rank roadmap ideas' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const validated = SaveBallotSchema.parse(await request.json());
    const uniqueIdeaIds = Array.from(new Set(validated.ideaIds));

    if (uniqueIdeaIds.length !== validated.ideaIds.length) {
      return NextResponse.json(
        { error: 'A ballot cannot include the same idea more than once' },
        { status: 400 }
      );
    }

    const eligibleIdeas =
      uniqueIdeaIds.length > 0
        ? await db.roadmapIdea.findMany({
            where: {
              id: { in: uniqueIdeaIds },
              communityId,
              status: 'APPROVED_FOR_RANKING',
            },
            select: {
              id: true,
              title: true,
            },
          })
        : [];

    if (eligibleIdeas.length !== uniqueIdeaIds.length) {
      return NextResponse.json(
        {
          error:
            'Ballots may only include ideas that are currently approved for ranking in this community',
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-client-ip');
    const existingBallot = await db.roadmapRankingBallot.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: permissionUser.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (uniqueIdeaIds.length === 0) {
      if (existingBallot) {
        await db.roadmapRankingBallot.delete({
          where: { id: existingBallot.id },
        });
      }

      logActivity({
        userId: permissionUser.id,
        action: 'DELETE',
        resourceType: 'ROADMAP_RANKING_BALLOT',
        resourceId: existingBallot?.id ?? permissionUser.id,
        ipAddress,
        metadata: {
          cleared: true,
        },
      }).catch(() => {});

      return NextResponse.json({ ideaIds: [] });
    }

    const ballot = await db.$transaction(async (tx) => {
      const upsertedBallot = await tx.roadmapRankingBallot.upsert({
        where: {
          communityId_userId: {
            communityId,
            userId: permissionUser.id,
          },
        },
        create: {
          communityId,
          userId: permissionUser.id,
        },
        update: {},
        select: {
          id: true,
        },
      });

      await tx.roadmapRankingItem.deleteMany({
        where: {
          ballotId: upsertedBallot.id,
        },
      });

      await tx.roadmapRankingItem.createMany({
        data: uniqueIdeaIds.map((ideaId, index) => ({
          ballotId: upsertedBallot.id,
          ideaId,
          rank: index + 1,
        })),
      });

      return upsertedBallot;
    });

    logActivity({
      userId: permissionUser.id,
      action: existingBallot ? 'UPDATE' : 'CREATE',
      resourceType: 'ROADMAP_RANKING_BALLOT',
      resourceId: ballot.id,
      ipAddress,
      metadata: {
        ideaIds: uniqueIdeaIds,
      },
    }).catch(() => {});

    return NextResponse.json({ ideaIds: uniqueIdeaIds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving roadmap ballot:', error);
    return NextResponse.json(
      { error: 'Failed to save roadmap ballot' },
      { status: 500 }
    );
  }
}
