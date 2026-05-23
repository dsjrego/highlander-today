import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const executeReporterMonitoredSourceFetchMock = jest.fn();
jest.mock('@/lib/reporter/public-source-fetcher', () => ({
  executeReporterMonitoredSourceFetch: (...args: unknown[]) =>
    executeReporterMonitoredSourceFetchMock(...(args as [])),
}));

const {
  listDueReporterMonitoredSources,
  runDueReporterMonitoredSources,
} = require('@/lib/reporter/monitored-source-scheduler') as typeof import('@/lib/reporter/monitored-source-scheduler');

describe('reporter monitored source scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters active sources down to those that are due', async () => {
    const now = new Date('2026-05-22T12:00:00Z');
    (prismaMock.reporterMonitoredSource.findMany as any).mockResolvedValue([
      {
        id: 'source-never',
        label: 'Never fetched',
        status: 'ACTIVE',
        fetchFrequencyMinutes: 60,
        lastFetchedAt: null,
      },
      {
        id: 'source-due',
        label: 'Due source',
        status: 'ACTIVE',
        fetchFrequencyMinutes: 60,
        lastFetchedAt: new Date('2026-05-22T09:00:00Z'),
      },
      {
        id: 'source-not-due',
        label: 'Fresh source',
        status: 'ACTIVE',
        fetchFrequencyMinutes: 180,
        lastFetchedAt: new Date('2026-05-22T11:00:00Z'),
      },
    ]);

    const due = await listDueReporterMonitoredSources({
      communityId: 'community-1',
      now,
      limit: 10,
    });

    expect(due.map((source: { id: string }) => source.id)).toEqual([
      'source-never',
      'source-due',
    ]);
  });

  it('runs each due source and summarizes results', async () => {
    (prismaMock.reporterMonitoredSource.findMany as any).mockResolvedValue([
      {
        id: 'source-1',
        label: 'Source 1',
        status: 'ACTIVE',
        fetchFrequencyMinutes: 60,
        lastFetchedAt: null,
      },
      {
        id: 'source-2',
        label: 'Source 2',
        status: 'ACTIVE',
        fetchFrequencyMinutes: 60,
        lastFetchedAt: null,
      },
    ]);
    (executeReporterMonitoredSourceFetchMock as any)
      .mockResolvedValueOnce({
        fetch: { id: 'fetch-1', status: 'SUCCESS' },
        summary: { itemCount: 2, newItemCount: 1, changedItemCount: 0 },
      })
      .mockResolvedValueOnce({
        fetch: { id: 'fetch-2', status: 'NO_CHANGE' },
        summary: { itemCount: 0, newItemCount: 0, changedItemCount: 0 },
      });

    const result = await runDueReporterMonitoredSources({
      communityId: 'community-1',
      limit: 10,
    });

    expect(executeReporterMonitoredSourceFetchMock).toHaveBeenCalledTimes(2);
    expect(result.attemptedCount).toBe(2);
    expect(result.summary).toEqual({
      successCount: 1,
      noChangeCount: 1,
      failedCount: 0,
    });
  });
});
