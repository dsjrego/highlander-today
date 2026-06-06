import { db } from '@/lib/db';
import { executeReporterMonitoredSourceFetch } from './public-source-fetcher';
import { isReporterMonitoredSourceDue } from './monitored-sources';

interface RunDueReporterMonitoredSourcesInput {
  communityId: string;
  limit?: number;
  now?: Date;
}

export async function listDueReporterMonitoredSources(params: RunDueReporterMonitoredSourcesInput) {
  const now = params.now || new Date();
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const activeSources = await db.reporterMonitoredSource.findMany({
    where: {
      communityId: params.communityId,
      status: 'ACTIVE',
      executionLane: 'SERVER_FETCH',
    },
    orderBy: [{ lastFetchedAt: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      status: true,
      fetchFrequencyMinutes: true,
      lastFetchedAt: true,
    },
  });

  return activeSources
    .filter((source) => isReporterMonitoredSourceDue(source, now))
    .slice(0, limit);
}

export async function runDueReporterMonitoredSources(params: RunDueReporterMonitoredSourcesInput) {
  const dueSources = await listDueReporterMonitoredSources(params);
  const results: Array<{
    monitoredSourceId: string;
    label: string;
    fetchStatus: string;
    itemCount: number;
    newItemCount: number;
    changedItemCount: number;
    fetchId: string;
  }> = [];

  for (const source of dueSources) {
    const result = await executeReporterMonitoredSourceFetch(source.id);
    results.push({
      monitoredSourceId: source.id,
      label: source.label,
      fetchStatus: result.fetch.status,
      itemCount: result.summary.itemCount,
      newItemCount: result.summary.newItemCount,
      changedItemCount: result.summary.changedItemCount,
      fetchId: result.fetch.id,
    });
  }

  return {
    attemptedCount: dueSources.length,
    results,
    summary: {
      successCount: results.filter((result) => result.fetchStatus === 'SUCCESS').length,
      noChangeCount: results.filter((result) => result.fetchStatus === 'NO_CHANGE').length,
      failedCount: results.filter((result) => result.fetchStatus === 'FAILED').length,
    },
  };
}
