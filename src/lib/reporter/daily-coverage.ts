import {
  ReporterDailyCoverageAnalysisStatus,
  ReporterDailyCoverageArticleStatus,
  ReporterDailyCoverageDecisionOutcome,
} from '@prisma/client';
import { db } from '@/lib/db';
import { createReporterClaimsFromSourcePacketAnalysis } from './claim-service';
import { createReporterDraftForRun, loadReporterRunForDraft } from './draft-service';
import { normalizeReporterRunInput } from './run-normalizer';
import { listReporterStoryCandidates, type ReporterStoryCandidateView } from './story-candidates';

const DEFAULT_DAILY_COVERAGE_LIMIT = 20;

export type ReporterDailyCoverageGoalView = {
  id: string;
  placeId: string | null;
  placeName: string | null;
  label: string | null;
  targetArticleCount: number;
  minimumCandidateScore: number;
  freshnessWindowHours: number;
  allowNeedsReportingFallback: boolean;
  isActive: boolean;
  updatedAt: Date;
};

export type ReporterDailyCoverageDecisionView = {
  id: string;
  decisionDate: string;
  outcome: 'selected' | 'no-story';
  outcomeLabel: string;
  summary: string;
  reasons: string[];
  selectedScore: number | null;
  selectedReadiness: string | null;
  analysisStatus: 'generated' | 'blocked' | 'skipped' | 'failed' | null;
  analysisStatusLabel: string | null;
  analysisSummary: string | null;
  analysisIssueCount: number | null;
  analysisHasCriticalIssues: boolean | null;
  analysisDraft: {
    id: string;
    draftType: string;
  } | null;
  articleStatus: 'generated' | 'blocked' | 'skipped' | 'failed' | null;
  articleStatusLabel: string | null;
  articleSummary: string | null;
  articleIssueCount: number | null;
  articleHasCriticalIssues: boolean | null;
  articleDraft: {
    id: string;
    draftType: string;
  } | null;
  storyCandidate: {
    id: string;
    title: string;
  } | null;
  reporterRun: {
    id: string;
    title: string | null;
    topic: string;
    status: string;
  } | null;
  updatedAt: Date;
};

export type ReporterDailyCoverageDeskView = {
  date: string;
  goal: ReporterDailyCoverageGoalView | null;
  decision: ReporterDailyCoverageDecisionView | null;
};

function buildLocalDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDecisionDate(dateKey?: string) {
  const normalized = dateKey || buildLocalDateKey();
  return {
    dateKey: normalized,
    decisionDate: new Date(`${normalized}T12:00:00.000Z`),
  };
}

function outcomeLabel(outcome: ReporterDailyCoverageDecisionOutcome) {
  return outcome === ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE
    ? 'Selected Story'
    : 'No Publishable Story';
}

function analysisStatusLabel(status: ReporterDailyCoverageAnalysisStatus | null) {
  if (!status) {
    return null;
  }

  switch (status) {
    case ReporterDailyCoverageAnalysisStatus.GENERATED:
      return 'Analysis Generated';
    case ReporterDailyCoverageAnalysisStatus.BLOCKED:
      return 'Analysis Blocked';
    case ReporterDailyCoverageAnalysisStatus.SKIPPED:
      return 'Analysis Skipped';
    case ReporterDailyCoverageAnalysisStatus.FAILED:
      return 'Analysis Failed';
  }
}

function articleStatusLabel(status: ReporterDailyCoverageArticleStatus | null) {
  if (!status) {
    return null;
  }

  switch (status) {
    case ReporterDailyCoverageArticleStatus.GENERATED:
      return 'Article Draft Generated';
    case ReporterDailyCoverageArticleStatus.BLOCKED:
      return 'Article Draft Blocked';
    case ReporterDailyCoverageArticleStatus.SKIPPED:
      return 'Article Draft Skipped';
    case ReporterDailyCoverageArticleStatus.FAILED:
      return 'Article Draft Failed';
  }
}

function mapGoal(goal: {
  id: string;
  label: string | null;
  targetArticleCount: number;
  minimumCandidateScore: number;
  freshnessWindowHours: number;
  allowNeedsReportingFallback: boolean;
  isActive: boolean;
  updatedAt: Date;
  place: { id: string; displayName: string } | null;
}): ReporterDailyCoverageGoalView {
  return {
    id: goal.id,
    placeId: goal.place?.id || null,
    placeName: goal.place?.displayName || null,
    label: goal.label,
    targetArticleCount: goal.targetArticleCount,
    minimumCandidateScore: goal.minimumCandidateScore,
    freshnessWindowHours: goal.freshnessWindowHours,
    allowNeedsReportingFallback: goal.allowNeedsReportingFallback,
    isActive: goal.isActive,
    updatedAt: goal.updatedAt,
  };
}

function mapDecision(decision: {
  id: string;
  decisionDate: Date;
  outcome: ReporterDailyCoverageDecisionOutcome;
  summary: string;
  reasons: string[];
  selectedScore: number | null;
  selectedReadiness: string | null;
  analysisStatus: ReporterDailyCoverageAnalysisStatus | null;
  analysisSummary: string | null;
  analysisIssueCount: number | null;
  analysisHasCriticalIssues: boolean | null;
  analysisDraft: { id: string; draftType: string } | null;
  articleStatus: ReporterDailyCoverageArticleStatus | null;
  articleSummary: string | null;
  articleIssueCount: number | null;
  articleHasCriticalIssues: boolean | null;
  articleDraft: { id: string; draftType: string } | null;
  updatedAt: Date;
  storyCandidate: { id: string; title: string } | null;
  reporterRun: { id: string; title: string | null; topic: string; status: string } | null;
}): ReporterDailyCoverageDecisionView {
  return {
    id: decision.id,
    decisionDate: buildLocalDateKey(decision.decisionDate),
    outcome:
      decision.outcome === ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE
        ? 'selected'
        : 'no-story',
    outcomeLabel: outcomeLabel(decision.outcome),
    summary: decision.summary,
    reasons: decision.reasons,
    selectedScore: decision.selectedScore,
    selectedReadiness: decision.selectedReadiness,
    analysisStatus: decision.analysisStatus
      ? decision.analysisStatus.toLowerCase() as ReporterDailyCoverageDecisionView['analysisStatus']
      : null,
    analysisStatusLabel: analysisStatusLabel(decision.analysisStatus),
    analysisSummary: decision.analysisSummary,
    analysisIssueCount: decision.analysisIssueCount,
    analysisHasCriticalIssues: decision.analysisHasCriticalIssues,
    analysisDraft: decision.analysisDraft,
    articleStatus: decision.articleStatus
      ? decision.articleStatus.toLowerCase() as ReporterDailyCoverageDecisionView['articleStatus']
      : null,
    articleStatusLabel: articleStatusLabel(decision.articleStatus),
    articleSummary: decision.articleSummary,
    articleIssueCount: decision.articleIssueCount,
    articleHasCriticalIssues: decision.articleHasCriticalIssues,
    articleDraft: decision.articleDraft,
    storyCandidate: decision.storyCandidate,
    reporterRun: decision.reporterRun,
    updatedAt: decision.updatedAt,
  };
}

const dailyGoalSelect = {
  id: true,
  placeId: true,
  label: true,
  targetArticleCount: true,
  minimumCandidateScore: true,
  freshnessWindowHours: true,
  allowNeedsReportingFallback: true,
  isActive: true,
  updatedAt: true,
  place: {
    select: {
      id: true,
      displayName: true,
    },
  },
} as const;

const dailyDecisionSelect = {
  id: true,
  decisionDate: true,
  outcome: true,
  summary: true,
  reasons: true,
  selectedScore: true,
  selectedReadiness: true,
  analysisStatus: true,
  analysisSummary: true,
  analysisIssueCount: true,
  analysisHasCriticalIssues: true,
  articleStatus: true,
  articleSummary: true,
  articleIssueCount: true,
  articleHasCriticalIssues: true,
  updatedAt: true,
  analysisDraft: {
    select: {
      id: true,
      draftType: true,
    },
  },
  articleDraft: {
    select: {
      id: true,
      draftType: true,
    },
  },
  storyCandidate: {
    select: {
      id: true,
      title: true,
    },
  },
  reporterRun: {
    select: {
      id: true,
      title: true,
      topic: true,
      status: true,
    },
  },
} as const;

async function ensureDailyCoverageGoal(communityId: string) {
  const existingGoal = await db.reporterDailyCoverageGoal.findUnique({
    where: {
      communityId,
    },
    select: dailyGoalSelect,
  });

  if (existingGoal) {
    return existingGoal;
  }

  const primaryCoverageArea = await db.tenantCoverageArea.findFirst({
    where: {
      communityId,
      isActive: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      placeId: true,
      place: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  return db.reporterDailyCoverageGoal.create({
    data: {
      communityId,
      placeId: primaryCoverageArea?.placeId || null,
      label: primaryCoverageArea?.place?.displayName
        ? `${primaryCoverageArea.place.displayName} daily desk`
        : 'Daily desk',
      isActive: true,
    },
    select: dailyGoalSelect,
  });
}

function getDailySelectionWeight(candidate: ReporterStoryCandidateView) {
  switch (candidate.readiness.level) {
    case 'draftable':
      return 4;
    case 'unclaimed':
      return 3;
    case 'needs-reporting':
      return 2;
    case 'blocked':
      return 1;
  }
}

async function ensureReporterRunForCandidate(params: {
  communityId: string;
  candidateId: string;
  createdByUserId: string | null;
  decisionDateKey: string;
}) {
  const candidate = await db.reporterStoryCandidate.findUnique({
    where: {
      id: params.candidateId,
    },
    select: {
      id: true,
      communityId: true,
      title: true,
      summary: true,
      reasons: true,
      matchedKeywords: true,
      linkedReporterRun: {
        select: {
          id: true,
          title: true,
          topic: true,
          status: true,
        },
      },
      candidateItems: {
        orderBy: [{ sortOrder: 'asc' }],
        select: {
          ingestionItem: {
            select: {
              title: true,
              canonicalUrl: true,
              publisher: true,
              publishedAt: true,
              excerpt: true,
              contentText: true,
              monitoredSource: {
                select: {
                  label: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!candidate || candidate.communityId !== params.communityId) {
    throw new Error('Story candidate not found for daily coverage selection');
  }

  if (candidate.linkedReporterRun) {
    return candidate.linkedReporterRun;
  }

  const normalized = normalizeReporterRunInput({
    mode: 'RESEARCH',
    requestType: 'EDITOR_ASSIGNMENT',
    topic: candidate.title,
    title: candidate.title,
    requestSummary: `Selected by daily coverage desk for ${params.decisionDateKey}.`,
    whatHappened: candidate.summary || candidate.title,
    editorNotes: [
      `Selected by daily coverage desk for ${params.decisionDateKey}.`,
      candidate.matchedKeywords.length
        ? `Matched tenant terms: ${candidate.matchedKeywords.join(', ')}`
        : null,
      candidate.reasons.length ? `Candidate reasons: ${candidate.reasons.join(' • ')}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    initialSources: candidate.candidateItems.map(({ ingestionItem }) => ({
      sourceType: 'NEWS_ARTICLE',
      title: ingestionItem.title,
      url: ingestionItem.canonicalUrl,
      publisher: ingestionItem.publisher,
      author: null,
      publishedAt: ingestionItem.publishedAt?.toISOString() || null,
      contentText: ingestionItem.contentText,
      excerpt: ingestionItem.excerpt,
      note: ingestionItem.monitoredSource.label
        ? `Seeded from monitored source: ${ingestionItem.monitoredSource.label}`
        : null,
      reliabilityTier: 'UNVERIFIED',
    })),
  });

  const createdRun = await db.reporterRun.create({
    data: {
      communityId: params.communityId,
      createdByUserId: params.createdByUserId,
      requesterUserId: params.createdByUserId,
      ...(normalized.mode ? { mode: normalized.mode } : {}),
      ...(normalized.requestType ? { requestType: normalized.requestType } : {}),
      title: normalized.title,
      topic: normalized.topic,
      subjectName: normalized.subjectName,
      requestedArticleType: normalized.requestedArticleType,
      requesterName: normalized.requesterName,
      requesterEmail: normalized.requesterEmail,
      requesterPhone: normalized.requesterPhone,
      requestSummary: normalized.requestSummary,
      editorNotes: normalized.editorNotes,
      publicDescription: normalized.publicDescription,
      sources: {
        create: normalized.initialSources.map((source, index) => ({
          sourceType: source.sourceType,
          title: source.title,
          url: source.url,
          publisher: source.publisher,
          author: source.author,
          publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
          contentText: source.contentText,
          excerpt: source.excerpt,
          note: source.note,
          reliabilityTier: source.reliabilityTier,
          sortOrder: index,
          createdByUserId: params.createdByUserId,
        })),
      },
    },
    select: {
      id: true,
      title: true,
      topic: true,
      status: true,
      sources: {
        orderBy: [{ sortOrder: 'asc' }],
        select: {
          id: true,
          sourceType: true,
          title: true,
          url: true,
          publisher: true,
          author: true,
          publishedAt: true,
          contentText: true,
          excerpt: true,
          note: true,
          reliabilityTier: true,
          sortOrder: true,
        },
      },
    },
  });

  await createReporterClaimsFromSourcePacketAnalysis({
    reporterRunId: createdRun.id,
    sources: createdRun.sources,
    createdByUserId: params.createdByUserId,
  });

  await db.reporterStoryCandidate.update({
    where: {
      id: candidate.id,
    },
    data: {
      linkedReporterRunId: createdRun.id,
    },
  });

  return {
    id: createdRun.id,
    title: createdRun.title,
    topic: createdRun.topic,
    status: createdRun.status,
  };
}

export async function upsertReporterDailyCoverageGoal(params: {
  communityId: string;
  placeId?: string | null;
  label?: string | null;
  targetArticleCount?: number;
  minimumCandidateScore?: number;
  freshnessWindowHours?: number;
  allowNeedsReportingFallback?: boolean;
  isActive?: boolean;
}) {
  const goal = await db.reporterDailyCoverageGoal.upsert({
    where: {
      communityId: params.communityId,
    },
    update: {
      placeId: params.placeId === undefined ? undefined : params.placeId,
      label: params.label === undefined ? undefined : params.label,
      targetArticleCount:
        params.targetArticleCount === undefined ? undefined : params.targetArticleCount,
      minimumCandidateScore:
        params.minimumCandidateScore === undefined ? undefined : params.minimumCandidateScore,
      freshnessWindowHours:
        params.freshnessWindowHours === undefined ? undefined : params.freshnessWindowHours,
      allowNeedsReportingFallback:
        params.allowNeedsReportingFallback === undefined
          ? undefined
          : params.allowNeedsReportingFallback,
      isActive: params.isActive === undefined ? undefined : params.isActive,
    },
    create: {
      communityId: params.communityId,
      placeId: params.placeId || null,
      label: params.label || 'Daily desk',
      targetArticleCount: params.targetArticleCount ?? 1,
      minimumCandidateScore: params.minimumCandidateScore ?? 6,
      freshnessWindowHours: params.freshnessWindowHours ?? 36,
      allowNeedsReportingFallback: params.allowNeedsReportingFallback ?? true,
      isActive: params.isActive ?? true,
    },
    select: dailyGoalSelect,
  });

  return mapGoal(goal);
}

export async function getReporterDailyCoverageDesk(params: {
  communityId: string;
  date?: string;
}) {
  const { decisionDate, dateKey } = normalizeDecisionDate(params.date);

  const goal = await db.reporterDailyCoverageGoal.findUnique({
    where: {
      communityId: params.communityId,
    },
    select: dailyGoalSelect,
  });

  const decision = goal
    ? await db.reporterDailyCoverageDecision.findUnique({
        where: {
          reporterDailyCoverageGoalId_decisionDate: {
            reporterDailyCoverageGoalId: goal.id,
            decisionDate,
          },
        },
        select: dailyDecisionSelect,
      })
    : null;

  return {
    date: dateKey,
    goal: goal ? mapGoal(goal) : null,
    decision: decision ? mapDecision(decision) : null,
  } satisfies ReporterDailyCoverageDeskView;
}

async function maybeGenerateDailyCoverageAnalysis(params: {
  reporterRunId: string;
  createdByUserId: string | null;
  existingAnalysisDraftId?: string | null;
  existingAnalysisStatus?: ReporterDailyCoverageAnalysisStatus | null;
  existingAnalysisSummary?: string | null;
  existingAnalysisIssueCount?: number | null;
  existingAnalysisHasCriticalIssues?: boolean | null;
}) {
  if (!params.createdByUserId) {
    return {
      analysisDraftId: null,
      analysisStatus: ReporterDailyCoverageAnalysisStatus.FAILED,
      analysisSummary: 'Daily desk selection could not generate analysis without an authenticated editor context.',
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
    };
  }

  if (params.existingAnalysisDraftId) {
    return {
      analysisDraftId: params.existingAnalysisDraftId,
      analysisStatus: params.existingAnalysisStatus || ReporterDailyCoverageAnalysisStatus.GENERATED,
      analysisSummary:
        params.existingAnalysisSummary ||
        'Existing source-packet analysis is already linked to this daily desk decision.',
      analysisIssueCount: params.existingAnalysisIssueCount ?? null,
      analysisHasCriticalIssues: params.existingAnalysisHasCriticalIssues ?? null,
    };
  }

  try {
    const run = await loadReporterRunForDraft(params.reporterRunId);
    if (!run) {
      return {
        analysisDraftId: null,
        analysisStatus: ReporterDailyCoverageAnalysisStatus.FAILED,
        analysisSummary: 'Selected reporter run could not be loaded for source-packet analysis.',
        analysisIssueCount: null,
        analysisHasCriticalIssues: null,
      };
    }

    const { persisted, validation } = await createReporterDraftForRun({
      run,
      createdByUserId: params.createdByUserId,
      draftType: 'SOURCE_PACKET_SUMMARY',
    });

    return {
      analysisDraftId: persisted.id,
      analysisStatus: validation.hasCriticalIssues
        ? ReporterDailyCoverageAnalysisStatus.BLOCKED
        : ReporterDailyCoverageAnalysisStatus.GENERATED,
      analysisSummary: validation.hasCriticalIssues
        ? 'Source-packet analysis was generated but surfaced critical validation issues.'
        : 'Source-packet analysis was generated for the selected daily desk run.',
      analysisIssueCount: validation.issues.length,
      analysisHasCriticalIssues: validation.hasCriticalIssues,
    };
  } catch (error) {
    return {
      analysisDraftId: null,
      analysisStatus: ReporterDailyCoverageAnalysisStatus.FAILED,
      analysisSummary:
        error instanceof Error
          ? error.message
          : 'Failed to generate source-packet analysis for the selected daily desk run.',
      analysisIssueCount: null,
      analysisHasCriticalIssues: null,
    };
  }
}

async function maybeGenerateDailyCoverageArticleDraft(params: {
  reporterRunId: string;
  createdByUserId: string | null;
  existingArticleDraftId?: string | null;
  existingArticleStatus?: ReporterDailyCoverageArticleStatus | null;
  existingArticleSummary?: string | null;
  existingArticleIssueCount?: number | null;
  existingArticleHasCriticalIssues?: boolean | null;
  analysisResult: {
    analysisStatus: ReporterDailyCoverageAnalysisStatus | null;
    analysisHasCriticalIssues: boolean | null;
  };
}) {
  if (params.existingArticleDraftId) {
    return {
      articleDraftId: params.existingArticleDraftId,
      articleStatus: params.existingArticleStatus || ReporterDailyCoverageArticleStatus.GENERATED,
      articleSummary:
        params.existingArticleSummary ||
        'Existing article draft is already linked to this daily desk decision.',
      articleIssueCount: params.existingArticleIssueCount ?? null,
      articleHasCriticalIssues: params.existingArticleHasCriticalIssues ?? null,
    };
  }

  if (
    params.analysisResult.analysisStatus !== ReporterDailyCoverageAnalysisStatus.GENERATED ||
    params.analysisResult.analysisHasCriticalIssues
  ) {
    return {
      articleDraftId: null,
      articleStatus: ReporterDailyCoverageArticleStatus.SKIPPED,
      articleSummary:
        params.analysisResult.analysisStatus === ReporterDailyCoverageAnalysisStatus.BLOCKED
          ? 'Article draft generation was skipped because source-packet analysis surfaced critical validation issues.'
          : 'Article draft generation was skipped because source-packet analysis is not yet in a clean generated state.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
    };
  }

  if (!params.createdByUserId) {
    return {
      articleDraftId: null,
      articleStatus: ReporterDailyCoverageArticleStatus.FAILED,
      articleSummary: 'Article draft generation requires an authenticated editor context.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
    };
  }

  try {
    const run = await loadReporterRunForDraft(params.reporterRunId);
    if (!run) {
      return {
        articleDraftId: null,
        articleStatus: ReporterDailyCoverageArticleStatus.FAILED,
        articleSummary: 'Selected reporter run could not be loaded for article drafting.',
        articleIssueCount: null,
        articleHasCriticalIssues: null,
      };
    }

    const { persisted, validation } = await createReporterDraftForRun({
      run,
      createdByUserId: params.createdByUserId,
      draftType: 'ARTICLE_DRAFT',
    });

    return {
      articleDraftId: persisted.id,
      articleStatus: validation.hasCriticalIssues
        ? ReporterDailyCoverageArticleStatus.BLOCKED
        : ReporterDailyCoverageArticleStatus.GENERATED,
      articleSummary: validation.hasCriticalIssues
        ? 'Article draft was generated but surfaced critical validation issues.'
        : 'Article draft was generated for the selected daily desk run.',
      articleIssueCount: validation.issues.length,
      articleHasCriticalIssues: validation.hasCriticalIssues,
    };
  } catch (error) {
    return {
      articleDraftId: null,
      articleStatus: ReporterDailyCoverageArticleStatus.FAILED,
      articleSummary:
        error instanceof Error
          ? error.message
          : 'Failed to generate an article draft for the selected daily desk run.',
      articleIssueCount: null,
      articleHasCriticalIssues: null,
    };
  }
}

export async function evaluateReporterDailyCoverage(params: {
  communityId: string;
  date?: string;
  createdByUserId: string | null;
}) {
  const ensuredGoal = await ensureDailyCoverageGoal(params.communityId);
  const { decisionDate, dateKey } = normalizeDecisionDate(params.date);
  const existingDecision = await db.reporterDailyCoverageDecision.findUnique({
    where: {
      reporterDailyCoverageGoalId_decisionDate: {
        reporterDailyCoverageGoalId: ensuredGoal.id,
        decisionDate,
      },
    },
    select: dailyDecisionSelect,
  });
  const freshnessCutoff = new Date(
    decisionDate.getTime() - ensuredGoal.freshnessWindowHours * 60 * 60 * 1000
  );

  const candidates = (await listReporterStoryCandidates({
    communityId: params.communityId,
    limit: DEFAULT_DAILY_COVERAGE_LIMIT,
  }))
    .filter((candidate) => !ensuredGoal.placeId || candidate.placeId === ensuredGoal.placeId)
    .sort((left, right) => {
      const readinessDelta = getDailySelectionWeight(right) - getDailySelectionWeight(left);
      if (readinessDelta !== 0) {
        return readinessDelta;
      }
      if (right.signal.score !== left.signal.score) {
        return right.signal.score - left.signal.score;
      }
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    });

  const rejectedReasons: string[] = [];
  let selectedCandidate: ReporterStoryCandidateView | null = null;

  for (const candidate of candidates) {
    if (candidate.readiness.level === 'blocked') {
      rejectedReasons.push(`${candidate.title}: linked run is blocked.`);
      continue;
    }

    if (candidate.signal.score < ensuredGoal.minimumCandidateScore) {
      rejectedReasons.push(
        `${candidate.title}: score ${candidate.signal.score} is below the minimum ${ensuredGoal.minimumCandidateScore}.`
      );
      continue;
    }

    if (new Date(candidate.latestAt).getTime() < freshnessCutoff.getTime()) {
      rejectedReasons.push(
        `${candidate.title}: latest source activity is older than the ${ensuredGoal.freshnessWindowHours}-hour freshness window.`
      );
      continue;
    }

    if (
      candidate.readiness.level === 'needs-reporting' &&
      !ensuredGoal.allowNeedsReportingFallback
    ) {
      rejectedReasons.push(`${candidate.title}: still needs reporting follow-up.`);
      continue;
    }

    selectedCandidate = candidate;
    break;
  }

  if (!selectedCandidate) {
    const decision = await db.reporterDailyCoverageDecision.upsert({
      where: {
        reporterDailyCoverageGoalId_decisionDate: {
          reporterDailyCoverageGoalId: ensuredGoal.id,
          decisionDate,
        },
      },
      update: {
        reporterStoryCandidateId: null,
        reporterRunId: null,
        outcome: ReporterDailyCoverageDecisionOutcome.NO_PUBLISHABLE_STORY,
        summary:
          candidates.length === 0
            ? 'No current story candidates are available for the daily desk.'
            : 'No story candidate cleared the current daily coverage thresholds.',
        reasons: candidates.length === 0
          ? ['Refresh monitored-source story candidates before evaluating the daily desk.']
          : rejectedReasons.slice(0, 5),
        selectedScore: null,
        selectedReadiness: null,
        analysisDraftId: null,
        analysisStatus: null,
        analysisSummary: null,
        analysisIssueCount: null,
        analysisHasCriticalIssues: null,
        articleDraftId: null,
        articleStatus: null,
        articleSummary: null,
        articleIssueCount: null,
        articleHasCriticalIssues: null,
      },
      create: {
        reporterDailyCoverageGoalId: ensuredGoal.id,
        decisionDate,
        outcome: ReporterDailyCoverageDecisionOutcome.NO_PUBLISHABLE_STORY,
        summary:
          candidates.length === 0
            ? 'No current story candidates are available for the daily desk.'
            : 'No story candidate cleared the current daily coverage thresholds.',
        reasons: candidates.length === 0
          ? ['Refresh monitored-source story candidates before evaluating the daily desk.']
          : rejectedReasons.slice(0, 5),
      },
      select: dailyDecisionSelect,
    });

    return {
      date: dateKey,
      goal: mapGoal(ensuredGoal),
      decision: mapDecision(decision),
    } satisfies ReporterDailyCoverageDeskView;
  }

  const reporterRun = selectedCandidate.linkedReporterRun
    ? selectedCandidate.linkedReporterRun
    : await ensureReporterRunForCandidate({
        communityId: params.communityId,
        candidateId: selectedCandidate.id,
        createdByUserId: params.createdByUserId,
        decisionDateKey: dateKey,
      });

  const selectionReasons = [
    selectedCandidate.readiness.reason,
    ...selectedCandidate.signal.reasons.slice(0, 3),
  ];

  const analysisResult =
    selectedCandidate.readiness.level === 'draftable'
      ? await maybeGenerateDailyCoverageAnalysis({
          reporterRunId: reporterRun.id,
          createdByUserId: params.createdByUserId,
          existingAnalysisDraftId:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisDraft?.id || null
              : null,
          existingAnalysisStatus:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisStatus || null
              : null,
          existingAnalysisSummary:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisSummary || null
              : null,
          existingAnalysisIssueCount:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisIssueCount ?? null
              : null,
          existingAnalysisHasCriticalIssues:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisHasCriticalIssues ?? null
              : null,
        })
      : {
          analysisDraftId:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.analysisDraft?.id || null
              : null,
          analysisStatus: ReporterDailyCoverageAnalysisStatus.SKIPPED,
          analysisSummary:
            selectedCandidate.readiness.level === 'needs-reporting'
              ? 'Daily desk selected this run, but source-packet analysis was skipped because reporting follow-up is still required.'
              : 'Daily desk selected this run without auto-generating source-packet analysis.',
          analysisIssueCount: null,
          analysisHasCriticalIssues: null,
        };

  const articleResult =
    selectedCandidate.readiness.level === 'draftable'
      ? await maybeGenerateDailyCoverageArticleDraft({
          reporterRunId: reporterRun.id,
          createdByUserId: params.createdByUserId,
          existingArticleDraftId:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleDraft?.id || null
              : null,
          existingArticleStatus:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleStatus || null
              : null,
          existingArticleSummary:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleSummary || null
              : null,
          existingArticleIssueCount:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleIssueCount ?? null
              : null,
          existingArticleHasCriticalIssues:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleHasCriticalIssues ?? null
              : null,
          analysisResult,
        })
      : {
          articleDraftId:
            existingDecision?.reporterRun?.id === reporterRun.id
              ? existingDecision.articleDraft?.id || null
              : null,
          articleStatus: ReporterDailyCoverageArticleStatus.SKIPPED,
          articleSummary:
            'Article draft generation was skipped because the selected run is not yet draftable.',
          articleIssueCount: null,
          articleHasCriticalIssues: null,
        };

  const decision = await db.reporterDailyCoverageDecision.upsert({
    where: {
      reporterDailyCoverageGoalId_decisionDate: {
        reporterDailyCoverageGoalId: ensuredGoal.id,
        decisionDate,
      },
    },
    update: {
      reporterStoryCandidateId: selectedCandidate.id,
      reporterRunId: reporterRun.id,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: `${selectedCandidate.title} selected for the daily desk.`,
      reasons: selectionReasons,
      selectedScore: selectedCandidate.signal.score,
      selectedReadiness: selectedCandidate.readiness.level,
      analysisDraftId: analysisResult.analysisDraftId,
      analysisStatus: analysisResult.analysisStatus,
      analysisSummary: analysisResult.analysisSummary,
      analysisIssueCount: analysisResult.analysisIssueCount,
      analysisHasCriticalIssues: analysisResult.analysisHasCriticalIssues,
      articleDraftId: articleResult.articleDraftId,
      articleStatus: articleResult.articleStatus,
      articleSummary: articleResult.articleSummary,
      articleIssueCount: articleResult.articleIssueCount,
      articleHasCriticalIssues: articleResult.articleHasCriticalIssues,
    },
    create: {
      reporterDailyCoverageGoalId: ensuredGoal.id,
      reporterStoryCandidateId: selectedCandidate.id,
      reporterRunId: reporterRun.id,
      decisionDate,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: `${selectedCandidate.title} selected for the daily desk.`,
      reasons: selectionReasons,
      selectedScore: selectedCandidate.signal.score,
      selectedReadiness: selectedCandidate.readiness.level,
      analysisDraftId: analysisResult.analysisDraftId,
      analysisStatus: analysisResult.analysisStatus,
      analysisSummary: analysisResult.analysisSummary,
      analysisIssueCount: analysisResult.analysisIssueCount,
      analysisHasCriticalIssues: analysisResult.analysisHasCriticalIssues,
      articleDraftId: articleResult.articleDraftId,
      articleStatus: articleResult.articleStatus,
      articleSummary: articleResult.articleSummary,
      articleIssueCount: articleResult.articleIssueCount,
      articleHasCriticalIssues: articleResult.articleHasCriticalIssues,
    },
    select: dailyDecisionSelect,
  });

  return {
    date: dateKey,
    goal: mapGoal(ensuredGoal),
    decision: mapDecision(decision),
  } satisfies ReporterDailyCoverageDeskView;
}
