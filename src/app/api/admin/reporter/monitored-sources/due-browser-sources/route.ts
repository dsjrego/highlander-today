import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { isReporterMonitoredSourceDue } from '@/lib/reporter/monitored-sources';
import { canViewReporterRun } from '@/lib/reporter/permissions';

const dueBrowserSourcesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  communityId: z.string().uuid().optional(),
  communitySlug: z.string().trim().min(1).max(120).optional(),
});

function getSchedulerSecrets() {
  return [process.env.REPORTER_SCHEDULER_TOKEN?.trim(), process.env.CRON_SECRET?.trim()].filter(
    (value): value is string => Boolean(value)
  );
}

async function resolveCommunityScope(
  request: NextRequest,
  payload: z.infer<typeof dueBrowserSourcesQuerySchema>
) {
  const userRole = request.headers.get('x-user-role') || '';
  const schedulerSecrets = getSchedulerSecrets();
  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (request.headers.get('x-user-id') && canViewReporterRun(userRole)) {
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community) {
      throw new Error('Community context not found.');
    }

    return {
      mode: 'community' as const,
      communityFilter: { communityId: community.id },
    };
  }

  if (schedulerSecrets.length > 0 && bearerToken && schedulerSecrets.includes(bearerToken)) {
    if (payload.communityId) {
      return {
        mode: 'community' as const,
        communityFilter: { communityId: payload.communityId },
      };
    }

    if (payload.communitySlug) {
      const community = await db.community.findFirst({
        where: { slug: payload.communitySlug },
        select: { id: true },
      });

      if (!community) {
        throw new Error('Requested community not found.');
      }

      return {
        mode: 'community' as const,
        communityFilter: { communityId: community.id },
      };
    }

    return {
      mode: 'global' as const,
      communityFilter: {},
    };
  }

  throw new Error('Insufficient permissions');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const payload = dueBrowserSourcesQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      communityId: searchParams.get('communityId') ?? undefined,
      communitySlug: searchParams.get('communitySlug') ?? undefined,
    });

    const scope = await resolveCommunityScope(request, payload);
    const limit = payload.limit ?? 10;
    const now = new Date();

    const sources = await db.reporterMonitoredSource.findMany({
      where: {
        ...scope.communityFilter,
        status: 'ACTIVE',
        executionLane: 'LOCAL_BROWSER',
      },
      orderBy: [{ lastFetchedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        communityId: true,
        label: true,
        sourceType: true,
        sourceFormat: true,
        executionLane: true,
        coverageScope: true,
        url: true,
        publisher: true,
        notes: true,
        status: true,
        fetchFrequencyMinutes: true,
        lastFetchedAt: true,
        lastSuccessfulAt: true,
        lastErrorAt: true,
        place: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            type: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const dueSources = sources
      .filter((source) => isReporterMonitoredSourceDue(source, now))
      .slice(0, limit);

    return NextResponse.json({
      mode: scope.mode,
      dueCount: dueSources.length,
      sources: dueSources,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = error.message === 'Insufficient permissions' ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Error listing due browser sources:', error);
    return NextResponse.json(
      { error: 'Failed to list due browser sources' },
      { status: 500 }
    );
  }
}
