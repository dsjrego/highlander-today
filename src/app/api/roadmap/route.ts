import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, RoadmapIdeaStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';
import {
  ROADMAP_PUBLIC_STATUSES,
  ROADMAP_STATUS_LABELS,
} from '@/lib/roadmap-ideas';
import { buildRoadmapLeaderboard } from '@/lib/roadmap-ranking';
import {
  ROADMAP_WEIGHT_CONSTRAINTS,
  ROADMAP_WEIGHT_DOMAIN,
} from '@/lib/roadmap-weighting';

const LISTABLE_STATUSES: RoadmapIdeaStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED_FOR_RANKING',
  'DECLINED',
  'MERGED',
  'PLANNED',
  'IN_PROGRESS',
  'SHIPPED',
];

const CreateRoadmapIdeaSchema = z.object({
  title: z.string().trim().min(5).max(140),
  summary: z.string().trim().min(20).max(500),
  description: z.string().trim().min(40).max(5000),
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
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const mineOnly = searchParams.get('mine') === '1';
    const reviewQueueOnly = searchParams.get('reviewQueue') === '1';
    const statusParam = searchParams.get('status')?.trim().toUpperCase();
    const communityId = await resolveCommunityId(request);

    if (mineOnly && !permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      reviewQueueOnly &&
      (!permissionUser ||
        !canPerformAction(permissionUser, ACTIONS.REVIEW_ROADMAP_IDEA))
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (!communityId) {
      return NextResponse.json({
        ideas: [],
        counts: {},
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const resolvedStatus =
      statusParam && LISTABLE_STATUSES.includes(statusParam as RoadmapIdeaStatus)
        ? (statusParam as RoadmapIdeaStatus)
        : null;

    const where: Prisma.RoadmapIdeaWhereInput = {
      communityId,
      ...(reviewQueueOnly
        ? { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DECLINED'] } }
        : mineOnly
        ? { authorUserId: permissionUser!.id }
        : { status: { in: ROADMAP_PUBLIC_STATUSES } }),
      ...(resolvedStatus
        ? mineOnly ||
          reviewQueueOnly ||
          ROADMAP_PUBLIC_STATUSES.includes(resolvedStatus)
          ? { status: resolvedStatus }
          : {}
        : {}),
    };

    const includeRankingData = !mineOnly && !reviewQueueOnly;

    const [ideasRaw, total, groupedCounts, rankingItems, viewerBallot] = await Promise.all([
      db.roadmapIdea.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
        orderBy: mineOnly
          ? [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
          : [{ shippedAt: 'desc' }, { plannedAt: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      db.roadmapIdea.count({ where }),
      db.roadmapIdea.groupBy({
        by: ['status'],
        where: {
          communityId,
          ...(reviewQueueOnly
            ? { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DECLINED'] } }
            : mineOnly
              ? { authorUserId: permissionUser!.id }
              : { status: { in: ROADMAP_PUBLIC_STATUSES } }),
        },
        _count: {
          _all: true,
        },
      }),
      includeRankingData
        ? db.roadmapRankingItem.findMany({
            where: {
              ballot: {
                communityId,
              },
              idea: {
                communityId,
                status: 'APPROVED_FOR_RANKING',
              },
            },
            select: {
              ideaId: true,
              rank: true,
              ballot: {
                select: {
                  userId: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      includeRankingData &&
      permissionUser &&
      canPerformAction(permissionUser, ACTIONS.RANK_ROADMAP_IDEA)
        ? db.roadmapRankingBallot.findUnique({
            where: {
              communityId_userId: {
                communityId,
                userId: permissionUser.id,
              },
            },
            include: {
              items: {
                orderBy: {
                  rank: 'asc',
                },
                select: {
                  ideaId: true,
                  rank: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const counts = groupedCounts.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});
    const weightEntries =
      includeRankingData && rankingItems.length > 0
        ? await db.domainInfluenceWeight.findMany({
            where: {
              communityId,
              domain: ROADMAP_WEIGHT_DOMAIN,
              userId: {
                in: Array.from(
                  new Set(rankingItems.map((item) => item.ballot.userId))
                ),
              },
            },
            select: {
              userId: true,
              multiplierPercent: true,
            },
          })
        : [];
    const weightsByUserId = new Map(
      weightEntries.map((entry: { userId: string; multiplierPercent: number }) => [
        entry.userId,
        entry.multiplierPercent,
      ])
    );
    const weightedUserIds = new Set(
      weightEntries
        .filter((entry) => entry.multiplierPercent !== 100)
        .map((entry) => entry.userId)
    );
    const leaderboard = buildRoadmapLeaderboard(
      rankingItems.map((item) => ({
        ideaId: item.ideaId,
        rank: item.rank,
        multiplierPercent: weightsByUserId.get(item.ballot.userId) ?? 100,
      }))
    );
    const leaderboardByIdeaId = new Map(
      leaderboard.map((entry) => [entry.ideaId, entry])
    );
    const ideas = ideasRaw.map((idea) => ({
      ...idea,
      leaderboard:
        idea.status === 'APPROVED_FOR_RANKING'
          ? leaderboardByIdeaId.get(idea.id) ?? null
          : null,
    }));

    return NextResponse.json({
      ideas,
      counts,
      leaderboard,
      viewerBallot: viewerBallot?.items.map((item) => item.ideaId) ?? [],
      transparency: {
        weightedVoterCount: weightedUserIds.size,
        totalBallotCount: new Set(rankingItems.map((item) => item.ballot.userId)).size,
        multiplierRange: {
          min: ROADMAP_WEIGHT_CONSTRAINTS.minMultiplierPercent,
          max: ROADMAP_WEIGHT_CONSTRAINTS.maxMultiplierPercent,
        },
      },
      statusLabels: ROADMAP_STATUS_LABELS,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching roadmap ideas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap ideas' },
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

    if (!canPerformAction(permissionUser, ACTIONS.CREATE_ROADMAP_IDEA)) {
      return NextResponse.json(
        { error: 'Only trusted users can submit roadmap ideas' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateRoadmapIdeaSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');

    const idea = await db.roadmapIdea.create({
      data: {
        communityId,
        authorUserId: permissionUser.id,
        title: validated.title,
        summary: validated.summary,
        description: validated.description,
        status: 'SUBMITTED',
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
      },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'CREATE',
      resourceType: 'ROADMAP_IDEA',
      resourceId: idea.id,
      ipAddress,
      metadata: {
        title: idea.title,
        status: idea.status,
      },
    }).catch(() => {});

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating roadmap idea:', error);
    return NextResponse.json(
      { error: 'Failed to create roadmap idea' },
      { status: 500 }
    );
  }
}
