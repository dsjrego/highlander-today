import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const runReporterDailyCoverageOrchestratorMock = jest.fn();
jest.mock('@/lib/reporter/daily-coverage-orchestrator', () => ({
  runReporterDailyCoverageOrchestrator: (...args: unknown[]) =>
    runReporterDailyCoverageOrchestratorMock(...(args as [])),
}));

const route =
  require('@/app/api/admin/reporter/daily-coverage/run/[communitySlug]/route') as typeof import('@/app/api/admin/reporter/daily-coverage/run/[communitySlug]/route');

const originalCronSecret = process.env.CRON_SECRET;
const originalSchedulerToken = process.env.REPORTER_SCHEDULER_TOKEN;

describe('reporter daily coverage scheduler route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
    delete process.env.REPORTER_SCHEDULER_TOKEN;
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
    if (originalSchedulerToken === undefined) {
      delete process.env.REPORTER_SCHEDULER_TOKEN;
    } else {
      process.env.REPORTER_SCHEDULER_TOKEN = originalSchedulerToken;
    }
  });

  it('runs the full morning pipeline for an authenticated scheduler request', async () => {
    (prismaMock.community.findUnique as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
    (runReporterDailyCoverageOrchestratorMock as any).mockResolvedValue({
      completedAt: new Date('2026-09-25T10:15:00Z'),
      sourceFetch: { attemptedCount: 2 },
      candidateRefresh: { candidateCount: 3, morningDesk: [] },
      dailyDesk: { date: '2026-09-25', decision: { outcome: 'selected' } },
    });

    const response = await route.GET(
      new NextRequest(
        'http://localhost/api/admin/reporter/daily-coverage/run/highlander-today?date=2026-09-25',
        { headers: { authorization: 'Bearer cron-secret' } }
      ),
      { params: Promise.resolve({ communitySlug: 'highlander-today' }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      community: { id: 'community-1' },
      candidateRefresh: { candidateCount: 3 },
      dailyDesk: { decision: { outcome: 'selected' } },
    });
    expect(runReporterDailyCoverageOrchestratorMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      date: '2026-09-25',
      sourceFetchLimit: undefined,
      candidateLimit: undefined,
    });
  });

  it('rejects a request without a valid scheduler bearer token', async () => {
    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/reporter/daily-coverage/run/highlander-today'),
      { params: Promise.resolve({ communitySlug: 'highlander-today' }) }
    );

    expect(response.status).toBe(403);
    expect(runReporterDailyCoverageOrchestratorMock).not.toHaveBeenCalled();
  });
});
