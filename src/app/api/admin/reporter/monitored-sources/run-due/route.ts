import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { runDueReporterMonitoredSources } from '@/lib/reporter/monitored-source-scheduler';

const runDueSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  communityId: z.string().uuid().optional(),
  communitySlug: z.string().trim().min(1).max(120).optional(),
});

const runDueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  communityId: z.string().uuid().optional(),
  communitySlug: z.string().trim().min(1).max(120).optional(),
});

const monitoredSourceSelect = {
  id: true,
  communityId: true,
  label: true,
  sourceType: true,
  sourceFormat: true,
  url: true,
  publisher: true,
  notes: true,
  status: true,
  fetchFrequencyMinutes: true,
  lastFetchedAt: true,
  lastSuccessfulAt: true,
  lastChangedAt: true,
  lastErrorAt: true,
  lastErrorMessage: true,
  lastHttpStatus: true,
  createdAt: true,
  updatedAt: true,
  place: {
    select: {
      id: true,
      displayName: true,
      slug: true,
      type: true,
    },
  },
  _count: {
    select: {
      fetches: true,
      ingestionItems: true,
    },
  },
  fetches: {
    orderBy: [{ startedAt: 'desc' as const }],
    take: 3,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      httpStatus: true,
      itemCount: true,
      newItemCount: true,
      changedItemCount: true,
      errorMessage: true,
    },
  },
  ingestionItems: {
    orderBy: [{ publishedAt: 'desc' as const }, { lastSeenAt: 'desc' as const }],
    take: 8,
    select: {
      id: true,
      title: true,
      canonicalUrl: true,
      publishedAt: true,
      firstSeenAt: true,
      lastSeenAt: true,
      publisher: true,
      excerpt: true,
    },
  },
};

function getSchedulerSecrets() {
  return [process.env.REPORTER_SCHEDULER_TOKEN?.trim(), process.env.CRON_SECRET?.trim()].filter(
    (value): value is string => Boolean(value)
  );
}

async function resolveRequestedCommunity(
  request: NextRequest,
  payload: z.infer<typeof runDueSchema>
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || '';
  const schedulerSecrets = getSchedulerSecrets();
  const authorization = request.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (userId && canEditReporterRun(userRole)) {
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community) {
      throw new Error('Community context not found.');
    }
    return {
      community,
      actorUserId: userId,
    };
  }

  if (schedulerSecrets.length > 0 && bearerToken && schedulerSecrets.includes(bearerToken)) {
    if (!payload.communityId && !payload.communitySlug) {
      throw new Error('Scheduler-triggered runs require a communityId or communitySlug.');
    }

    const community = await db.community.findFirst({
      where: payload.communityId
        ? { id: payload.communityId }
        : { slug: payload.communitySlug },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!community) {
      throw new Error('Requested community not found.');
    }

    return {
      community,
      actorUserId: null,
    };
  }

  throw new Error('Insufficient permissions');
}

export async function handleRunDueRequest(
  request: NextRequest,
  payload: z.infer<typeof runDueSchema>
) {
  const ipAddress = request.headers.get('x-client-ip');
  const { community, actorUserId } = await resolveRequestedCommunity(request, payload);

  const result = await runDueReporterMonitoredSources({
    communityId: community.id,
    limit: payload.limit,
  });

  const refreshedSources = result.results.length
    ? await db.reporterMonitoredSource.findMany({
        where: {
          id: {
            in: result.results.map((entry) => entry.monitoredSourceId),
          },
        },
        orderBy: [{ label: 'asc' }],
        select: monitoredSourceSelect,
      })
    : [];

  if (actorUserId) {
    await logActivity({
      userId: actorUserId,
      action: 'UPDATE',
      resourceType: 'REPORTER_MONITORED_SOURCE',
      resourceId: community.id,
      ipAddress,
      metadata: {
        jobType: 'run_due_monitored_sources',
        communityId: community.id,
        attemptedCount: result.attemptedCount,
        ...result.summary,
      },
    });
  }

  return NextResponse.json({
    community,
    attemptedCount: result.attemptedCount,
    summary: result.summary,
    results: result.results,
    sources: refreshedSources,
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const payload = runDueQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      communityId: searchParams.get('communityId') ?? undefined,
      communitySlug: searchParams.get('communitySlug') ?? undefined,
    });

    return await handleRunDueRequest(request, payload);
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

    console.error('Error running due monitored sources:', error);
    return NextResponse.json(
      { error: 'Failed to run due monitored sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = runDueSchema.parse(body);

    return await handleRunDueRequest(request, payload);
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

    console.error('Error running due monitored sources:', error);
    return NextResponse.json(
      { error: 'Failed to run due monitored sources' },
      { status: 500 }
    );
  }
}
