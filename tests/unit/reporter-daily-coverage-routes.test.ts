import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const logActivityMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));

const upsertReporterDailyCoverageGoalMock = jest.fn();
const evaluateReporterDailyCoverageMock = jest.fn();
jest.mock('@/lib/reporter/daily-coverage', () => ({
  upsertReporterDailyCoverageGoal: (...args: unknown[]) =>
    upsertReporterDailyCoverageGoalMock(...(args as [])),
  evaluateReporterDailyCoverage: (...args: unknown[]) =>
    evaluateReporterDailyCoverageMock(...(args as [])),
}));

const goalRoute = require('@/app/api/admin/reporter/daily-coverage/goal/route') as typeof import('@/app/api/admin/reporter/daily-coverage/goal/route');
const evaluateRoute = require('@/app/api/admin/reporter/daily-coverage/evaluate/route') as typeof import('@/app/api/admin/reporter/daily-coverage/evaluate/route');

function buildRequest(url: string, body?: unknown, headers?: Record<string, string>) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      'x-community-id': 'community-1',
      ...headers,
    },
    body: JSON.stringify(body || {}),
  }) as any;
}

describe('reporter daily coverage routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
  });

  it('saves the daily coverage goal for the current community', async () => {
    (upsertReporterDailyCoverageGoalMock as any).mockResolvedValue({
      id: 'goal-1',
      placeId: '11111111-1111-4111-8111-111111111111',
      priorityCoverageScopes: ['COUNTY', 'STATE'],
      minimumCandidateScore: 7,
      freshnessWindowHours: 30,
      allowNeedsReportingFallback: false,
    });

    const response = await goalRoute.POST(
      buildRequest('http://localhost/api/admin/reporter/daily-coverage/goal', {
        placeId: '11111111-1111-4111-8111-111111111111',
        priorityCoverageScopes: ['COUNTY', 'STATE'],
        minimumCandidateScore: 7,
        freshnessWindowHours: 30,
        allowNeedsReportingFallback: false,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      goal: expect.objectContaining({
        id: 'goal-1',
      }),
    });
    expect(upsertReporterDailyCoverageGoalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: 'community-1',
        placeId: '11111111-1111-4111-8111-111111111111',
        priorityCoverageScopes: ['COUNTY', 'STATE'],
      })
    );
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'REPORTER_DAILY_COVERAGE_DECISION',
        resourceId: 'goal-1',
      })
    );
  });

  it('evaluates and logs the current daily coverage decision', async () => {
    (evaluateReporterDailyCoverageMock as any).mockResolvedValue({
      date: '2026-05-25',
      goal: { id: 'goal-1' },
      decision: {
        id: 'decision-1',
        outcome: 'selected',
        selectedScore: 8,
        analysisStatus: 'generated',
        analysisDraft: { id: 'draft-analysis-1', draftType: 'SOURCE_PACKET_SUMMARY' },
        articleStatus: 'generated',
        articleDraft: { id: 'draft-article-1', draftType: 'ARTICLE_DRAFT' },
        storyCandidate: { id: 'candidate-1', title: 'Budget hearing tonight' },
        reporterRun: { id: 'run-1', title: 'Budget hearing tonight', topic: 'Budget hearing tonight', status: 'READY_FOR_DRAFT' },
      },
    });

    const response = await evaluateRoute.POST(
      buildRequest('http://localhost/api/admin/reporter/daily-coverage/evaluate', {
        date: '2026-05-25',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      date: '2026-05-25',
      decision: expect.objectContaining({
        id: 'decision-1',
        outcome: 'selected',
      }),
    });
    expect(evaluateReporterDailyCoverageMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'decision-1',
        metadata: expect.objectContaining({
          reporterRunId: 'run-1',
          storyCandidateId: 'candidate-1',
          analysisDraftId: 'draft-analysis-1',
          articleDraftId: 'draft-article-1',
        }),
      })
    );
  });
});
