import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { executeReporterMonitoredSourceFetch } from '@/lib/reporter/public-source-fetcher';

const monitoredSourceSelect = {
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId || !canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const existing = await db.reporterMonitoredSource.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true, label: true, executionLane: true },
    });

    if (!existing || existing.communityId !== currentCommunity.id) {
      return NextResponse.json({ error: 'Monitored source not found' }, { status: 404 });
    }

    if (existing.executionLane === 'LOCAL_BROWSER') {
      return NextResponse.json(
        {
          error:
            'This source is configured for the local browser worker. Run it through the browser-worker automation instead of server fetch.',
        },
        { status: 400 }
      );
    }

    const result = await executeReporterMonitoredSourceFetch(params.id);

    const source = await db.reporterMonitoredSource.findUnique({
      where: { id: params.id },
      select: monitoredSourceSelect,
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'REPORTER_SOURCE_FETCH',
      resourceId: result.fetch.id,
      ipAddress,
      metadata: {
        monitoredSourceId: params.id,
        label: existing.label,
        status: result.fetch.status,
        itemCount: result.summary.itemCount,
        newItemCount: result.summary.newItemCount,
        changedItemCount: result.summary.changedItemCount,
      },
    });

    return NextResponse.json({
      fetch: result.fetch,
      summary: result.summary,
      source,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error running reporter monitored source fetch:', error);
    return NextResponse.json(
      { error: 'Failed to run reporter monitored source fetch' },
      { status: 500 }
    );
  }
}
