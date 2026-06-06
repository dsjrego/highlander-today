import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const prismaMock = require('@/__mocks__/prisma').prismaMock as typeof import('@/__mocks__/prisma').prismaMock;

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const listReporterStoryCandidatesMock = jest.fn();
jest.mock('@/lib/reporter/story-candidates', () => ({
  listReporterStoryCandidates: (...args: unknown[]) =>
    listReporterStoryCandidatesMock(...(args as [])),
}));

const loadReporterRunForDraftMock = jest.fn();
const createReporterDraftForRunMock = jest.fn();
jest.mock('@/lib/reporter/draft-service', () => ({
  loadReporterRunForDraft: (...args: unknown[]) => loadReporterRunForDraftMock(...(args as [])),
  createReporterDraftForRun: (...args: unknown[]) =>
    createReporterDraftForRunMock(...(args as [])),
}));

const createReporterClaimsFromSourcePacketAnalysisMock = jest.fn(() => Promise.resolve([]));
jest.mock('@/lib/reporter/claim-service', () => ({
  createReporterClaimsFromSourcePacketAnalysis: (...args: unknown[]) =>
    createReporterClaimsFromSourcePacketAnalysisMock(...(args as [])),
}));

const {
  evaluateReporterDailyCoverage,
  upsertReporterDailyCoverageGoal,
} = require('@/lib/reporter/daily-coverage') as typeof import('@/lib/reporter/daily-coverage');

describe('reporter daily coverage service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.reporterDailyCoverageDecision.findUnique as any).mockResolvedValue(null);
  });

  it('selects the strongest eligible candidate and reuses an existing linked run', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'Daily desk',
      targetArticleCount: 1,
      minimumCandidateScore: 6,
      freshnessWindowHours: 48,
      allowNeedsReportingFallback: true,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-1',
        placeId: null,
        title: 'Budget hearing tonight',
        summary: 'Council is discussing the budget.',
        candidateType: 'ARTICLE_ONLY',
        sourceCount: 2,
        itemCount: 2,
        latestAt: new Date('2026-05-25T13:00:00Z'),
        matchedKeywords: ['budget'],
        linkedReporterRun: {
          id: 'run-1',
          title: 'Budget hearing tonight',
          topic: 'Budget hearing tonight',
          status: 'READY_FOR_DRAFT',
        },
        readiness: {
          level: 'draftable',
          label: 'Draftable',
          reason: 'Linked run has supported claims.',
          actionableClaimCount: 0,
          supportedClaimCount: 3,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'likely',
          score: 8,
          reasons: ['fresh civic signal'],
        },
        items: [],
      },
    ]);
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-1',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'SELECTED_CANDIDATE',
      summary: 'Budget hearing tonight selected for the daily desk.',
      reasons: ['Linked run has supported claims.', 'fresh civic signal'],
      selectedScore: 8,
      selectedReadiness: 'draftable',
      analysisStatus: 'GENERATED',
      analysisSummary: 'Source-packet analysis was generated for the selected daily desk run.',
      analysisIssueCount: 0,
      analysisHasCriticalIssues: false,
      analysisDraft: {
        id: 'draft-1',
        draftType: 'SOURCE_PACKET_SUMMARY',
      },
      articleStatus: 'GENERATED',
      articleSummary: 'Article draft was generated for the selected daily desk run.',
      articleIssueCount: 0,
      articleHasCriticalIssues: false,
      articleDraft: {
        id: 'draft-article-1',
        draftType: 'ARTICLE_DRAFT',
      },
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: {
        id: 'candidate-1',
        title: 'Budget hearing tonight',
      },
      reporterRun: {
        id: 'run-1',
        title: 'Budget hearing tonight',
        topic: 'Budget hearing tonight',
        status: 'READY_FOR_DRAFT',
      },
    });
    (loadReporterRunForDraftMock as any).mockResolvedValue({
      id: 'run-1',
    });
    (createReporterDraftForRunMock as any)
      .mockResolvedValueOnce({
        persisted: {
          id: 'draft-1',
        },
        validation: {
          hasCriticalIssues: false,
          issues: [],
        },
      })
      .mockResolvedValueOnce({
        persisted: {
          id: 'draft-article-1',
        },
        validation: {
          hasCriticalIssues: false,
          issues: [],
        },
      });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      outcome: 'selected',
      reporterRun: { id: 'run-1' },
      storyCandidate: { id: 'candidate-1' },
      analysisStatus: 'generated',
      analysisDraft: { id: 'draft-1' },
      articleStatus: 'generated',
      articleDraft: { id: 'draft-article-1' },
    });
    expect(prismaMock.reporterRun.create).not.toHaveBeenCalled();
    expect(createReporterDraftForRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        run: expect.objectContaining({ id: 'run-1' }),
        draftType: 'SOURCE_PACKET_SUMMARY',
      })
    );
    expect(createReporterDraftForRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        run: expect.objectContaining({ id: 'run-1' }),
        draftType: 'ARTICLE_DRAFT',
      })
    );
    expect(prismaMock.reporterDailyCoverageDecision.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          reporterStoryCandidateId: 'candidate-1',
          reporterRunId: 'run-1',
          analysisDraftId: 'draft-1',
          articleDraftId: 'draft-article-1',
        }),
      })
    );
  });

  it('creates a reporter run when an unclaimed candidate wins the daily desk', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'Daily desk',
      targetArticleCount: 1,
      minimumCandidateScore: 5,
      freshnessWindowHours: 48,
      allowNeedsReportingFallback: true,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-2',
        placeId: null,
        title: 'School board agenda expands',
        summary: 'A new staffing vote was added to tonight’s agenda.',
        candidateType: 'ARTICLE_ONLY',
        sourceCount: 2,
        itemCount: 2,
        latestAt: new Date('2026-05-25T14:00:00Z'),
        matchedKeywords: ['school board'],
        linkedReporterRun: null,
        readiness: {
          level: 'unclaimed',
          label: 'Unclaimed Lead',
          reason: 'No reporter run is linked yet.',
          actionableClaimCount: 0,
          supportedClaimCount: 0,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'likely',
          score: 7,
          reasons: ['matches a tenant term'],
        },
        items: [],
      },
    ]);
    (prismaMock.reporterStoryCandidate.findUnique as any).mockResolvedValue({
      id: 'candidate-2',
      communityId: 'community-1',
      title: 'School board agenda expands',
      summary: 'A new staffing vote was added to tonight’s agenda.',
      reasons: ['matches a tenant term'],
      matchedKeywords: ['school board'],
      linkedReporterRun: null,
      candidateItems: [
        {
          ingestionItem: {
            title: 'School board agenda expands',
            canonicalUrl: 'https://example.com/agenda',
            publisher: 'District',
            publishedAt: new Date('2026-05-25T13:00:00Z'),
            excerpt: 'A new staffing vote was added.',
            contentText: 'A new staffing vote was added.',
            monitoredSource: {
              label: 'District agenda',
            },
          },
        },
      ],
    });
    (prismaMock.reporterRun.create as any).mockResolvedValue({
      id: 'run-2',
      title: 'School board agenda expands',
      topic: 'School board agenda expands',
      status: 'NEW',
      sources: [
        {
          id: 'source-1',
          sourceType: 'NEWS_ARTICLE',
          title: 'School board agenda expands',
          url: 'https://example.com/agenda',
          publisher: 'District',
          author: null,
          publishedAt: new Date('2026-05-25T13:00:00Z'),
          contentText: 'A new staffing vote was added.',
          excerpt: 'A new staffing vote was added.',
          note: 'Seeded from monitored source: District agenda',
          reliabilityTier: 'UNVERIFIED',
          sortOrder: 0,
        },
      ],
    });
    (prismaMock.reporterStoryCandidate.update as any).mockResolvedValue({});
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-2',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'SELECTED_CANDIDATE',
      summary: 'School board agenda expands selected for the daily desk.',
      reasons: ['No reporter run is linked yet.', 'matches a tenant term'],
      selectedScore: 7,
      selectedReadiness: 'unclaimed',
      analysisStatus: 'SKIPPED',
      analysisSummary:
        'Daily desk selected this run without auto-generating source-packet analysis.',
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
      analysisDraft: null,
      articleStatus: 'SKIPPED',
      articleSummary:
        'Article draft generation was skipped because the selected run is not yet draftable.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
      articleDraft: null,
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: {
        id: 'candidate-2',
        title: 'School board agenda expands',
      },
      reporterRun: {
        id: 'run-2',
        title: 'School board agenda expands',
        topic: 'School board agenda expands',
        status: 'NEW',
      },
    });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      outcome: 'selected',
      reporterRun: { id: 'run-2' },
      analysisStatus: 'skipped',
      articleStatus: 'skipped',
    });
    expect(prismaMock.reporterRun.create).toHaveBeenCalled();
    expect(createReporterClaimsFromSourcePacketAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterRunId: 'run-2',
      })
    );
    expect(prismaMock.reporterStoryCandidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          linkedReporterRunId: 'run-2',
        },
      })
    );
  });

  it('saves a no-story decision when no candidate clears threshold', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'Daily desk',
      targetArticleCount: 1,
      minimumCandidateScore: 8,
      freshnessWindowHours: 24,
      allowNeedsReportingFallback: false,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-3',
        placeId: null,
        title: 'Thin lead',
        summary: null,
        candidateType: 'ARTICLE_ONLY',
        sourceCount: 1,
        itemCount: 1,
        latestAt: new Date('2026-05-25T10:00:00Z'),
        matchedKeywords: [],
        linkedReporterRun: null,
        readiness: {
          level: 'unclaimed',
          label: 'Unclaimed Lead',
          reason: 'No reporter run is linked yet.',
          actionableClaimCount: 0,
          supportedClaimCount: 0,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'possible',
          score: 4,
          reasons: ['weak story signal'],
        },
        items: [],
      },
    ]);
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-3',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'NO_PUBLISHABLE_STORY',
      summary: 'No story candidate cleared the current daily coverage thresholds.',
      reasons: ['Thin lead: score 4 is below the minimum 8.'],
      selectedScore: null,
      selectedReadiness: null,
      analysisStatus: null,
      analysisSummary: null,
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
      analysisDraft: null,
      articleStatus: null,
      articleSummary: null,
      articleIssueCount: null,
      articleHasCriticalIssues: null,
      articleDraft: null,
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: null,
      reporterRun: null,
    });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      outcome: 'no-story',
    });
    expect(prismaMock.reporterRun.create).not.toHaveBeenCalled();
  });

  it('skips event-only candidates for the article desk', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'Daily desk',
      targetArticleCount: 1,
      minimumCandidateScore: 5,
      freshnessWindowHours: 48,
      allowNeedsReportingFallback: true,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-event',
        placeId: null,
        title: 'Farmers market opens Saturday',
        summary: 'Weekly market returns downtown.',
        candidateType: 'EVENT_ONLY',
        coverageScopes: ['LOCAL'],
        sourceCount: 1,
        itemCount: 1,
        latestAt: new Date('2026-05-25T11:00:00Z'),
        matchedKeywords: [],
        linkedReporterRun: null,
        readiness: {
          level: 'unclaimed',
          label: 'Unclaimed Lead',
          reason: 'No reporter run is linked yet.',
          actionableClaimCount: 0,
          supportedClaimCount: 0,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'likely',
          score: 8,
          reasons: ['calendar listing has strong event details'],
        },
        eventExtraction: {
          title: 'Farmers market opens Saturday',
          summary: 'Weekly market returns downtown.',
          startAt: new Date('2026-05-30T14:00:00Z'),
          endAt: null,
          location: 'Main Street Plaza',
          organizer: 'Westmont Market Association',
          sourceUrl: 'https://example.com/farmers-market',
          isRecurring: true,
          recurrenceText: 'weekly',
          confidence: 'high',
          missingFields: [],
        },
        items: [],
      },
    ]);
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-event-skip',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'NO_PUBLISHABLE_STORY',
      summary: 'No story candidate cleared the current daily coverage thresholds.',
      reasons: ['Farmers market opens Saturday: classified as event-only for the article desk.'],
      selectedScore: null,
      selectedReadiness: null,
      analysisStatus: null,
      analysisSummary: null,
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
      analysisDraft: null,
      articleStatus: null,
      articleSummary: null,
      articleIssueCount: null,
      articleHasCriticalIssues: null,
      articleDraft: null,
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: null,
      reporterRun: null,
    });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      outcome: 'no-story',
    });
    expect(prismaMock.reporterDailyCoverageDecision.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          reasons: expect.arrayContaining([
            'Farmers market opens Saturday: classified as event-only for the article desk.',
          ]),
        }),
      })
    );
  });

  it('skips candidates outside the daily goal priority scopes', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'State desk',
      targetArticleCount: 1,
      priorityCoverageScopes: ['STATE'],
      minimumCandidateScore: 5,
      freshnessWindowHours: 48,
      allowNeedsReportingFallback: true,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-county',
        placeId: null,
        title: 'County commissioners announce grant',
        summary: 'County source-rich item.',
        candidateType: 'ARTICLE_ONLY',
        coverageScopes: ['COUNTY'],
        sourceCount: 1,
        itemCount: 1,
        latestAt: new Date('2026-05-25T14:00:00Z'),
        matchedKeywords: [],
        linkedReporterRun: {
          id: 'run-county',
          title: 'County commissioners announce grant',
          topic: 'County commissioners announce grant',
          status: 'READY_FOR_DRAFT',
        },
        readiness: {
          level: 'needs-reporting',
          label: 'Needs Reporting',
          reason: 'Needs one more claim review.',
          actionableClaimCount: 1,
          supportedClaimCount: 0,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'likely',
          score: 10,
          reasons: ['has a direct article link'],
        },
        items: [],
      },
      {
        id: 'candidate-state',
        placeId: null,
        title: 'State agency posts road funding list',
        summary: 'State source-rich item.',
        candidateType: 'ARTICLE_ONLY',
        coverageScopes: ['STATE'],
        sourceCount: 1,
        itemCount: 1,
        latestAt: new Date('2026-05-25T13:00:00Z'),
        matchedKeywords: [],
        linkedReporterRun: {
          id: 'run-state',
          title: 'State agency posts road funding list',
          topic: 'State agency posts road funding list',
          status: 'READY_FOR_DRAFT',
        },
        readiness: {
          level: 'needs-reporting',
          label: 'Needs Reporting',
          reason: 'Needs one more claim review.',
          actionableClaimCount: 1,
          supportedClaimCount: 0,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'possible',
          score: 6,
          reasons: ['has a direct article link'],
        },
        items: [],
      },
    ]);
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-state',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'SELECTED_CANDIDATE',
      summary: 'State agency posts road funding list selected for the daily desk.',
      reasons: ['Priority scope match: State.', 'Needs one more claim review.'],
      selectedScore: 6,
      selectedReadiness: 'needs-reporting',
      analysisStatus: 'SKIPPED',
      analysisSummary:
        'Daily desk selected this run, but source-packet analysis was skipped because reporting follow-up is still required.',
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
      analysisDraft: null,
      articleStatus: 'SKIPPED',
      articleSummary:
        'Article draft generation was skipped because the selected run is not yet draftable.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
      articleDraft: null,
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: {
        id: 'candidate-state',
        title: 'State agency posts road funding list',
      },
      reporterRun: {
        id: 'run-state',
        title: 'State agency posts road funding list',
        topic: 'State agency posts road funding list',
        status: 'READY_FOR_DRAFT',
      },
    });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      outcome: 'selected',
      storyCandidate: { id: 'candidate-state' },
      reporterRun: { id: 'run-state' },
    });
    expect(prismaMock.reporterDailyCoverageDecision.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          reporterStoryCandidateId: 'candidate-state',
          reporterRunId: 'run-state',
          reasons: expect.arrayContaining(['Priority scope match: State.']),
        }),
      })
    );
  });

  it('skips article drafting when analysis is blocked by critical issues', async () => {
    (prismaMock.reporterDailyCoverageGoal.findUnique as any).mockResolvedValue({
      id: 'goal-1',
      label: 'Daily desk',
      targetArticleCount: 1,
      minimumCandidateScore: 6,
      freshnessWindowHours: 48,
      allowNeedsReportingFallback: true,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: null,
      placeId: null,
    });
    (listReporterStoryCandidatesMock as any).mockResolvedValue([
      {
        id: 'candidate-4',
        placeId: null,
        title: 'Borough meeting fight',
        summary: 'A strong lead with supported claims.',
        candidateType: 'ARTICLE_ONLY',
        sourceCount: 2,
        itemCount: 2,
        latestAt: new Date('2026-05-25T15:00:00Z'),
        matchedKeywords: [],
        linkedReporterRun: {
          id: 'run-4',
          title: 'Borough meeting fight',
          topic: 'Borough meeting fight',
          status: 'READY_FOR_DRAFT',
        },
        readiness: {
          level: 'draftable',
          label: 'Draftable',
          reason: 'Linked run has supported claims.',
          actionableClaimCount: 0,
          supportedClaimCount: 2,
          followUpClaimCount: 0,
          blockerCount: 0,
        },
        signal: {
          level: 'likely',
          score: 9,
          reasons: ['fresh civic signal'],
        },
        items: [],
      },
    ]);
    (createReporterDraftForRunMock as any).mockResolvedValueOnce({
      persisted: {
        id: 'draft-analysis-4',
      },
      validation: {
        hasCriticalIssues: true,
        issues: [{ code: 'UNSUPPORTED_CLAIM' }],
      },
    });
    (prismaMock.reporterDailyCoverageDecision.upsert as any).mockResolvedValue({
      id: 'decision-4',
      decisionDate: new Date('2026-05-25T12:00:00Z'),
      outcome: 'SELECTED_CANDIDATE',
      summary: 'Borough meeting fight selected for the daily desk.',
      reasons: ['Linked run has supported claims.', 'fresh civic signal'],
      selectedScore: 9,
      selectedReadiness: 'draftable',
      analysisStatus: 'BLOCKED',
      analysisSummary:
        'Source-packet analysis was generated but surfaced critical validation issues.',
      analysisIssueCount: 1,
      analysisHasCriticalIssues: true,
      analysisDraft: {
        id: 'draft-analysis-4',
        draftType: 'SOURCE_PACKET_SUMMARY',
      },
      articleStatus: 'SKIPPED',
      articleSummary:
        'Article draft generation was skipped because source-packet analysis surfaced critical validation issues.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
      articleDraft: null,
      updatedAt: new Date('2026-05-25T12:30:00Z'),
      storyCandidate: {
        id: 'candidate-4',
        title: 'Borough meeting fight',
      },
      reporterRun: {
        id: 'run-4',
        title: 'Borough meeting fight',
        topic: 'Borough meeting fight',
        status: 'READY_FOR_DRAFT',
      },
    });
    (loadReporterRunForDraftMock as any).mockResolvedValue({
      id: 'run-4',
    });

    const result = await evaluateReporterDailyCoverage({
      communityId: 'community-1',
      date: '2026-05-25',
      createdByUserId: 'editor-1',
    });

    expect(result.decision).toMatchObject({
      analysisStatus: 'blocked',
      articleStatus: 'skipped',
      articleDraft: null,
    });
    expect(createReporterDraftForRunMock).toHaveBeenCalledTimes(1);
  });

  it('upserts the community daily coverage goal', async () => {
    (prismaMock.reporterDailyCoverageGoal.upsert as any).mockResolvedValue({
      id: 'goal-4',
      label: 'Westmont desk',
      targetArticleCount: 1,
      priorityCoverageScopes: ['LOCAL', 'COUNTY'],
      minimumCandidateScore: 7,
      freshnessWindowHours: 30,
      allowNeedsReportingFallback: false,
      isActive: true,
      updatedAt: new Date('2026-05-25T12:00:00Z'),
      place: {
        id: 'place-1',
        displayName: 'Westmont',
      },
    });

    const result = await upsertReporterDailyCoverageGoal({
      communityId: 'community-1',
      placeId: 'place-1',
      label: 'Westmont desk',
      minimumCandidateScore: 7,
      freshnessWindowHours: 30,
      priorityCoverageScopes: ['LOCAL', 'COUNTY'],
      allowNeedsReportingFallback: false,
    });

    expect(result).toMatchObject({
      id: 'goal-4',
      placeId: 'place-1',
      minimumCandidateScore: 7,
      freshnessWindowHours: 30,
      priorityCoverageScopes: expect.arrayContaining(['LOCAL', 'COUNTY']),
    });
    expect(prismaMock.reporterDailyCoverageGoal.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { communityId: 'community-1' },
      })
    );
  });
});
