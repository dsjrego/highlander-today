import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const runDueReporterMonitoredSourcesMock = jest.fn();
jest.mock('@/lib/reporter/monitored-source-scheduler', () => ({
  runDueReporterMonitoredSources: (...args: unknown[]) =>
    runDueReporterMonitoredSourcesMock(...(args as [])),
}));

const materializeReporterStoryCandidatesMock = jest.fn();
jest.mock('@/lib/reporter/story-candidates', () => ({
  materializeReporterStoryCandidates: (...args: unknown[]) =>
    materializeReporterStoryCandidatesMock(...(args as [])),
}));

const evaluateReporterDailyCoverageMock = jest.fn();
jest.mock('@/lib/reporter/daily-coverage', () => ({
  evaluateReporterDailyCoverage: (...args: unknown[]) =>
    evaluateReporterDailyCoverageMock(...(args as [])),
}));

const { runReporterDailyCoverageOrchestrator } =
  require('@/lib/reporter/daily-coverage-orchestrator') as typeof import('@/lib/reporter/daily-coverage-orchestrator');

describe('reporter daily coverage orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches due sources, refreshes candidates, and evaluates the morning desk', async () => {
    (runDueReporterMonitoredSourcesMock as any).mockResolvedValue({
      attemptedCount: 2,
      results: [],
      summary: { successCount: 1, noChangeCount: 1, failedCount: 0 },
    });
    (materializeReporterStoryCandidatesMock as any).mockResolvedValue({
      candidateCount: 2,
      candidates: [
        {
          id: 'candidate-1',
          title: 'Borough posts budget agenda',
          candidateType: 'ARTICLE_ONLY',
          sourceCount: 1,
          latestAt: new Date('2026-09-25T09:00:00Z'),
          signal: {
            score: 8,
            level: 'likely',
            reasons: ['official local source'],
          },
          readiness: { level: 'unclaimed', label: 'Unclaimed Lead' },
        },
        {
          id: 'candidate-2',
          title: 'School calendar update',
          candidateType: 'EVENT_ONLY',
          sourceCount: 1,
          latestAt: new Date('2026-09-25T08:00:00Z'),
          signal: { score: 5, level: 'possible', reasons: ['recent activity'] },
          readiness: { level: 'unclaimed', label: 'Unclaimed Lead' },
        },
      ],
    });
    (evaluateReporterDailyCoverageMock as any).mockResolvedValue({
      date: '2026-09-25',
      goal: { id: 'goal-1' },
      decision: { id: 'decision-1', outcome: 'selected' },
    });

    const result = await runReporterDailyCoverageOrchestrator({
      communityId: 'community-1',
      date: '2026-09-25',
      sourceFetchLimit: 8,
      candidateLimit: 15,
    });

    expect(runDueReporterMonitoredSourcesMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      limit: 8,
    });
    expect(materializeReporterStoryCandidatesMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      limit: 15,
    });
    expect(evaluateReporterDailyCoverageMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      date: '2026-09-25',
      createdByUserId: null,
    });
    expect(result).toMatchObject({
      candidateRefresh: {
        candidateCount: 2,
        morningDesk: [
          expect.objectContaining({ id: 'candidate-1', score: 8 }),
          expect.objectContaining({
            id: 'candidate-2',
            candidateType: 'EVENT_ONLY',
          }),
        ],
      },
      dailyDesk: {
        decision: { id: 'decision-1', outcome: 'selected' },
      },
    });
  });
});
