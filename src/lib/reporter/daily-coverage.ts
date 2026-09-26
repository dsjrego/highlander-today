import {
  type ReporterMonitoredSourceType,
  type ReporterCandidateType,
  type ReporterCoverageScope,
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
const DEFAULT_DAILY_ARTICLE_TARGET = 3;
const MAX_DAILY_PRODUCTION_ATTEMPTS = 8;
const COVERAGE_SCOPE_LOCAL = 'LOCAL' as ReporterCoverageScope;
const COVERAGE_SCOPE_COUNTY = 'COUNTY' as ReporterCoverageScope;
const COVERAGE_SCOPE_STATE = 'STATE' as ReporterCoverageScope;
const COVERAGE_SCOPE_NATIONAL = 'NATIONAL' as ReporterCoverageScope;
const CANDIDATE_TYPE_ARTICLE_ONLY = 'ARTICLE_ONLY' as ReporterCandidateType;
const CANDIDATE_TYPE_EVENT_ONLY = 'EVENT_ONLY' as ReporterCandidateType;
const CANDIDATE_TYPE_EVENT_AND_ARTICLE = 'EVENT_AND_ARTICLE' as ReporterCandidateType;
const DEFAULT_PRIORITY_COVERAGE_SCOPES = [COVERAGE_SCOPE_LOCAL];

const PRIMARY_MONITORED_SOURCE_TYPES = new Set<ReporterMonitoredSourceType>([
  'MUNICIPAL_AGENDA',
  'MUNICIPAL_MINUTES',
  'MUNICIPAL_NOTICES',
  'COUNTY_UPDATES',
  'SCHOOL_BOARD',
  'SCHOOL_ANNOUNCEMENTS',
  'PUBLIC_SAFETY',
]);

const HIGH_CONFIDENCE_MONITORED_SOURCE_TYPES = new Set<ReporterMonitoredSourceType>([
  'EVENT_CALENDAR',
  'COMMUNITY_CALENDAR',
  'PARKS_AND_REC',
  'LIBRARY_EVENTS',
  'SCHOOL_CALENDAR',
  'VENUE_CALENDAR',
  'PRESS_RELEASE',
]);

function sourceProfileForMonitoredSource(sourceType: ReporterMonitoredSourceType) {
  if (PRIMARY_MONITORED_SOURCE_TYPES.has(sourceType)) {
    return { sourceType: 'OFFICIAL_URL' as const, reliabilityTier: 'PRIMARY' as const };
  }

  if (HIGH_CONFIDENCE_MONITORED_SOURCE_TYPES.has(sourceType)) {
    return { sourceType: 'OFFICIAL_URL' as const, reliabilityTier: 'HIGH' as const };
  }

  if (sourceType === 'LOCAL_NEWSROOM') {
    return { sourceType: 'NEWS_ARTICLE' as const, reliabilityTier: 'MEDIUM' as const };
  }

  if (sourceType === 'COMMUNITY_BULLETIN') {
    return { sourceType: 'NEWS_ARTICLE' as const, reliabilityTier: 'LOW' as const };
  }

  return { sourceType: 'NEWS_ARTICLE' as const, reliabilityTier: 'UNVERIFIED' as const };
}

export type ReporterDailyCoverageGoalView = {
  id: string;
  placeId: string | null;
  placeName: string | null;
  label: string | null;
  targetArticleCount: number;
  priorityCoverageScopes: ReporterCoverageScope[];
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
  items: ReporterDailyCoverageItemView[];
  readyCount: number;
  blockedCount: number;
  attemptedCount: number;
  updatedAt: Date;
};

export type ReporterDailyCoverageItemView = {
  id: string;
  rank: number;
  status: 'ready-for-editor' | 'blocked' | 'needs-reporting' | 'failed' | 'selected';
  statusLabel: string;
  summary: string;
  reasons: string[];
  selectedScore: number | null;
  selectedReadiness: string | null;
  analysisStatus: ReporterDailyCoverageDecisionView['analysisStatus'];
  analysisStatusLabel: string | null;
  analysisSummary: string | null;
  analysisIssueCount: number | null;
  analysisHasCriticalIssues: boolean | null;
  analysisDraft: ReporterDailyCoverageDecisionView['analysisDraft'];
  articleStatus: ReporterDailyCoverageDecisionView['articleStatus'];
  articleStatusLabel: string | null;
  articleSummary: string | null;
  articleIssueCount: number | null;
  articleHasCriticalIssues: boolean | null;
  articleDraft: ReporterDailyCoverageDecisionView['articleDraft'];
  storyCandidate: ReporterDailyCoverageDecisionView['storyCandidate'];
  reporterRun: ReporterDailyCoverageDecisionView['reporterRun'];
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

function itemStatusLabel(status: string) {
  switch (status) {
    case 'READY_FOR_EDITOR':
      return 'Ready for Editor';
    case 'BLOCKED':
      return 'Blocked';
    case 'NEEDS_REPORTING':
      return 'Needs Reporting';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Selected';
  }
}

function normalizeCoverageScope(value: ReporterCoverageScope | string | null | undefined) {
  if (
    value === COVERAGE_SCOPE_LOCAL ||
    value === COVERAGE_SCOPE_COUNTY ||
    value === COVERAGE_SCOPE_STATE ||
    value === COVERAGE_SCOPE_NATIONAL
  ) {
    return value;
  }

  return COVERAGE_SCOPE_LOCAL;
}

function normalizeCoverageScopes(values: Array<ReporterCoverageScope | string> | null | undefined) {
  const scopes = Array.from(new Set((values || []).map(normalizeCoverageScope)));
  return scopes.length ? scopes : [...DEFAULT_PRIORITY_COVERAGE_SCOPES];
}

function candidateMatchesPriorityScopes(
  candidate: ReporterStoryCandidateView,
  priorityCoverageScopes: ReporterCoverageScope[]
) {
  const candidateScopes = normalizeCoverageScopes(candidate.coverageScopes);
  return candidateScopes.some((scope) => priorityCoverageScopes.includes(scope));
}

function candidateIsArticleEligible(candidate: ReporterStoryCandidateView) {
  return (
    candidate.candidateType === CANDIDATE_TYPE_ARTICLE_ONLY ||
    candidate.candidateType === CANDIDATE_TYPE_EVENT_AND_ARTICLE
  );
}

function formatCoverageScopes(scopes: ReporterCoverageScope[]) {
  return scopes
    .map((scope) => scope.charAt(0) + scope.slice(1).toLowerCase())
    .join(', ');
}

function mapGoal(goal: {
  id: string;
  label: string | null;
  targetArticleCount: number;
  priorityCoverageScopes?: Array<ReporterCoverageScope | string> | null;
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
    priorityCoverageScopes: normalizeCoverageScopes(goal.priorityCoverageScopes),
    minimumCandidateScore: goal.minimumCandidateScore,
    freshnessWindowHours: goal.freshnessWindowHours,
    allowNeedsReportingFallback: goal.allowNeedsReportingFallback,
    isActive: goal.isActive,
    updatedAt: goal.updatedAt,
  };
}

type DailyCoverageItemRecord = {
  id: string;
  rank: number;
  status: string;
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
};

function mapCoverageItem(item: DailyCoverageItemRecord): ReporterDailyCoverageItemView {
  return {
    ...item,
    status: item.status.toLowerCase().replace(/_/g, '-') as ReporterDailyCoverageItemView['status'],
    statusLabel: itemStatusLabel(item.status),
    analysisStatus: item.analysisStatus
      ? item.analysisStatus.toLowerCase() as ReporterDailyCoverageDecisionView['analysisStatus']
      : null,
    analysisStatusLabel: analysisStatusLabel(item.analysisStatus),
    articleStatus: item.articleStatus
      ? item.articleStatus.toLowerCase() as ReporterDailyCoverageDecisionView['articleStatus']
      : null,
    articleStatusLabel: articleStatusLabel(item.articleStatus),
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
  items?: DailyCoverageItemRecord[];
}): ReporterDailyCoverageDecisionView {
  const items = decision.items?.map(mapCoverageItem) || [];
  const compatibilityItems = items.length || !decision.storyCandidate
    ? items
    : [mapCoverageItem({
        id: `${decision.id}-lead`,
        rank: 1,
        status:
          decision.articleStatus === ReporterDailyCoverageArticleStatus.GENERATED &&
          !decision.articleHasCriticalIssues
            ? 'READY_FOR_EDITOR'
            : decision.analysisStatus === ReporterDailyCoverageAnalysisStatus.BLOCKED ||
                decision.articleStatus === ReporterDailyCoverageArticleStatus.BLOCKED
              ? 'BLOCKED'
              : decision.analysisStatus === ReporterDailyCoverageAnalysisStatus.FAILED ||
                  decision.articleStatus === ReporterDailyCoverageArticleStatus.FAILED
                ? 'FAILED'
                : decision.selectedReadiness === 'needs-reporting'
                  ? 'NEEDS_REPORTING'
                  : 'SELECTED',
        summary: decision.summary,
        reasons: decision.reasons,
        selectedScore: decision.selectedScore,
        selectedReadiness: decision.selectedReadiness,
        analysisStatus: decision.analysisStatus,
        analysisSummary: decision.analysisSummary,
        analysisIssueCount: decision.analysisIssueCount,
        analysisHasCriticalIssues: decision.analysisHasCriticalIssues,
        analysisDraft: decision.analysisDraft,
        articleStatus: decision.articleStatus,
        articleSummary: decision.articleSummary,
        articleIssueCount: decision.articleIssueCount,
        articleHasCriticalIssues: decision.articleHasCriticalIssues,
        articleDraft: decision.articleDraft,
        storyCandidate: decision.storyCandidate,
        reporterRun: decision.reporterRun,
        updatedAt: decision.updatedAt,
      })];

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
    items: compatibilityItems,
    readyCount: compatibilityItems.filter((item) => item.status === 'ready-for-editor').length,
    blockedCount: compatibilityItems.filter((item) =>
      item.status === 'blocked' || item.status === 'failed'
    ).length,
    attemptedCount: compatibilityItems.length,
    updatedAt: decision.updatedAt,
  };
}

const dailyGoalSelect = {
  id: true,
  placeId: true,
  label: true,
  targetArticleCount: true,
  priorityCoverageScopes: true,
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
  items: {
    orderBy: { rank: 'asc' as const },
    select: {
      id: true,
      rank: true,
      status: true,
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
      analysisDraft: { select: { id: true, draftType: true } },
      articleDraft: { select: { id: true, draftType: true } },
      storyCandidate: { select: { id: true, title: true } },
      reporterRun: {
        select: { id: true, title: true, topic: true, status: true },
      },
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
      targetArticleCount: DEFAULT_DAILY_ARTICLE_TARGET,
      priorityCoverageScopes: [...DEFAULT_PRIORITY_COVERAGE_SCOPES],
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
                  sourceType: true,
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
    initialSources: candidate.candidateItems.map(({ ingestionItem }) => {
      const sourceProfile = sourceProfileForMonitoredSource(
        ingestionItem.monitoredSource.sourceType
      );

      return {
        sourceType: sourceProfile.sourceType,
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
        reliabilityTier: sourceProfile.reliabilityTier,
      };
    }),
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
  priorityCoverageScopes?: Array<ReporterCoverageScope | string>;
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
      priorityCoverageScopes:
        params.priorityCoverageScopes === undefined
          ? undefined
          : normalizeCoverageScopes(params.priorityCoverageScopes),
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
      targetArticleCount: params.targetArticleCount ?? DEFAULT_DAILY_ARTICLE_TARGET,
      priorityCoverageScopes: normalizeCoverageScopes(params.priorityCoverageScopes),
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
  const priorityCoverageScopes = normalizeCoverageScopes(ensuredGoal.priorityCoverageScopes);

  if (!ensuredGoal.isActive) {
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
        summary: 'The daily coverage desk is inactive.',
        reasons: ['Activate the daily coverage goal before running the desk.'],
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
        summary: 'The daily coverage desk is inactive.',
        reasons: ['Activate the daily coverage goal before running the desk.'],
      },
      select: dailyDecisionSelect,
    });

    return {
      date: dateKey,
      goal: mapGoal(ensuredGoal),
      decision: mapDecision(decision),
    } satisfies ReporterDailyCoverageDeskView;
  }

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
  const eligibleCandidates: ReporterStoryCandidateView[] = [];

  for (const candidate of candidates) {
    if (!candidateIsArticleEligible(candidate)) {
      rejectedReasons.push(
        `${candidate.title}: classified as ${
          candidate.candidateType === CANDIDATE_TYPE_EVENT_ONLY ? 'event-only' : 'neither article nor event lead'
        } for the article desk.`
      );
      continue;
    }

    if (!candidateMatchesPriorityScopes(candidate, priorityCoverageScopes)) {
      rejectedReasons.push(
        `${candidate.title}: outside priority scope${priorityCoverageScopes.length === 1 ? '' : 's'} ${formatCoverageScopes(priorityCoverageScopes)}.`
      );
      continue;
    }

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

    eligibleCandidates.push(candidate);
  }

  if (!eligibleCandidates.length) {
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
            ? 'No recent monitored-source items produced an active story candidate.'
            : 'No story candidate cleared the current daily coverage thresholds.',
        reasons: candidates.length === 0
          ? ['No active candidate met the desk after the monitored-source refresh.']
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
            ? 'No recent monitored-source items produced an active story candidate.'
            : 'No story candidate cleared the current daily coverage thresholds.',
        reasons: candidates.length === 0
          ? ['No active candidate met the desk after the monitored-source refresh.']
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

  const firstCandidate = eligibleCandidates[0];
  const edition = await db.reporterDailyCoverageDecision.upsert({
    where: {
      reporterDailyCoverageGoalId_decisionDate: {
        reporterDailyCoverageGoalId: ensuredGoal.id,
        decisionDate,
      },
    },
    update: {
      reporterStoryCandidateId: firstCandidate.id,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: `Producing up to ${ensuredGoal.targetArticleCount} morning drafts.`,
      reasons: rejectedReasons.slice(0, 5),
    },
    create: {
      reporterDailyCoverageGoalId: ensuredGoal.id,
      reporterStoryCandidateId: firstCandidate.id,
      decisionDate,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: `Producing up to ${ensuredGoal.targetArticleCount} morning drafts.`,
      reasons: rejectedReasons.slice(0, 5),
    },
    select: dailyDecisionSelect,
  });

  type AnalysisProductionResult = {
    analysisDraftId: string | null;
    analysisStatus: ReporterDailyCoverageAnalysisStatus;
    analysisSummary: string;
    analysisIssueCount: number | null;
    analysisHasCriticalIssues: boolean | null;
  };
  type ArticleProductionResult = {
    articleDraftId: string | null;
    articleStatus: ReporterDailyCoverageArticleStatus;
    articleSummary: string;
    articleIssueCount: number | null;
    articleHasCriticalIssues: boolean | null;
  };
  type ProductionAttempt = {
    candidate: ReporterStoryCandidateView;
    reporterRun: ReporterDailyCoverageDecisionView['reporterRun'];
    reasons: string[];
    status: 'READY_FOR_EDITOR' | 'BLOCKED' | 'NEEDS_REPORTING' | 'FAILED' | 'SELECTED';
    analysisResult: AnalysisProductionResult;
    articleResult: ArticleProductionResult;
  };

  const attempts: ProductionAttempt[] = [];
  let readyCount = 0;
  const candidatesToAttempt = eligibleCandidates.slice(0, MAX_DAILY_PRODUCTION_ATTEMPTS);

  for (const [index, selectedCandidate] of candidatesToAttempt.entries()) {
    if (readyCount >= ensuredGoal.targetArticleCount) {
      break;
    }

    const existingItem = existingDecision?.items?.find(
      (item) => item.storyCandidate?.id === selectedCandidate.id
    );
    let reporterRun: ReporterDailyCoverageDecisionView['reporterRun'] =
      selectedCandidate.linkedReporterRun;
    let productionCandidate = selectedCandidate;

    try {
      if (!reporterRun) {
        reporterRun = await ensureReporterRunForCandidate({
          communityId: params.communityId,
          candidateId: selectedCandidate.id,
          createdByUserId: params.createdByUserId,
          decisionDateKey: dateKey,
        });
        const refreshedCandidates = await listReporterStoryCandidates({
          communityId: params.communityId,
          limit: DEFAULT_DAILY_COVERAGE_LIMIT,
        });
        productionCandidate =
          refreshedCandidates.find((candidate) => candidate.id === selectedCandidate.id) ||
          selectedCandidate;
      }
    } catch (error) {
      const summary = error instanceof Error ? error.message : 'Failed to prepare the reporter run.';
      await db.reporterDailyCoverageItem.upsert({
        where: {
          reporterDailyCoverageDecisionId_reporterStoryCandidateId: {
            reporterDailyCoverageDecisionId: edition.id,
            reporterStoryCandidateId: selectedCandidate.id,
          },
        },
        update: { rank: index + 1, status: 'FAILED', summary },
        create: {
          reporterDailyCoverageDecisionId: edition.id,
          reporterStoryCandidateId: selectedCandidate.id,
          rank: index + 1,
          status: 'FAILED',
          summary,
          selectedScore: selectedCandidate.signal.score,
          selectedReadiness: selectedCandidate.readiness.level,
        },
      });
      attempts.push({
        candidate: selectedCandidate,
        reporterRun: null,
        reasons: [summary],
        status: 'FAILED',
        analysisResult: {
          analysisDraftId: null,
          analysisStatus: ReporterDailyCoverageAnalysisStatus.FAILED,
          analysisSummary: summary,
          analysisIssueCount: null,
          analysisHasCriticalIssues: null,
        },
        articleResult: {
          articleDraftId: null,
          articleStatus: ReporterDailyCoverageArticleStatus.SKIPPED,
          articleSummary: 'Article generation was skipped because the reporter run could not be prepared.',
          articleIssueCount: null,
          articleHasCriticalIssues: null,
        },
      });
      continue;
    }

    if (!reporterRun) {
      continue;
    }

    const selectionReasons = [
      `Priority scope match: ${formatCoverageScopes(
        normalizeCoverageScopes(productionCandidate.coverageScopes).filter((scope) =>
          priorityCoverageScopes.includes(scope)
        )
      )}.`,
      productionCandidate.readiness.reason,
      ...productionCandidate.signal.reasons.slice(0, 3),
    ];

    const legacyItemMatchesRun = existingDecision?.reporterRun?.id === reporterRun.id;
    const analysisResult =
      productionCandidate.readiness.level === 'draftable'
        ? await maybeGenerateDailyCoverageAnalysis({
            reporterRunId: reporterRun.id,
            createdByUserId: params.createdByUserId,
            existingAnalysisDraftId:
              existingItem?.analysisDraft?.id ||
              (legacyItemMatchesRun ? existingDecision?.analysisDraft?.id : null),
            existingAnalysisStatus:
              existingItem?.analysisStatus ||
              (legacyItemMatchesRun ? existingDecision?.analysisStatus : null),
            existingAnalysisSummary:
              existingItem?.analysisSummary ||
              (legacyItemMatchesRun ? existingDecision?.analysisSummary : null),
            existingAnalysisIssueCount:
              existingItem?.analysisIssueCount ??
              (legacyItemMatchesRun ? existingDecision?.analysisIssueCount : null),
            existingAnalysisHasCriticalIssues:
              existingItem?.analysisHasCriticalIssues ??
              (legacyItemMatchesRun ? existingDecision?.analysisHasCriticalIssues : null),
          })
        : {
            analysisDraftId: existingItem?.analysisDraft?.id || null,
            analysisStatus: ReporterDailyCoverageAnalysisStatus.SKIPPED,
            analysisSummary:
              productionCandidate.readiness.level === 'needs-reporting'
                ? 'Reporting follow-up is still required before this story can be drafted.'
                : 'Source-packet analysis was not generated because this run is not draftable.',
            analysisIssueCount: null,
            analysisHasCriticalIssues: null,
          };

    const articleResult =
      productionCandidate.readiness.level === 'draftable'
        ? await maybeGenerateDailyCoverageArticleDraft({
            reporterRunId: reporterRun.id,
            createdByUserId: params.createdByUserId,
            existingArticleDraftId:
              existingItem?.articleDraft?.id ||
              (legacyItemMatchesRun ? existingDecision?.articleDraft?.id : null),
            existingArticleStatus:
              existingItem?.articleStatus ||
              (legacyItemMatchesRun ? existingDecision?.articleStatus : null),
            existingArticleSummary:
              existingItem?.articleSummary ||
              (legacyItemMatchesRun ? existingDecision?.articleSummary : null),
            existingArticleIssueCount:
              existingItem?.articleIssueCount ??
              (legacyItemMatchesRun ? existingDecision?.articleIssueCount : null),
            existingArticleHasCriticalIssues:
              existingItem?.articleHasCriticalIssues ??
              (legacyItemMatchesRun ? existingDecision?.articleHasCriticalIssues : null),
            analysisResult,
          })
        : {
            articleDraftId: existingItem?.articleDraft?.id || null,
            articleStatus: ReporterDailyCoverageArticleStatus.SKIPPED,
            articleSummary: 'Article generation was skipped because this run needs more reporting.',
            articleIssueCount: null,
            articleHasCriticalIssues: null,
          };

    const status: ProductionAttempt['status'] =
      articleResult.articleStatus === ReporterDailyCoverageArticleStatus.GENERATED &&
      !articleResult.articleHasCriticalIssues
        ? 'READY_FOR_EDITOR'
        : analysisResult.analysisStatus === ReporterDailyCoverageAnalysisStatus.BLOCKED ||
            articleResult.articleStatus === ReporterDailyCoverageArticleStatus.BLOCKED
          ? 'BLOCKED'
          : analysisResult.analysisStatus === ReporterDailyCoverageAnalysisStatus.FAILED ||
              articleResult.articleStatus === ReporterDailyCoverageArticleStatus.FAILED
            ? 'FAILED'
            : productionCandidate.readiness.level === 'needs-reporting'
              ? 'NEEDS_REPORTING'
              : 'SELECTED';

    const summary = status === 'READY_FOR_EDITOR'
      ? `${productionCandidate.title} is ready for editor review.`
      : status === 'NEEDS_REPORTING'
        ? `${productionCandidate.title} needs more reporting.`
        : `${productionCandidate.title} did not produce a clean editor-ready draft.`;

    await db.reporterDailyCoverageItem.upsert({
      where: {
        reporterDailyCoverageDecisionId_reporterStoryCandidateId: {
          reporterDailyCoverageDecisionId: edition.id,
          reporterStoryCandidateId: selectedCandidate.id,
        },
      },
      update: {
        reporterRunId: reporterRun.id,
        rank: index + 1,
        status,
        summary,
        reasons: selectionReasons,
        selectedScore: productionCandidate.signal.score,
        selectedReadiness: productionCandidate.readiness.level,
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
        reporterDailyCoverageDecisionId: edition.id,
        reporterStoryCandidateId: selectedCandidate.id,
        reporterRunId: reporterRun.id,
        rank: index + 1,
        status,
        summary,
        reasons: selectionReasons,
        selectedScore: productionCandidate.signal.score,
        selectedReadiness: productionCandidate.readiness.level,
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
    });

    attempts.push({
      candidate: productionCandidate,
      reporterRun,
      reasons: selectionReasons,
      status,
      analysisResult,
      articleResult,
    });
    if (status === 'READY_FOR_EDITOR') {
      readyCount += 1;
    }
  }

  const leadAttempt = attempts.find((attempt) => attempt.status === 'READY_FOR_EDITOR') || attempts[0];
  const blockedCount = attempts.filter(
    (attempt) => attempt.status === 'BLOCKED' || attempt.status === 'FAILED'
  ).length;
  const finalSummary = readyCount
    ? `${readyCount} of ${ensuredGoal.targetArticleCount} morning draft${readyCount === 1 ? '' : 's'} ready for editor review.`
    : `${attempts.length} candidate${attempts.length === 1 ? '' : 's'} attempted; no clean draft is ready for publication review.`;

  const decision = await db.reporterDailyCoverageDecision.upsert({
    where: {
      reporterDailyCoverageGoalId_decisionDate: {
        reporterDailyCoverageGoalId: ensuredGoal.id,
        decisionDate,
      },
    },
    update: {
      reporterStoryCandidateId: leadAttempt?.candidate.id || firstCandidate.id,
      reporterRunId: leadAttempt?.reporterRun?.id || null,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: finalSummary,
      reasons: leadAttempt?.reasons || rejectedReasons.slice(0, 5),
      selectedScore: leadAttempt?.candidate.signal.score || null,
      selectedReadiness: leadAttempt?.candidate.readiness.level || null,
      analysisDraftId: leadAttempt?.analysisResult.analysisDraftId || null,
      analysisStatus: leadAttempt?.analysisResult.analysisStatus || null,
      analysisSummary: leadAttempt?.analysisResult.analysisSummary || null,
      analysisIssueCount: leadAttempt?.analysisResult.analysisIssueCount ?? null,
      analysisHasCriticalIssues: leadAttempt?.analysisResult.analysisHasCriticalIssues ?? null,
      articleDraftId: leadAttempt?.articleResult.articleDraftId || null,
      articleStatus: leadAttempt?.articleResult.articleStatus || null,
      articleSummary: leadAttempt?.articleResult.articleSummary || null,
      articleIssueCount: leadAttempt?.articleResult.articleIssueCount ?? null,
      articleHasCriticalIssues: leadAttempt?.articleResult.articleHasCriticalIssues ?? null,
    },
    create: {
      reporterDailyCoverageGoalId: ensuredGoal.id,
      reporterStoryCandidateId: leadAttempt?.candidate.id || firstCandidate.id,
      reporterRunId: leadAttempt?.reporterRun?.id || null,
      decisionDate,
      outcome: ReporterDailyCoverageDecisionOutcome.SELECTED_CANDIDATE,
      summary: finalSummary,
      reasons: leadAttempt?.reasons || rejectedReasons.slice(0, 5),
      selectedScore: leadAttempt?.candidate.signal.score || null,
      selectedReadiness: leadAttempt?.candidate.readiness.level || null,
      analysisDraftId: leadAttempt?.analysisResult.analysisDraftId || null,
      analysisStatus: leadAttempt?.analysisResult.analysisStatus || null,
      analysisSummary: leadAttempt?.analysisResult.analysisSummary || null,
      analysisIssueCount: leadAttempt?.analysisResult.analysisIssueCount ?? null,
      analysisHasCriticalIssues: leadAttempt?.analysisResult.analysisHasCriticalIssues ?? null,
      articleDraftId: leadAttempt?.articleResult.articleDraftId || null,
      articleStatus: leadAttempt?.articleResult.articleStatus || null,
      articleSummary: leadAttempt?.articleResult.articleSummary || null,
      articleIssueCount: leadAttempt?.articleResult.articleIssueCount ?? null,
      articleHasCriticalIssues: leadAttempt?.articleResult.articleHasCriticalIssues ?? null,
    },
    select: dailyDecisionSelect,
  });

  const mappedDecision = mapDecision(decision);
  if (!decision.items?.length && attempts.length > 1) {
    mappedDecision.items = attempts.map((attempt, index) => mapCoverageItem({
      id: `${decision.id}-${attempt.candidate.id}`,
      rank: index + 1,
      status: attempt.status,
      summary: attempt.status === 'READY_FOR_EDITOR'
        ? `${attempt.candidate.title} is ready for editor review.`
        : `${attempt.candidate.title} did not produce a clean editor-ready draft.`,
      reasons: attempt.reasons,
      selectedScore: attempt.candidate.signal.score,
      selectedReadiness: attempt.candidate.readiness.level,
      analysisStatus: attempt.analysisResult.analysisStatus,
      analysisSummary: attempt.analysisResult.analysisSummary,
      analysisIssueCount: attempt.analysisResult.analysisIssueCount,
      analysisHasCriticalIssues: attempt.analysisResult.analysisHasCriticalIssues,
      analysisDraft: attempt.analysisResult.analysisDraftId
        ? { id: attempt.analysisResult.analysisDraftId, draftType: 'SOURCE_PACKET_SUMMARY' }
        : null,
      articleStatus: attempt.articleResult.articleStatus,
      articleSummary: attempt.articleResult.articleSummary,
      articleIssueCount: attempt.articleResult.articleIssueCount,
      articleHasCriticalIssues: attempt.articleResult.articleHasCriticalIssues,
      articleDraft: attempt.articleResult.articleDraftId
        ? { id: attempt.articleResult.articleDraftId, draftType: 'ARTICLE_DRAFT' }
        : null,
      storyCandidate: { id: attempt.candidate.id, title: attempt.candidate.title },
      reporterRun: attempt.reporterRun,
      updatedAt: decision.updatedAt,
    }));
    mappedDecision.readyCount = readyCount;
    mappedDecision.blockedCount = blockedCount;
    mappedDecision.attemptedCount = attempts.length;
  }

  return {
    date: dateKey,
    goal: mapGoal(ensuredGoal),
    decision: mappedDecision,
  } satisfies ReporterDailyCoverageDeskView;
}
