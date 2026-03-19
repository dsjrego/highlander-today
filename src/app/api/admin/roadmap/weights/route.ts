import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { isAdmin, type PermissionUser } from '@/lib/permissions';
import {
  matchesRoadmapWeightActivityForCommunity,
  ROADMAP_WEIGHT_CONSTRAINTS,
  ROADMAP_WEIGHT_DOMAIN,
  UpdateRoadmapWeightSchema,
} from '@/lib/roadmap-weighting';

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
    if (!permissionUser || !isAdmin(permissionUser)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ users: [] });
    }

    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    const users = await db.user.findMany({
      where: {
        trustLevel: 'TRUSTED',
        memberships: {
          some: {
            communityId,
          },
        },
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        memberships: {
          where: {
            communityId,
          },
          select: {
            role: true,
          },
          take: 1,
        },
        roadmapRankingBallots: {
          where: {
            communityId,
          },
          select: {
            id: true,
            updatedAt: true,
            items: {
              select: {
                ideaId: true,
              },
            },
          },
          take: 1,
        },
        domainInfluenceWeights: {
          where: {
            communityId,
            domain: ROADMAP_WEIGHT_DOMAIN,
          },
          select: {
            id: true,
            multiplierPercent: true,
            rationale: true,
            updatedAt: true,
          },
          take: 1,
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 100,
    });

    const recentChanges = await db.activityLog.findMany({
      where: {
        resourceType: 'DOMAIN_INFLUENCE_WEIGHT',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    const filteredRecentChanges = recentChanges
      .filter((entry) =>
        matchesRoadmapWeightActivityForCommunity(entry.metadata, communityId)
      )
      .slice(0, 20);

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.memberships[0]?.role ?? 'READER',
        ballotCount: user.roadmapRankingBallots[0]?.items.length ?? 0,
        ballotUpdatedAt: user.roadmapRankingBallots[0]?.updatedAt ?? null,
        multiplierPercent: user.domainInfluenceWeights[0]?.multiplierPercent ?? 100,
        rationale: user.domainInfluenceWeights[0]?.rationale ?? null,
        weightUpdatedAt: user.domainInfluenceWeights[0]?.updatedAt ?? null,
      })),
      recentChanges: filteredRecentChanges.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        actor: {
          id: entry.user.id,
          firstName: entry.user.firstName,
          lastName: entry.user.lastName,
          email: entry.user.email,
        },
        metadata: entry.metadata,
      })),
      constraints: ROADMAP_WEIGHT_CONSTRAINTS,
    });
  } catch (error) {
    console.error('Error fetching roadmap influence weights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmap influence weights' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const permissionUser = buildPermissionUser(request);
    if (!permissionUser || !isAdmin(permissionUser)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const validated = UpdateRoadmapWeightSchema.parse(await request.json());
    const targetUser = await db.user.findUnique({
      where: {
        id: validated.userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        trustLevel: true,
        memberships: {
          where: {
            communityId,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
    });

    if (!targetUser || !targetUser.memberships[0]) {
      return NextResponse.json(
        { error: 'User not found in this community' },
        { status: 404 }
      );
    }

    if (targetUser.trustLevel !== 'TRUSTED') {
      return NextResponse.json(
        { error: 'Only trusted users can receive roadmap influence weights' },
        { status: 400 }
      );
    }

    const existing = await db.domainInfluenceWeight.findUnique({
      where: {
        communityId_userId_domain: {
          communityId,
          userId: validated.userId,
          domain: ROADMAP_WEIGHT_DOMAIN,
        },
      },
      select: {
        id: true,
        multiplierPercent: true,
        rationale: true,
      },
    });

    let result: {
      id: string;
      multiplierPercent: number;
      rationale: string | null;
    } | null = null;

    if (validated.multiplierPercent === 100 && !validated.rationale) {
      if (existing) {
        await db.domainInfluenceWeight.delete({
          where: {
            id: existing.id,
          },
        });
      }
    } else {
      result = await db.domainInfluenceWeight.upsert({
        where: {
          communityId_userId_domain: {
            communityId,
            userId: validated.userId,
            domain: ROADMAP_WEIGHT_DOMAIN,
          },
        },
        create: {
          communityId,
          userId: validated.userId,
          domain: ROADMAP_WEIGHT_DOMAIN,
          multiplierPercent: validated.multiplierPercent,
          rationale: validated.rationale ?? null,
        },
        update: {
          multiplierPercent: validated.multiplierPercent,
          rationale: validated.rationale ?? null,
        },
        select: {
          id: true,
          multiplierPercent: true,
          rationale: true,
        },
      });
    }

    logActivity({
      userId: permissionUser.id,
      action: existing ? 'UPDATE' : result ? 'CREATE' : 'DELETE',
      resourceType: 'DOMAIN_INFLUENCE_WEIGHT',
      resourceId: existing?.id ?? result?.id ?? validated.userId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        domain: ROADMAP_WEIGHT_DOMAIN,
        communityId,
        targetUserId: validated.userId,
        targetUserName: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
        previousMultiplierPercent: existing?.multiplierPercent ?? 100,
        multiplierPercent: result?.multiplierPercent ?? 100,
        rationale: validated.rationale ?? null,
      },
    }).catch(() => {});

    return NextResponse.json({
      userId: validated.userId,
      multiplierPercent: result?.multiplierPercent ?? 100,
      rationale: result?.rationale ?? null,
      deleted: !result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating roadmap influence weight:', error);
    return NextResponse.json(
      { error: 'Failed to update roadmap influence weight' },
      { status: 500 }
    );
  }
}
