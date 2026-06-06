'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import { formatEventDateInput, formatEventTimeInput } from '@/lib/event-datetime';
import { formatLocationPrimary, formatLocationSearchLabel, formatLocationSecondary } from '@/lib/location-format';
import {
  REPORTER_COVERAGE_SCOPE_OPTIONS,
  REPORTER_MONITORED_SOURCE_EXECUTION_LANE_OPTIONS,
  REPORTER_MONITORED_SOURCE_FORMAT_OPTIONS,
  REPORTER_MONITORED_SOURCE_STATUS_OPTIONS,
  REPORTER_MONITORED_SOURCE_TYPE_OPTIONS,
  formatReporterMonitoredSourceEnumLabel,
  getReporterMonitoredSourceHealth,
} from '@/lib/reporter/monitored-sources';
import {
  findReporterTenantKeywordMatches,
  parseReporterTenantKeywords,
} from '@/lib/reporter/tenant-keywords';
import type { ReporterStoryCandidateView } from '@/lib/reporter/story-candidates';
import type { ReporterDailyCoverageDeskView, ReporterDailyCoverageDecisionView, ReporterDailyCoverageGoalView } from '@/lib/reporter/daily-coverage';

const TipTapEditor = dynamic(() => import('@/components/articles/TipTapEditor'), {
  ssr: false,
});

type CoveragePlaceOption = {
  id: string;
  displayName: string;
  slug: string;
  type: string;
};

type ReporterMonitoredSourceRow = {
  id: string;
  communityId: string;
  label: string;
  sourceType: string;
  sourceFormat: string;
  executionLane: string;
  coverageScope: string;
  url: string;
  publisher: string | null;
  notes: string | null;
  status: string;
  fetchFrequencyMinutes: number;
  lastFetchedAt: string | Date | null;
  lastSuccessfulAt: string | Date | null;
  lastChangedAt: string | Date | null;
  lastErrorAt: string | Date | null;
  lastErrorMessage: string | null;
  lastHttpStatus: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  place: CoveragePlaceOption | null;
  _count: {
    fetches: number;
    ingestionItems: number;
  };
  fetches: Array<{
    id: string;
    status: string;
    startedAt: string | Date;
    completedAt: string | Date | null;
    httpStatus: number | null;
    itemCount: number;
    newItemCount: number;
    changedItemCount: number;
    errorMessage: string | null;
  }>;
  ingestionItems: Array<{
    id: string;
    title: string;
    canonicalUrl: string | null;
    publishedAt: string | Date | null;
    firstSeenAt: string | Date;
    lastSeenAt: string | Date;
    publisher: string | null;
    excerpt: string | null;
  }>;
};

interface ReporterMonitoredSourcesClientProps {
  sources: ReporterMonitoredSourceRow[];
  coveragePlaces: CoveragePlaceOption[];
  reporterRuns: Array<{
    id: string;
    topic: string;
    title: string | null;
    status: string;
  }>;
  tenantKeywordsText: string;
  storyCandidates: ReporterStoryCandidateView[];
  dailyCoverageDesk: ReporterDailyCoverageDeskView;
  eventLocations: Array<{
    id: string;
    name: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  }>;
  eventOrganizations: Array<{
    id: string;
    name: string;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  }>;
}

type DailyCoverageGoalFormState = {
  placeId: string;
  label: string;
  targetArticleCount: string;
  minimumCandidateScore: string;
  freshnessWindowHours: string;
  priorityCoverageScopes: string[];
  allowNeedsReportingFallback: boolean;
};

type AttachDialogState =
  | {
      source: ReporterMonitoredSourceRow;
      item: ReporterMonitoredSourceRow['ingestionItems'][number];
    }
  | null;

type MonitoredIngestionStoryItem = {
  id: string;
  title: string;
  canonicalUrl: string | null;
  publishedAt: string | Date | null;
  firstSeenAt: string | Date;
  lastSeenAt: string | Date;
  publisher: string | null;
  excerpt: string | null;
  sourceId: string;
  sourceLabel: string;
  sourceCoverageScope: string;
  sourcePlaceName: string | null;
};

type StorySignalAssessment = {
  level: 'likely' | 'possible' | 'low';
  score: number;
  reasons: string[];
};

type CandidateFilterKey = 'all' | 'unclaimed' | 'draftable' | 'needs-reporting' | 'blocked';

type DraftEventDialogState = {
  candidateId: string;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  venueLabel: string;
  imageUrl: string;
  sourceUrl: string;
  locationId: string;
  organizationId: string;
} | null;

const STATUS_OPTIONS = ['ALL', ...REPORTER_MONITORED_SOURCE_STATUS_OPTIONS] as const;
const SCOPE_FILTER_OPTIONS = ['ALL', ...REPORTER_COVERAGE_SCOPE_OPTIONS] as const;

const EMPTY_CREATE_FORM = {
  label: '',
  sourceType: 'MUNICIPAL_NOTICES',
  sourceFormat: 'HTML',
  executionLane: 'SERVER_FETCH',
  coverageScope: 'LOCAL',
  url: '',
  publisher: '',
  notes: '',
  placeId: '',
  fetchFrequencyHours: '24',
};

const STORY_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'this',
  'to',
  'was',
  'will',
  'with',
]);

const CIVIC_SIGNAL_TERMS = [
  'board',
  'budget',
  'council',
  'court',
  'election',
  'emergency',
  'fire',
  'hearing',
  'lawsuit',
  'meeting',
  'police',
  'road',
  'school',
  'shutdown',
  'tax',
  'vote',
  'water',
  'zoning',
] as const;

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(value?: string | Date | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCadence(minutes: number) {
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return `Every ${days} day${days === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Every ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `Every ${minutes} min`;
}

function healthTone(source: ReporterMonitoredSourceRow): 'ok' | 'pend' | 'bad' | 'neu' {
  const health = getReporterMonitoredSourceHealth(source);
  if (health === 'healthy') return 'ok';
  if (health === 'failing') return 'bad';
  if (health === 'stale' || health === 'new') return 'pend';
  return 'neu';
}

function healthLabel(source: ReporterMonitoredSourceRow) {
  return formatReporterMonitoredSourceEnumLabel(getReporterMonitoredSourceHealth(source));
}

function formatApiErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const record = data as {
    error?: unknown;
    details?: Array<{ path?: Array<string | number>; message?: unknown }>;
  };

  const base =
    typeof record.error === 'string' && record.error.trim() ? record.error.trim() : fallback;

  if (!Array.isArray(record.details) || record.details.length === 0) {
    return base;
  }

  const detailText = record.details
    .map((detail) => {
      const path = Array.isArray(detail.path) ? detail.path.join('.') : '';
      const message = typeof detail.message === 'string' ? detail.message.trim() : '';
      if (path && message) {
        return `${path}: ${message}`;
      }
      return message || path || '';
    })
    .filter(Boolean)
    .join(' | ');

  return detailText ? `${base} (${detailText})` : base;
}

function normalizeStoryText(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeStoryText(value: string | null | undefined) {
  return normalizeStoryText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !STORY_STOP_WORDS.has(token));
}

function buildStoryTokenSet(value: string | null | undefined) {
  return new Set(tokenizeStoryText(value));
}

function scoreRunSimilarity(
  item: ReporterMonitoredSourceRow['ingestionItems'][number],
  run: { id: string; topic: string; title: string | null; status: string }
) {
  const itemTokens = buildStoryTokenSet(`${item.title} ${item.excerpt || ''}`);
  const runTokens = buildStoryTokenSet(`${run.title || ''} ${run.topic}`);

  if (itemTokens.size === 0 || runTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of itemTokens) {
    if (runTokens.has(token)) {
      overlap += 1;
    }
  }

  const itemTitle = normalizeStoryText(item.title);
  const runTitle = normalizeStoryText(run.title || run.topic);
  const titleBoost =
    itemTitle && runTitle && (itemTitle.includes(runTitle) || runTitle.includes(itemTitle))
      ? 2
      : 0;

  return overlap + titleBoost;
}

function getItemActivityTime(item: MonitoredIngestionStoryItem) {
  return new Date(item.publishedAt || item.lastSeenAt || item.firstSeenAt).getTime();
}

function countCivicSignalTerms(value: string) {
  const lowered = normalizeStoryText(value);
  return CIVIC_SIGNAL_TERMS.filter((term) => lowered.includes(term)).length;
}

function assessStoryItemSignal(item: MonitoredIngestionStoryItem, matchedKeywords: string[]) {
  let score = 0;
  const reasons: string[] = [];
  const combinedText = [item.title, item.excerpt].filter(Boolean).join(' ');
  const civicSignalCount = countCivicSignalTerms(combinedText);
  const titleWordCount = tokenizeStoryText(item.title).length;
  const ageHours = Math.max(
    0,
    (Date.now() - getItemActivityTime(item)) / (1000 * 60 * 60)
  );

  if (matchedKeywords.length > 0) {
    score += Math.min(3, matchedKeywords.length);
    reasons.push(`matches ${matchedKeywords.length} tenant term${matchedKeywords.length === 1 ? '' : 's'}`);
  }

  if (item.canonicalUrl) {
    score += 2;
    reasons.push('has a direct article link');
  }

  if (item.excerpt && item.excerpt.length >= 80) {
    score += 1;
    reasons.push('includes a useful summary');
  }

  if (civicSignalCount > 0) {
    score += Math.min(3, civicSignalCount);
    reasons.push('mentions civic/public-interest terms');
  }

  if (titleWordCount >= 5) {
    score += 1;
    reasons.push('has a specific headline');
  }

  if (ageHours <= 48) {
    score += 1;
    reasons.push('is recent');
  }

  if (score >= 6) {
    return { level: 'likely', score, reasons: reasons.slice(0, 3) } satisfies StorySignalAssessment;
  }

  if (score >= 3) {
    return { level: 'possible', score, reasons: reasons.slice(0, 3) } satisfies StorySignalAssessment;
  }

  return {
    level: 'low',
    score,
    reasons: reasons.length ? reasons.slice(0, 2) : ['weak story signal'],
  } satisfies StorySignalAssessment;
}

function storySignalTone(level: StorySignalAssessment['level']): 'ok' | 'pend' | 'neu' {
  if (level === 'likely') return 'ok';
  if (level === 'possible') return 'pend';
  return 'neu';
}

function storySignalLabel(level: StorySignalAssessment['level']) {
  if (level === 'likely') return 'Likely Story';
  if (level === 'possible') return 'Possible Story';
  return 'Low Signal';
}

function readinessTone(level: ReporterStoryCandidateView['readiness']['level']): 'ok' | 'pend' | 'bad' | 'neu' {
  if (level === 'draftable') return 'ok';
  if (level === 'needs-reporting') return 'pend';
  if (level === 'blocked') return 'bad';
  return 'neu';
}

function candidateTypeTone(
  candidateType: ReporterStoryCandidateView['candidateType']
): 'ok' | 'pend' | 'neu' {
  if (candidateType === 'EVENT_AND_ARTICLE') return 'ok';
  if (candidateType === 'EVENT_ONLY') return 'pend';
  return 'neu';
}

function candidateTypeLabel(candidateType: ReporterStoryCandidateView['candidateType']) {
  switch (candidateType) {
    case 'ARTICLE_ONLY':
      return 'Article Only';
    case 'EVENT_ONLY':
      return 'Event Only';
    case 'EVENT_AND_ARTICLE':
      return 'Event + Article';
    case 'NEITHER':
      return 'Neither';
  }
}

function eventConfidenceLabel(
  confidence: NonNullable<ReporterStoryCandidateView['eventExtraction']>['confidence']
) {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function createdEventTone(
  status: ReporterStoryCandidateView['createdEvents'][number]['status']
): 'ok' | 'pend' | 'bad' {
  if (status === 'PUBLISHED') return 'ok';
  if (status === 'UNPUBLISHED') return 'bad';
  return 'pend';
}

function createdEventLabel(
  status: ReporterStoryCandidateView['createdEvents'][number]['status']
) {
  if (status === 'PUBLISHED') return 'Published Event';
  if (status === 'UNPUBLISHED') return 'Archived Event';
  return 'Draft Event';
}

function linkedRunActionLabel(packet: ReporterStoryCandidateView) {
  if (!packet.linkedReporterRun) {
    return 'Create Run From Candidate';
  }

  if (packet.readiness.level === 'draftable') {
    return 'Open Draftable Run';
  }

  if (packet.readiness.level === 'blocked') {
    return 'Review Blocked Run';
  }

  return 'Continue Reporting';
}

function linkedRunSecondaryAction(packet: ReporterStoryCandidateView) {
  if (!packet.linkedReporterRun) {
    return null;
  }

  if (packet.readiness.level === 'draftable') {
    return {
      href: `/admin/reporter/${packet.linkedReporterRun.id}?view=analysis`,
      label: 'Open Analysis',
    };
  }

  if (packet.readiness.level === 'blocked') {
    return {
      href: `/admin/reporter/${packet.linkedReporterRun.id}?view=blockers`,
      label: 'Open Blockers',
    };
  }

  return {
    href: `/admin/reporter/${packet.linkedReporterRun.id}?view=agent&claimFilter=actionable`,
    label: 'Open Claims',
  };
}

function buildDailyCoverageGoalForm(
  goal: ReporterDailyCoverageGoalView | null,
  coveragePlaces: CoveragePlaceOption[]
): DailyCoverageGoalFormState {
  return {
    placeId: goal?.placeId || coveragePlaces[0]?.id || '',
    label: goal?.label || '',
    targetArticleCount: String(goal?.targetArticleCount || 1),
    minimumCandidateScore: String(goal?.minimumCandidateScore || 6),
    freshnessWindowHours: String(goal?.freshnessWindowHours || 36),
    priorityCoverageScopes: goal?.priorityCoverageScopes?.length
      ? goal.priorityCoverageScopes.map(String)
      : ['LOCAL'],
    allowNeedsReportingFallback: goal?.allowNeedsReportingFallback ?? true,
  };
}

function dailyCoverageDecisionTone(
  decision: ReporterDailyCoverageDecisionView | null
): 'ok' | 'pend' | 'neu' {
  if (!decision) {
    return 'neu';
  }

  return decision.outcome === 'selected' ? 'ok' : 'pend';
}

function dailyCoverageAnalysisTone(
  decision: ReporterDailyCoverageDecisionView | null
): 'ok' | 'pend' | 'bad' | 'neu' {
  if (!decision?.analysisStatus) {
    return 'neu';
  }

  if (decision.analysisStatus === 'generated') {
    return 'ok';
  }
  if (decision.analysisStatus === 'blocked') {
    return 'bad';
  }
  if (decision.analysisStatus === 'failed') {
    return 'bad';
  }
  return 'pend';
}

function dailyCoverageArticleTone(
  decision: ReporterDailyCoverageDecisionView | null
): 'ok' | 'pend' | 'bad' | 'neu' {
  if (!decision?.articleStatus) {
    return 'neu';
  }

  if (decision.articleStatus === 'generated') {
    return 'ok';
  }
  if (decision.articleStatus === 'blocked') {
    return 'bad';
  }
  if (decision.articleStatus === 'failed') {
    return 'bad';
  }
  return 'pend';
}

export default function ReporterMonitoredSourcesClient({
  sources,
  coveragePlaces,
  reporterRuns,
  tenantKeywordsText: initialTenantKeywordsText,
  storyCandidates,
  dailyCoverageDesk,
  eventLocations,
  eventOrganizations,
}: ReporterMonitoredSourcesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'all';
  const focusedCandidateId = searchParams.get('candidate');

  const [rows, setRows] = useState(sources);
  const [candidateRows, setCandidateRows] = useState(storyCandidates);
  const [dailyGoal, setDailyGoal] = useState(dailyCoverageDesk.goal);
  const [dailyDecision, setDailyDecision] = useState(dailyCoverageDesk.decision);
  const [dailyCoverageDate, setDailyCoverageDate] = useState(dailyCoverageDesk.date);
  const [query, setQuery] = useState('');
  const [tenantKeywordsText, setTenantKeywordsText] = useState(initialTenantKeywordsText);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [scopeFilter, setScopeFilter] = useState<(typeof SCOPE_FILTER_OPTIONS)[number]>('ALL');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [updatingSourceId, setUpdatingSourceId] = useState<string | null>(null);
  const [runningFetchSourceId, setRunningFetchSourceId] = useState<string | null>(null);
  const [runningDueSources, setRunningDueSources] = useState(false);
  const [refreshingCandidates, setRefreshingCandidates] = useState(false);
  const [candidateFilter, setCandidateFilter] = useState<CandidateFilterKey>('all');
  const [generatingCandidateAnalysisRunId, setGeneratingCandidateAnalysisRunId] = useState<string | null>(null);
  const [runningCandidateTriageRunId, setRunningCandidateTriageRunId] = useState<string | null>(null);
  const [creatingRunItemId, setCreatingRunItemId] = useState<string | null>(null);
  const [creatingRunPacketId, setCreatingRunPacketId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [attachDialog, setAttachDialog] = useState<AttachDialogState>(null);
  const [draftEventDialog, setDraftEventDialog] = useState<DraftEventDialogState>(null);
  const [draftEventLocationQuery, setDraftEventLocationQuery] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [attachingRunItemId, setAttachingRunItemId] = useState<string | null>(null);
  const [creatingDraftEvent, setCreatingDraftEvent] = useState(false);
  const [isSavingTenantKeywords, setIsSavingTenantKeywords] = useState(false);
  const [dailyCoverageGoalForm, setDailyCoverageGoalForm] = useState<DailyCoverageGoalFormState>(
    buildDailyCoverageGoalForm(dailyCoverageDesk.goal, coveragePlaces)
  );
  const [isSavingDailyCoverageGoal, setIsSavingDailyCoverageGoal] = useState(false);
  const [isEvaluatingDailyCoverage, setIsEvaluatingDailyCoverage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draftEventError, setDraftEventError] = useState('');

  const tenantKeywords = useMemo(
    () => parseReporterTenantKeywords(tenantKeywordsText),
    [tenantKeywordsText]
  );

  const recentStoryItems = useMemo<MonitoredIngestionStoryItem[]>(() => {
    return rows
      .flatMap((source) =>
        source.ingestionItems.map((item) => ({
          ...item,
          sourceId: source.id,
          sourceLabel: source.label,
          sourceCoverageScope: source.coverageScope,
          sourcePlaceName: source.place?.displayName || null,
        }))
      )
      .sort((a, b) => getItemActivityTime(b) - getItemActivityTime(a));
  }, [rows]);

  const itemKeywordMatchesById = useMemo(() => {
    const matches = new Map<string, string[]>();

    for (const item of recentStoryItems) {
      matches.set(
        item.id,
        findReporterTenantKeywordMatches(
          [item.title, item.excerpt, item.sourceLabel, item.sourcePlaceName, item.publisher]
            .filter(Boolean)
            .join(' '),
          tenantKeywords
        )
      );
    }

    return matches;
  }, [recentStoryItems, tenantKeywords]);

  const itemSignalById = useMemo(() => {
    const signals = new Map<string, StorySignalAssessment>();

    for (const item of recentStoryItems) {
      signals.set(item.id, assessStoryItemSignal(item, itemKeywordMatchesById.get(item.id) || []));
    }

    return signals;
  }, [itemKeywordMatchesById, recentStoryItems]);

  const suggestedRunsByItemId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; topic: string; title: string | null; status: string; score: number }>
    >();

    for (const source of rows) {
      for (const item of source.ingestionItems) {
        const suggestions = reporterRuns
          .map((run) => ({
            ...run,
            score: scoreRunSimilarity(item, run),
          }))
          .filter((run) => run.score >= 2)
          .sort((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score;
            }
            return (a.title || a.topic).localeCompare(b.title || b.topic);
          })
          .slice(0, 3);

        map.set(item.id, suggestions);
      }
    }

    return map;
  }, [reporterRuns, rows]);

  const candidateSummary = useMemo(() => {
    return {
      all: candidateRows.length,
      unclaimed: candidateRows.filter((candidate) => candidate.readiness.level === 'unclaimed').length,
      draftable: candidateRows.filter((candidate) => candidate.readiness.level === 'draftable').length,
      'needs-reporting': candidateRows.filter((candidate) => candidate.readiness.level === 'needs-reporting').length,
      blocked: candidateRows.filter((candidate) => candidate.readiness.level === 'blocked').length,
    };
  }, [candidateRows]);

  const filteredCandidateRows = useMemo(() => {
    if (candidateFilter === 'all') {
      return candidateRows;
    }

    return candidateRows.filter((candidate) => candidate.readiness.level === candidateFilter);
  }, [candidateFilter, candidateRows]);

  useEffect(() => {
    if (!focusedCandidateId) {
      return;
    }

    setCandidateFilter('all');

    const scrollToCandidate = () => {
      const element = document.getElementById(`candidate-${focusedCandidateId}`);
      if (!element) {
        return;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const frameId = window.requestAnimationFrame(scrollToCandidate);
    return () => window.cancelAnimationFrame(frameId);
  }, [focusedCandidateId, filteredCandidateRows.length]);

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function openDraftEventDialog(candidate: ReporterStoryCandidateView) {
    const defaultOrganizationId =
      eventOrganizations.find((organization) => organization.status === 'APPROVED')?.id ||
      eventOrganizations[0]?.id ||
      '';
    const primaryItem = candidate.items[0];
    const eventExtraction = candidate.eventExtraction;

    setDraftEventError('');
    setDraftEventLocationQuery(eventExtraction?.location || primaryItem?.sourcePlaceName || '');
    setDraftEventDialog({
      candidateId: candidate.id,
      title: eventExtraction?.title || candidate.title,
      description: eventExtraction?.summary || candidate.summary || primaryItem?.excerpt || '',
      startDate: formatEventDateInput(eventExtraction?.startAt ?? primaryItem?.publishedAt ?? null),
      startTime: formatEventTimeInput(eventExtraction?.startAt ?? primaryItem?.publishedAt ?? null) || '',
      endDate: formatEventDateInput(eventExtraction?.endAt ?? null),
      endTime: formatEventTimeInput(eventExtraction?.endAt ?? null) || '',
      venueLabel: eventExtraction?.location || primaryItem?.sourcePlaceName || '',
      imageUrl: eventExtraction?.imageUrl || '',
      sourceUrl: eventExtraction?.sourceUrl || primaryItem?.canonicalUrl || '',
      locationId: '',
      organizationId: defaultOrganizationId,
    });
    updateSearchParams({ focus: 'draft-event' });
  }

  const filteredDraftEventLocations = useMemo(() => {
    const normalizedQuery = draftEventLocationQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const matches = eventLocations.filter((location) => {
      return formatLocationSearchLabel(location).toLowerCase().includes(normalizedQuery);
    });

    return matches.slice(0, 20);
  }, [draftEventLocationQuery, eventLocations]);

  const selectedDraftEventLocation = useMemo(() => {
    if (!draftEventDialog?.locationId) {
      return null;
    }

    return eventLocations.find((location) => location.id === draftEventDialog.locationId) || null;
  }, [draftEventDialog?.locationId, eventLocations]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((source) => {
      const health = getReporterMonitoredSourceHealth(source);

      if (activeView === 'attention' && !['failing', 'stale', 'new'].includes(health)) {
        return false;
      }
      if (activeView === 'active' && source.status !== 'ACTIVE') {
        return false;
      }
      if (activeView === 'paused' && source.status !== 'PAUSED') {
        return false;
      }
      if (statusFilter !== 'ALL' && source.status !== statusFilter) {
        return false;
      }
      if (scopeFilter !== 'ALL' && source.coverageScope !== scopeFilter) {
        return false;
      }
      if (typeFilter !== 'all' && source.sourceType !== typeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        source.label,
        source.publisher,
        source.place?.displayName,
        formatReporterMonitoredSourceEnumLabel(source.coverageScope),
        source.url,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeView, query, rows, scopeFilter, statusFilter, typeFilter]);

  async function refreshStoryCandidatesState(options?: {
    noticeMessage?: string;
    emptyNoticeMessage?: string;
  }) {
    const response = await fetch('/api/admin/reporter/story-candidates/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 12 }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to refresh story candidates');
    }

    setCandidateRows(Array.isArray(data.candidates) ? data.candidates : []);

    if (typeof data.candidateCount === 'number') {
      setNotice(
        data.candidateCount > 0
          ? options?.noticeMessage ||
              `Refreshed ${data.candidateCount} story candidate${data.candidateCount === 1 ? '' : 's'}.`
          : options?.emptyNoticeMessage ||
              'No current story candidates were found from recent monitored-source items.'
      );
    }
  }

  async function handleSaveDailyCoverageGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingDailyCoverageGoal(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/daily-coverage/goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeId: dailyCoverageGoalForm.placeId || null,
          label: dailyCoverageGoalForm.label || null,
          targetArticleCount: Number(dailyCoverageGoalForm.targetArticleCount) || 1,
          priorityCoverageScopes: dailyCoverageGoalForm.priorityCoverageScopes,
          minimumCandidateScore: Number(dailyCoverageGoalForm.minimumCandidateScore) || 6,
          freshnessWindowHours: Number(dailyCoverageGoalForm.freshnessWindowHours) || 36,
          allowNeedsReportingFallback: dailyCoverageGoalForm.allowNeedsReportingFallback,
          isActive: true,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save daily coverage goal');
      }

      setDailyGoal(data.goal || null);
      setDailyCoverageGoalForm(buildDailyCoverageGoalForm(data.goal || null, coveragePlaces));
      setNotice('Daily coverage goal saved.');
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed to save daily coverage goal'
      );
    } finally {
      setIsSavingDailyCoverageGoal(false);
    }
  }

  async function handleEvaluateDailyCoverage() {
    setIsEvaluatingDailyCoverage(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/daily-coverage/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: dailyCoverageDate,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate daily coverage desk');
      }

      setDailyGoal(data.goal || null);
      setDailyDecision(data.decision || null);
      if (typeof data.date === 'string') {
        setDailyCoverageDate(data.date);
      }
      await refreshStoryCandidatesState({
        noticeMessage: data.decision?.outcome === 'selected'
          ? 'Daily desk selected a story and refreshed candidate readiness.'
          : 'Daily desk recorded that no publishable story cleared the current thresholds.',
        emptyNoticeMessage: 'Daily desk completed. No current story candidates remain.',
      });
    } catch (evaluationError) {
      setError(
        evaluationError instanceof Error
          ? evaluationError.message
          : 'Failed to evaluate daily coverage desk'
      );
    } finally {
      setIsEvaluatingDailyCoverage(false);
    }
  }

  async function handleCreateSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setError('');
    setNotice('');
    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/reporter/monitored-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: createForm.label,
          sourceType: createForm.sourceType,
          sourceFormat: createForm.sourceFormat,
          executionLane: createForm.executionLane,
          coverageScope: createForm.coverageScope,
          url: createForm.url,
          publisher: createForm.publisher,
          notes: createForm.notes,
          placeId: createForm.placeId || null,
          fetchFrequencyMinutes: Number(createForm.fetchFrequencyHours) * 60,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(formatApiErrorMessage(data, 'Failed to create monitored source'));
      }

      setRows((current) => [data.source, ...current]);
      setCreateForm(EMPTY_CREATE_FORM);
      updateSearchParams({ focus: null, view: 'all' });
    } catch (createSourceError) {
      setCreateError(
        createSourceError instanceof Error
          ? createSourceError.message
          : 'Failed to create monitored source'
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(sourceId: string, status: string) {
    setUpdatingSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update monitored source');
      }

      setRows((current) =>
        current.map((source) => (source.id === sourceId ? data.source : source))
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Failed to update monitored source'
      );
    } finally {
      setUpdatingSourceId(null);
    }
  }

  async function handleCoverageScopeChange(sourceId: string, coverageScope: string) {
    setUpdatingSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coverageScope }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update monitored source scope');
      }

      setRows((current) =>
        current.map((source) => (source.id === sourceId ? data.source : source))
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Failed to update monitored source scope'
      );
    } finally {
      setUpdatingSourceId(null);
    }
  }

  async function handleExecutionLaneChange(sourceId: string, executionLane: string) {
    setUpdatingSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ executionLane }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update monitored source execution lane');
      }

      setRows((current) =>
        current.map((source) => (source.id === sourceId ? data.source : source))
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Failed to update monitored source execution lane'
      );
    } finally {
      setUpdatingSourceId(null);
    }
  }

  async function handleRunFetch(sourceId: string) {
    setRunningFetchSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}/run-fetch`, {
        method: 'POST',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch monitored source');
      }

      if (data.source) {
        setRows((current) =>
          current.map((source) => (source.id === sourceId ? data.source : source))
        );
        setNotice(
          `Fetch complete for ${data.source.label}. ${data.fetch.status} with ${data.summary.newItemCount} new and ${data.summary.changedItemCount} changed item${data.summary.changedItemCount === 1 ? '' : 's'}.`
        );
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch monitored source');
    } finally {
      setRunningFetchSourceId(null);
    }
  }

  async function handleRunDueSources() {
    setRunningDueSources(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/monitored-sources/run-due', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run due monitored sources');
      }

      if (Array.isArray(data.sources) && data.sources.length > 0) {
        const nextSources = data.sources as ReporterMonitoredSourceRow[];
        const replacements = new Map<string, ReporterMonitoredSourceRow>(
          nextSources.map((source) => [source.id, source])
        );
        setRows((current) =>
          current.map((source) => replacements.get(source.id) || source)
        );
      }

      setNotice(
        data.attemptedCount > 0
          ? `Ran ${data.attemptedCount} due source${data.attemptedCount === 1 ? '' : 's'}: ${data.summary.successCount} success, ${data.summary.noChangeCount} no change, ${data.summary.failedCount} failed.`
          : 'No due monitored sources were ready to run.'
      );
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to run due monitored sources');
    } finally {
      setRunningDueSources(false);
    }
  }

  async function handleRefreshStoryCandidates() {
    setRefreshingCandidates(true);
    setError('');
    setNotice('');

    try {
      await refreshStoryCandidatesState();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Failed to refresh story candidates'
      );
    } finally {
      setRefreshingCandidates(false);
    }
  }

  async function handleGenerateCandidateAnalysis(packet: ReporterStoryCandidateView) {
    if (!packet.linkedReporterRun) {
      return;
    }

    setGeneratingCandidateAnalysisRunId(packet.linkedReporterRun.id);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/reporter/runs/${packet.linkedReporterRun.id}/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftType: 'SOURCE_PACKET_SUMMARY' }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate reporter analysis');
      }

      await refreshStoryCandidatesState({
        noticeMessage: 'Reporter analysis generated and candidate readiness refreshed.',
        emptyNoticeMessage: 'Reporter analysis generated. No current story candidates remain.',
      });
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : 'Failed to generate reporter analysis'
      );
    } finally {
      setGeneratingCandidateAnalysisRunId(null);
    }
  }

  async function handleRunCandidateTriage(packet: ReporterStoryCandidateView) {
    if (!packet.linkedReporterRun) {
      return;
    }

    setRunningCandidateTriageRunId(packet.linkedReporterRun.id);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/triage/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reporterRunId: packet.linkedReporterRun.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run reporter triage');
      }

      await refreshStoryCandidatesState({
        noticeMessage: 'Reporter triage completed and candidate readiness refreshed.',
        emptyNoticeMessage: 'Reporter triage completed. No current story candidates remain.',
      });
    } catch (triageError) {
      setError(
        triageError instanceof Error
          ? triageError.message
          : 'Failed to run reporter triage'
      );
    } finally {
      setRunningCandidateTriageRunId(null);
    }
  }

  async function handleSaveTenantKeywords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingTenantKeywords(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/tenant-keywords', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywordsText: tenantKeywordsText,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save reporter tenant keywords');
      }

      setTenantKeywordsText(data.keywordsText || '');
      setNotice(
        data.keywords?.length
          ? `Saved ${data.keywords.length} tenant keyword${data.keywords.length === 1 ? '' : 's'} for reporter discovery.`
          : 'Cleared reporter tenant keywords.'
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save reporter tenant keywords'
      );
    } finally {
      setIsSavingTenantKeywords(false);
    }
  }

  async function handleCreateReporterRunFromItem(
    source: ReporterMonitoredSourceRow,
    item: ReporterMonitoredSourceRow['ingestionItems'][number]
  ) {
    setCreatingRunItemId(item.id);
    setError('');
    setNotice('');

    try {
      const supportingLinks = item.canonicalUrl ? [item.canonicalUrl] : [];
      const response = await fetch('/api/reporter/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'RESEARCH',
          requestType: 'EDITOR_ASSIGNMENT',
          topic: item.title,
          title: item.title,
          whatHappened:
            item.excerpt ||
            `Monitored source item discovered from ${source.label}.`,
          requestSummary: `Discovered through monitored source: ${source.label}`,
          editorNotes: [
            `Created from monitored source: ${source.label}`,
            ...(itemKeywordMatchesById.get(item.id)?.length
              ? [`Tenant keyword matches: ${itemKeywordMatchesById.get(item.id)!.join(', ')}`]
              : []),
            source.publisher ? `Source publisher: ${source.publisher}` : null,
            `Source scope: ${formatReporterMonitoredSourceEnumLabel(source.coverageScope)}`,
            item.publisher ? `Item publisher: ${item.publisher}` : null,
            item.publishedAt ? `Published: ${formatDateTime(item.publishedAt)}` : null,
            item.canonicalUrl ? `Original URL: ${item.canonicalUrl}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          supportingLinks,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reporter run from monitored source item');
      }

      router.push(`/admin/reporter/${data.id}?view=sources`);
      router.refresh();
    } catch (createRunError) {
      setError(
        createRunError instanceof Error
          ? createRunError.message
          : 'Failed to create reporter run from monitored source item'
      );
    } finally {
      setCreatingRunItemId(null);
    }
  }

  async function handleCreateReporterRunFromPacket(packet: ReporterStoryCandidateView) {
    setCreatingRunPacketId(packet.id);
    setError('');
    setNotice('');

    try {
      const supportingLinks = Array.from(
        new Set(packet.items.map((item) => item.canonicalUrl).filter(Boolean))
      ) as string[];
      const response = await fetch('/api/reporter/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyCandidateId: packet.id,
          mode: 'RESEARCH',
          requestType: 'EDITOR_ASSIGNMENT',
          topic: packet.title,
          title: packet.title,
          whatHappened:
            packet.items
              .map((item) => item.excerpt)
              .filter(Boolean)
              .slice(0, 3)
              .join('\n\n') ||
            `Multi-source story packet built from ${packet.sourceCount} monitored sources.`,
          requestSummary: `Multi-source story packet detected from ${packet.sourceCount} monitored sources and ${packet.items.length} related items.`,
          editorNotes: [
            'Created from monitored-source story packet.',
            packet.coverageScopes.length
              ? `Coverage scopes: ${packet.coverageScopes
                  .map((scope) => formatReporterMonitoredSourceEnumLabel(String(scope)))
                  .join(', ')}`
              : null,
            ...(packet.matchedKeywords.length
              ? [`Tenant keyword matches: ${packet.matchedKeywords.join(', ')}`]
              : []),
            ...packet.items.map(
              (item) =>
                `${item.sourceLabel}: ${item.title}${item.canonicalUrl ? ` (${item.canonicalUrl})` : ''}`
            ),
          ].filter(Boolean).join('\n'),
          supportingLinks,
          initialSources: packet.items.map((item) => ({
            sourceType: item.canonicalUrl ? 'NEWS_ARTICLE' : 'STAFF_NOTE',
            title: item.title,
            url: item.canonicalUrl,
            publisher: item.publisher,
            publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
            excerpt: item.excerpt,
            contentText: item.excerpt,
            note: `From monitored source: ${item.sourceLabel} (${formatReporterMonitoredSourceEnumLabel(
              String(item.sourceCoverageScope)
            )})`,
            reliabilityTier: 'UNVERIFIED',
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reporter run from story packet');
      }

      try {
        await refreshStoryCandidatesState({
          noticeMessage: 'Reporter run created and candidate queue refreshed.',
          emptyNoticeMessage: 'Reporter run created. No current story candidates remain.',
        });
      } catch (refreshError) {
        console.error('Failed to refresh story candidates after run creation:', refreshError);
        setNotice('Reporter run created.');
      }

      router.push(`/admin/reporter/${data.id}?view=sources`);
      router.refresh();
    } catch (createRunError) {
      setError(
        createRunError instanceof Error
          ? createRunError.message
          : 'Failed to create reporter run from story packet'
      );
    } finally {
      setCreatingRunPacketId(null);
    }
  }

  async function handleDeleteIngestionItem(
    source: ReporterMonitoredSourceRow,
    item: ReporterMonitoredSourceRow['ingestionItems'][number]
  ) {
    if (!window.confirm(`Delete "${item.title}" from monitored-source results?`)) {
      return;
    }

    setDeletingItemId(item.id);
    setError('');
    setNotice('');

    try {
      const response = await fetch(
        `/api/admin/reporter/monitored-sources/${source.id}/items/${item.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete monitored source item');
      }

      setRows((current) =>
        current.map((row) =>
          row.id !== source.id
            ? row
            : {
                ...row,
                ingestionItems: row.ingestionItems.filter((candidate) => candidate.id !== item.id),
                _count: {
                  ...row._count,
                  ingestionItems: Math.max(0, row._count.ingestionItems - 1),
                },
              }
        )
      );

      if (attachDialog?.item.id === item.id) {
        setAttachDialog(null);
        setSelectedRunId('');
      }

      setNotice(`Deleted monitored-source item: ${item.title}`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed to delete monitored source item'
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  function openAttachDialog(
    source: ReporterMonitoredSourceRow,
    item: ReporterMonitoredSourceRow['ingestionItems'][number]
  ) {
    const suggestedRunId = suggestedRunsByItemId.get(item.id)?.[0]?.id || '';
    setAttachDialog({ source, item });
    setSelectedRunId(suggestedRunId || reporterRuns[0]?.id || '');
    setError('');
    setNotice('');
    updateSearchParams({ focus: 'attach-run' });
  }

  async function handleAttachItemToExistingRun() {
    if (!attachDialog || !selectedRunId) {
      setError('Choose a reporter run first.');
      return;
    }

    const { source, item } = attachDialog;
    setAttachingRunItemId(item.id);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/reporter/runs/${selectedRunId}/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceType: item.canonicalUrl ? 'NEWS_ARTICLE' : 'STAFF_NOTE',
          title: item.title,
          url: item.canonicalUrl,
          publisher: item.publisher || source.publisher || '',
          excerpt: item.excerpt || '',
          contentText: item.excerpt || '',
          note: `Attached from monitored source: ${source.label}`,
          reliabilityTier: 'UNVERIFIED',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to attach monitored source item to reporter run');
      }

      setAttachDialog(null);
      setSelectedRunId('');
      router.push(`/admin/reporter/${selectedRunId}?view=sources`);
      router.refresh();
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : 'Failed to attach monitored source item to reporter run'
      );
    } finally {
      setAttachingRunItemId(null);
    }
  }

  async function handleCreateDraftEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftEventDialog) {
      return;
    }

    if (!draftEventDialog.title.trim()) {
      setDraftEventError('Event title is required.');
      return;
    }

    if (!draftEventDialog.startDate) {
      setDraftEventError('Start date is required.');
      return;
    }

    if (!draftEventDialog.locationId) {
      setDraftEventError('Choose a location for the draft event.');
      return;
    }

    if (!draftEventDialog.organizationId) {
      setDraftEventError('Choose an organization for the draft event.');
      return;
    }

    setCreatingDraftEvent(true);
    setDraftEventError('');
    setError('');
    setNotice('');

    try {
      const response = await fetch(
        `/api/admin/reporter/story-candidates/${draftEventDialog.candidateId}/create-draft-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: draftEventDialog.title,
            description: draftEventDialog.description || null,
            startDate: draftEventDialog.startDate,
            startTime: draftEventDialog.startTime || null,
            endDate: draftEventDialog.endDate || null,
            endTime: draftEventDialog.endTime || null,
            venueLabel: draftEventDialog.venueLabel || null,
            imageUrl: draftEventDialog.imageUrl || null,
            locationId: draftEventDialog.locationId,
            organizationId: draftEventDialog.organizationId,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create draft event');
      }

      setDraftEventDialog(null);
      updateSearchParams({ focus: null });
      setNotice(`Draft event created: ${data.event.title}`);
      router.push(`/admin/events?view=pending&focus=${data.event.id}`);
      router.refresh();
    } catch (createError) {
      setDraftEventError(
        createError instanceof Error ? createError.message : 'Failed to create draft event'
      );
    } finally {
      setCreatingDraftEvent(false);
    }
  }

  function toggleDailyCoverageScope(scope: string, checked: boolean) {
    setDailyCoverageGoalForm((current) => {
      const nextScopes = checked
        ? Array.from(new Set([...current.priorityCoverageScopes, scope]))
        : current.priorityCoverageScopes.filter((currentScope) => currentScope !== scope);

      return {
        ...current,
        priorityCoverageScopes: nextScopes.length ? nextScopes : current.priorityCoverageScopes,
      };
    });
  }

  const attentionCount = rows.filter((source) =>
    ['failing', 'stale', 'new'].includes(getReporterMonitoredSourceHealth(source))
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.filter((source) => source.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Attention</div>
          <div className="mt-2 text-2xl font-black text-amber-900">{attentionCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fetched Items</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.reduce((total, source) => total + source._count.ingestionItems, 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recent Fetches</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.reduce((total, source) => total + source._count.fetches, 0)}
          </div>
        </div>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Tenant Keywords
            </div>
            <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
              Reporter Coverage Terms
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Add the place names, institutions, people, and recurring topics that matter for this
              tenant. These terms boost and highlight matching items and story packets across all
              monitored sources.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
            {tenantKeywords.length} active
          </div>
        </div>

        <form onSubmit={handleSaveTenantKeywords} className="mt-4 space-y-3">
          <textarea
            value={tenantKeywordsText}
            onChange={(event) => setTenantKeywordsText(event.target.value)}
            className="form-input min-h-[120px]"
            placeholder="Johnstown, Richland Township, Westmont Hilltop, school board, zoning, water authority"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Separate terms with commas or new lines. Matching terms do not hard-filter fetches
              yet; they help the reporter prioritize likely local stories.
            </div>
            <button type="submit" className="page-header-action" disabled={isSavingTenantKeywords}>
              {isSavingTenantKeywords ? 'Saving…' : 'Save Coverage Terms'}
            </button>
          </div>
          {tenantKeywords.length ? (
            <div className="flex flex-wrap gap-2">
              {tenantKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </form>
      </div>

      <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(248,250,252,0.98))] px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Daily Desk
            </div>
            <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
              Daily Coverage Orchestrator
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Save the active daily coverage thresholds for this tenant, then evaluate the best
              candidate for today or record that no publishable story cleared the bar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminChip tone={dailyCoverageDecisionTone(dailyDecision)}>
              {dailyDecision ? dailyDecision.outcomeLabel : 'No Decision Yet'}
            </AdminChip>
            <input
              type="date"
              value={dailyCoverageDate}
              onChange={(event) => setDailyCoverageDate(event.target.value)}
              className="form-input h-10 min-w-[160px]"
            />
            <button
              type="button"
              className="page-header-action"
              onClick={() => void handleEvaluateDailyCoverage()}
              disabled={isEvaluatingDailyCoverage}
            >
              <span>{isEvaluatingDailyCoverage ? 'Evaluating…' : 'Evaluate Daily Desk'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <form onSubmit={handleSaveDailyCoverageGoal} className="rounded-3xl border border-white/80 bg-white/90 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Coverage Area
                </span>
                <select
                  value={dailyCoverageGoalForm.placeId}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      placeId: event.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">All configured areas</option>
                  {coveragePlaces.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Desk Label
                </span>
                <input
                  value={dailyCoverageGoalForm.label}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="Daily desk"
                />
              </label>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Priority Scopes
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {REPORTER_COVERAGE_SCOPE_OPTIONS.map((scope) => (
                    <label
                      key={scope}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={dailyCoverageGoalForm.priorityCoverageScopes.includes(scope)}
                        onChange={(event) => toggleDailyCoverageScope(scope, event.target.checked)}
                      />
                      <span>{formatReporterMonitoredSourceEnumLabel(scope)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Min Candidate Score
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={dailyCoverageGoalForm.minimumCandidateScore}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      minimumCandidateScore: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Freshness Window Hours
                </span>
                <input
                  type="number"
                  min={6}
                  max={168}
                  value={dailyCoverageGoalForm.freshnessWindowHours}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      freshnessWindowHours: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Daily Target
                </span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  value={dailyCoverageGoalForm.targetArticleCount}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      targetArticleCount: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={dailyCoverageGoalForm.allowNeedsReportingFallback}
                  onChange={(event) =>
                    setDailyCoverageGoalForm((current) => ({
                      ...current,
                      allowNeedsReportingFallback: event.target.checked,
                    }))
                  }
                />
                <span>Allow `Needs Reporting` fallback when no stronger lead is available.</span>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Current area:{' '}
                <span className="font-semibold text-slate-700">
                  {dailyGoal?.placeName || 'All configured coverage areas'}
                </span>
                {' '}• Priority scopes:{' '}
                <span className="font-semibold text-slate-700">
                  {dailyCoverageGoalForm.priorityCoverageScopes
                    .map(formatReporterMonitoredSourceEnumLabel)
                    .join(', ')}
                </span>
              </div>
              <button type="submit" className="page-header-action" disabled={isSavingDailyCoverageGoal}>
                {isSavingDailyCoverageGoal ? 'Saving…' : 'Save Daily Goal'}
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/80 bg-white/90 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Latest Daily Decision</div>
              {dailyDecision ? (
                <div className="text-xs text-slate-500">Updated {formatDateTime(dailyDecision.updatedAt)}</div>
              ) : null}
            </div>
            {dailyDecision ? (
              <div className="mt-3 space-y-3">
                <div className="text-sm text-slate-700">{dailyDecision.summary}</div>
                {dailyDecision.analysisStatusLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminChip tone={dailyCoverageAnalysisTone(dailyDecision)}>
                      {dailyDecision.analysisStatusLabel}
                    </AdminChip>
                    {typeof dailyDecision.analysisIssueCount === 'number' ? (
                      <span className="text-xs text-slate-500">
                        {dailyDecision.analysisIssueCount} validation issue
                        {dailyDecision.analysisIssueCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {dailyDecision.articleStatusLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminChip tone={dailyCoverageArticleTone(dailyDecision)}>
                      {dailyDecision.articleStatusLabel}
                    </AdminChip>
                    {typeof dailyDecision.articleIssueCount === 'number' ? (
                      <span className="text-xs text-slate-500">
                        {dailyDecision.articleIssueCount} validation issue
                        {dailyDecision.articleIssueCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {dailyDecision.reporterRun ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                    <div className="font-semibold">
                      {dailyDecision.reporterRun.title || dailyDecision.reporterRun.topic}
                    </div>
                    <div className="mt-1 text-xs text-emerald-800">
                      Run status: {dailyDecision.reporterRun.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link
                        href={`/admin/reporter/${dailyDecision.reporterRun.id}?view=sources`}
                        className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800"
                      >
                        Open Selected Run
                      </Link>
                      {dailyDecision.analysisDraft ? (
                        <Link
                          href={`/admin/reporter/${dailyDecision.reporterRun.id}?view=analysis`}
                          className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800"
                        >
                          Open Analysis
                        </Link>
                      ) : null}
                      {dailyDecision.articleDraft ? (
                        <Link
                          href={`/admin/reporter/${dailyDecision.reporterRun.id}?view=drafts`}
                          className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800"
                        >
                          Open Draft
                        </Link>
                      ) : dailyDecision.analysisStatus === 'blocked' ? (
                        <Link
                          href={`/admin/reporter/${dailyDecision.reporterRun.id}?view=blockers`}
                          className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800"
                        >
                          Review Blockers
                        </Link>
                      ) : dailyDecision.analysisStatus === 'skipped' ? (
                        <Link
                          href={`/admin/reporter/${dailyDecision.reporterRun.id}?view=agent&claimFilter=actionable`}
                          className="inline-flex text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800"
                        >
                          Open Claims
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {dailyDecision.storyCandidate ? (
                  <div className="text-xs text-slate-500">
                    Candidate: <span className="font-semibold text-slate-700">{dailyDecision.storyCandidate.title}</span>
                  </div>
                ) : null}
                {dailyDecision.analysisSummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {dailyDecision.analysisSummary}
                  </div>
                ) : null}
                {dailyDecision.articleSummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {dailyDecision.articleSummary}
                  </div>
                ) : null}
                {dailyDecision.reasons.length ? (
                  <div className="space-y-2">
                    {dailyDecision.reasons.map((reason) => (
                      <div
                        key={reason}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                No daily decision has been recorded for {dailyCoverageDate} yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(248,250,252,0.98))] px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
              Story Candidates
            </div>
            <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
              Ranked Reporting Leads
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Refresh durable story candidates built from recent monitored-source items. These
              clusters give the reporter a stronger starting packet than one-off source triage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
              {candidateRows.length} candidate{candidateRows.length === 1 ? '' : 's'}
            </div>
            <button
              type="button"
              className="page-header-action"
              onClick={() => void handleRefreshStoryCandidates()}
              disabled={refreshingCandidates}
            >
              <RefreshCcw className={`h-4 w-4 ${refreshingCandidates ? 'animate-spin' : ''}`} />
              <span>{refreshingCandidates ? 'Refreshing…' : 'Refresh Candidates'}</span>
            </button>
          </div>
        </div>

        {candidateRows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-white px-4 py-4 text-sm text-slate-600">
            No durable story candidates have been materialized yet for this tenant.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <button
                type="button"
                onClick={() => setCandidateFilter('all')}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  candidateFilter === 'all'
                    ? 'border-slate-400 bg-slate-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  All
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{candidateSummary.all}</div>
              </button>
              <button
                type="button"
                onClick={() => setCandidateFilter('unclaimed')}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  candidateFilter === 'unclaimed'
                    ? 'border-slate-400 bg-slate-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Unclaimed
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {candidateSummary.unclaimed}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCandidateFilter('draftable')}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  candidateFilter === 'draftable'
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Draftable
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {candidateSummary.draftable}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCandidateFilter('needs-reporting')}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  candidateFilter === 'needs-reporting'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Needs Reporting
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {candidateSummary['needs-reporting']}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCandidateFilter('blocked')}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  candidateFilter === 'blocked'
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Blocked
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {candidateSummary.blocked}
                </div>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-700">{filteredCandidateRows.length}</span>{' '}
                of <span className="font-semibold text-slate-700">{candidateRows.length}</span>{' '}
                candidates.
              </div>
              <div>
                Filter:{' '}
                <span className="font-semibold text-slate-700">
                  {candidateFilter === 'all'
                    ? 'All'
                    : candidateFilter === 'needs-reporting'
                      ? 'Needs Reporting'
                      : candidateFilter.charAt(0).toUpperCase() + candidateFilter.slice(1)}
                </span>
              </div>
            </div>

            {filteredCandidateRows.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-sky-100 bg-white px-4 py-4 text-sm text-slate-600">
                No story candidates match the current readiness filter.
              </div>
            ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filteredCandidateRows.map((packet) => (
              <div
                key={packet.id}
                id={`candidate-${packet.id}`}
                className={`rounded-3xl border px-4 py-4 shadow-sm ${
                  focusedCandidateId === packet.id
                    ? 'border-sky-400 bg-sky-50/50 ring-2 ring-sky-200'
                    : 'border-sky-100 bg-white'
                }`}
              >
                {(() => {
                  const secondaryAction = linkedRunSecondaryAction(packet);

                  return (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-slate-950">{packet.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {packet.sourceCount} source{packet.sourceCount === 1 ? '' : 's'} •{' '}
                      {packet.itemCount} item{packet.itemCount === 1 ? '' : 's'} • latest{' '}
                      {formatDateTime(packet.latestAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AdminChip tone={storySignalTone(packet.signal.level)}>
                        {storySignalLabel(packet.signal.level)}
                      </AdminChip>
                      <AdminChip tone={readinessTone(packet.readiness.level)}>
                        {packet.readiness.label}
                      </AdminChip>
                      <AdminChip tone={candidateTypeTone(packet.candidateType)}>
                        {candidateTypeLabel(packet.candidateType)}
                      </AdminChip>
                      <span className="text-xs text-slate-500">score {packet.signal.score}</span>
                    </div>
                    {packet.coverageScopes.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {packet.coverageScopes.map((scope) => (
                          <span
                            key={String(scope)}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700"
                          >
                            {formatReporterMonitoredSourceEnumLabel(String(scope))}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-600">
                      {packet.signal.reasons.join(' • ')}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">{packet.readiness.reason}</div>
                    {packet.summary ? (
                      <div className="mt-2 text-xs leading-5 text-slate-600">{packet.summary}</div>
                    ) : null}
                    {packet.eventExtraction ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-950">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.1em] text-amber-800">
                            Event Extraction
                          </span>
                          <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                            {eventConfidenceLabel(packet.eventExtraction.confidence)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900">Title:</span>{' '}
                            {packet.eventExtraction.title}
                          </div>
                          {packet.eventExtraction.startAt ? (
                            <div>
                              <span className="font-semibold text-slate-900">Start:</span>{' '}
                              {formatDateTime(packet.eventExtraction.startAt)}
                            </div>
                          ) : null}
                          {packet.eventExtraction.location ? (
                            <div>
                              <span className="font-semibold text-slate-900">Location:</span>{' '}
                              {packet.eventExtraction.location}
                            </div>
                          ) : null}
                          {packet.eventExtraction.organizer ? (
                            <div>
                              <span className="font-semibold text-slate-900">Organizer:</span>{' '}
                              {packet.eventExtraction.organizer}
                            </div>
                          ) : null}
                          {packet.eventExtraction.recurrenceText ? (
                            <div>
                              <span className="font-semibold text-slate-900">Recurrence:</span>{' '}
                              {packet.eventExtraction.recurrenceText}
                            </div>
                          ) : null}
                          {packet.eventExtraction.missingFields.length ? (
                            <div>
                              <span className="font-semibold text-slate-900">Missing:</span>{' '}
                              {packet.eventExtraction.missingFields.join(', ')}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {packet.createdEvents.length ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Created Events
                        </div>
                        <div className="mt-2 space-y-2">
                          {packet.createdEvents.map((createdEvent) => (
                            <div
                              key={createdEvent.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/events/${createdEvent.id}`}
                                  className="text-xs font-semibold text-slate-900 hover:text-sky-700"
                                >
                                  {createdEvent.title}
                                </Link>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {formatDateTime(createdEvent.startDatetime)}
                                </div>
                              </div>
                              <AdminChip tone={createdEventTone(createdEvent.status)}>
                                {createdEventLabel(createdEvent.status)}
                              </AdminChip>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {packet.linkedReporterRun ? (
                      <div className="mt-2 text-xs text-amber-700">
                        Linked run: {packet.linkedReporterRun.title || packet.linkedReporterRun.topic} •{' '}
                        {packet.linkedReporterRun.status}
                      </div>
                    ) : null}
                    {(packet.readiness.actionableClaimCount > 0 ||
                      packet.readiness.supportedClaimCount > 0 ||
                      packet.readiness.followUpClaimCount > 0 ||
                      packet.readiness.blockerCount > 0) ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {packet.readiness.supportedClaimCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                            {packet.readiness.supportedClaimCount} supported
                          </span>
                        ) : null}
                        {packet.readiness.actionableClaimCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800">
                            {packet.readiness.actionableClaimCount} actionable
                          </span>
                        ) : null}
                        {packet.readiness.followUpClaimCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-800">
                            {packet.readiness.followUpClaimCount} follow-up
                          </span>
                        ) : null}
                        {packet.readiness.blockerCount > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-800">
                            {packet.readiness.blockerCount} blocker{packet.readiness.blockerCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {packet.matchedKeywords.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {packet.matchedKeywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800"
                          >
                            Match: {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {(packet.eventExtraction || packet.canSeedDraftEvent) &&
                    packet.createdEvents.length === 0 ? (
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800 shadow-sm transition hover:border-amber-500 hover:bg-amber-100"
                        onClick={() => openDraftEventDialog(packet)}
                      >
                        {packet.eventExtraction ? 'Create Draft Event' : 'Seed Draft Event'}
                      </button>
                    ) : null}
                    {packet.linkedReporterRun ? (
                      <>
                        <Link
                          href={`/admin/reporter/${packet.linkedReporterRun.id}?view=sources`}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800"
                        >
                          {linkedRunActionLabel(packet)}
                        </Link>
                        {packet.readiness.level === 'draftable' ? (
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void handleGenerateCandidateAnalysis(packet)}
                            disabled={generatingCandidateAnalysisRunId === packet.linkedReporterRun.id}
                          >
                            {generatingCandidateAnalysisRunId === packet.linkedReporterRun.id
                              ? 'Analyzing…'
                              : 'Generate Analysis'}
                          </button>
                        ) : packet.readiness.level === 'needs-reporting' ? (
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void handleRunCandidateTriage(packet)}
                            disabled={runningCandidateTriageRunId === packet.linkedReporterRun.id}
                          >
                            {runningCandidateTriageRunId === packet.linkedReporterRun.id
                              ? 'Running Triage…'
                              : 'Run Triage'}
                          </button>
                        ) : secondaryAction ? (
                          <Link
                            href={secondaryAction.href}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          >
                            {secondaryAction.label}
                          </Link>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleCreateReporterRunFromPacket(packet)}
                        disabled={creatingRunPacketId === packet.id}
                      >
                        {creatingRunPacketId === packet.id ? 'Creating…' : linkedRunActionLabel(packet)}
                      </button>
                    )}
                  </div>
                </div>
                  );
                })()}

                <div className="mt-3 space-y-2">
                  {packet.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.sourceLabel}
                            {item.sourcePlaceName ? ` • ${item.sourcePlaceName}` : ''}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          {formatDate(item.publishedAt)}
                        </div>
                      </div>
                      {item.excerpt ? (
                        <div className="mt-2 text-xs leading-5 text-slate-600">{item.excerpt}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="all"
          views={[
            { key: 'all', label: 'All Sources', count: rows.length },
            { key: 'attention', label: 'Needs Attention', count: attentionCount, tone: 'pend' },
            {
              key: 'active',
              label: 'Active',
              count: rows.filter((source) => source.status === 'ACTIVE').length,
            },
            {
              key: 'paused',
              label: 'Paused',
              count: rows.filter((source) => source.status === 'PAUSED').length,
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="page-header-action"
            onClick={() => void handleRunDueSources()}
            disabled={runningDueSources}
          >
            <RefreshCcw className={`h-4 w-4 ${runningDueSources ? 'animate-spin' : ''}`} />
            <span>{runningDueSources ? 'Running Due…' : 'Run Due Sources'}</span>
          </button>
          <button
            type="button"
            className="page-header-action"
            onClick={() => {
              setCreateError('');
              setNotice('');
              updateSearchParams({ focus: 'new' });
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Monitored Source</span>
          </button>
        </div>
      </div>

      <div className="admin-list">
        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Label, Publisher, Place</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search monitored sources"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="flex flex-wrap gap-3">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])
                  }
                  className="admin-list-cell-select"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? 'All statuses' : formatReporterMonitoredSourceEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Scope</span>
                <select
                  value={scopeFilter}
                  onChange={(event) =>
                    setScopeFilter(event.target.value as (typeof SCOPE_FILTER_OPTIONS)[number])
                  }
                  className="admin-list-cell-select"
                >
                  {SCOPE_FILTER_OPTIONS.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope === 'ALL' ? 'All scopes' : formatReporterMonitoredSourceEnumLabel(scope)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="admin-list-cell-select"
                >
                  <option value="all">All types</option>
                  {REPORTER_MONITORED_SOURCE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {formatReporterMonitoredSourceEnumLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />

        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Source</th>
                <th className="admin-list-header-cell">Scope</th>
                <th className="admin-list-header-cell">Type</th>
                <th className="admin-list-header-cell">Cadence</th>
                <th className="admin-list-header-cell">Health</th>
                <th className="admin-list-header-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={6}>
                    No monitored sources match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((source) => {
                  const latestFetch = source.fetches[0] || null;

                  return (
                    <tr key={source.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-medium text-slate-900">{source.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {source.publisher || 'Unspecified publisher'}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <Link
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-list-link"
                          >
                            Open source
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleRunFetch(source.id)}
                            className="admin-list-link inline-flex items-center gap-1"
                            disabled={
                              runningFetchSourceId === source.id ||
                              source.status === 'ARCHIVED' ||
                              source.executionLane !== 'SERVER_FETCH'
                            }
                            title={
                              source.executionLane !== 'SERVER_FETCH'
                                ? 'Local browser sources run through the browser worker, not server fetch.'
                                : undefined
                            }
                          >
                            <RefreshCcw className={`h-3.5 w-3.5 ${runningFetchSourceId === source.id ? 'animate-spin' : ''}`} />
                            <span>
                              {source.executionLane !== 'SERVER_FETCH'
                                ? 'Browser worker'
                                : runningFetchSourceId === source.id
                                  ? 'Fetching…'
                                  : 'Fetch now'}
                            </span>
                          </button>
                        </div>
                        {source.ingestionItems.length > 0 ? (
                          <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
                              View recent items ({source.ingestionItems.length})
                            </summary>
                            <div className="mt-3 space-y-3">
                              {source.ingestionItems.map((item) => {
                                const itemSignal = itemSignalById.get(item.id);

                                return (
                                  <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                                  >
                                  {suggestedRunsByItemId.get(item.id)?.length ? (
                                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                                        Possible Existing Runs
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {suggestedRunsByItemId.get(item.id)!.map((run) => (
                                          <button
                                            key={run.id}
                                            type="button"
                                            className="inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-800 shadow-sm transition hover:border-amber-500 hover:bg-amber-100"
                                            onClick={() => {
                                              setSelectedRunId(run.id);
                                              openAttachDialog(source, item);
                                            }}
                                          >
                                            {(run.title || run.topic).slice(0, 48)} • {run.status}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      {item.canonicalUrl ? (
                                        <a
                                          href={item.canonicalUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="admin-list-link block max-w-[320px] truncate text-sm font-medium text-slate-900 md:max-w-[420px]"
                                          title={item.title}
                                        >
                                          {item.title}
                                        </a>
                                      ) : (
                                        <div
                                          className="max-w-[320px] truncate text-sm font-medium text-slate-900 md:max-w-[420px]"
                                          title={item.title}
                                        >
                                          {item.title}
                                        </div>
                                      )}
                                      <div className="mt-1 text-xs text-slate-500">
                                        {item.publisher || source.publisher || 'Unknown publisher'}
                                      </div>
                                      {itemSignal ? (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <AdminChip tone={storySignalTone(itemSignal.level)}>
                                            {storySignalLabel(itemSignal.level)}
                                          </AdminChip>
                                          <span className="text-[11px] text-slate-500">
                                            score {itemSignal.score}
                                          </span>
                                        </div>
                                      ) : null}
                                      {itemKeywordMatchesById.get(item.id)?.length ? (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {itemKeywordMatchesById.get(item.id)!.map((keyword) => (
                                            <span
                                              key={keyword}
                                              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800"
                                            >
                                              Match: {keyword}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                      <div>Published {formatDate(item.publishedAt)}</div>
                                      <div>Seen {formatDateTime(item.lastSeenAt)}</div>
                                    </div>
                                  </div>
                                  {item.excerpt ? (
                                    <div
                                      className="mt-2 max-w-[520px] text-xs leading-5 text-slate-600"
                                      title={item.excerpt}
                                    >
                                      {item.excerpt}
                                    </div>
                                  ) : null}
                                  {itemSignal?.reasons.length ? (
                                    <div className="mt-2 text-[11px] text-slate-500">
                                      {itemSignal.reasons.join(' • ')}
                                    </div>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => void handleCreateReporterRunFromItem(source, item)}
                                      disabled={creatingRunItemId === item.id}
                                    >
                                      {creatingRunItemId === item.id ? 'Creating…' : 'Create Reporter Run'}
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => openAttachDialog(source, item)}
                                      disabled={reporterRuns.length === 0}
                                    >
                                      Attach To Existing Run
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-red-300 bg-red-50 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700 shadow-sm transition hover:border-red-600 hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                                      onClick={() => void handleDeleteIngestionItem(source, item)}
                                      disabled={deletingItemId === item.id}
                                    >
                                      {deletingItemId === item.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              );
                              })}
                            </div>
                          </details>
                        ) : source._count.ingestionItems > 0 ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            Items exist for this source, but the current view did not load any recent item records.
                          </div>
                        ) : null}
                      </td>
                      <td className="admin-list-cell">
                        <select
                          value={source.coverageScope}
                          onChange={(event) => void handleCoverageScopeChange(source.id, event.target.value)}
                          className="admin-list-cell-select min-w-[9rem]"
                          disabled={updatingSourceId === source.id}
                        >
                          {REPORTER_COVERAGE_SCOPE_OPTIONS.map((scope) => (
                            <option key={scope} value={scope}>
                              {formatReporterMonitoredSourceEnumLabel(scope)}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 text-sm text-slate-900">
                          {source.place?.displayName || 'Tenant-wide'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {source._count.ingestionItems} item{source._count.ingestionItems === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <div>{formatReporterMonitoredSourceEnumLabel(source.sourceType)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatReporterMonitoredSourceEnumLabel(source.sourceFormat)}
                        </div>
                        <select
                          value={source.executionLane}
                          onChange={(event) => void handleExecutionLaneChange(source.id, event.target.value)}
                          className="admin-list-cell-select mt-2 min-w-[11rem]"
                          disabled={updatingSourceId === source.id}
                        >
                          {REPORTER_MONITORED_SOURCE_EXECUTION_LANE_OPTIONS.map((lane) => (
                            <option key={lane} value={lane}>
                              {formatReporterMonitoredSourceEnumLabel(lane)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="admin-list-cell">
                        <div>{formatCadence(source.fetchFrequencyMinutes)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Last change {formatDateTime(source.lastChangedAt)}
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <AdminChip tone={healthTone(source)}>{healthLabel(source)}</AdminChip>
                        <div className="mt-2 text-xs text-slate-500">
                          Last success {formatDateTime(source.lastSuccessfulAt)}
                        </div>
                        {latestFetch ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Latest fetch {formatReporterMonitoredSourceEnumLabel(latestFetch.status)} ·{' '}
                            {latestFetch.newItemCount} new · {latestFetch.changedItemCount} changed
                          </div>
                        ) : null}
                        {source.lastErrorMessage ? (
                          <div className="mt-1 text-xs text-red-700">{source.lastErrorMessage}</div>
                        ) : null}
                      </td>
                      <td className="admin-list-cell">
                        <select
                          value={source.status}
                          onChange={(event) => void handleStatusChange(source.id, event.target.value)}
                          className="admin-list-cell-select min-w-[10rem]"
                          disabled={updatingSourceId === source.id}
                        >
                          {REPORTER_MONITORED_SOURCE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatReporterMonitoredSourceEnumLabel(status)}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 text-xs text-slate-500">
                          Last fetch {formatDateTime(source.lastFetchedAt)}
                          {source.lastHttpStatus ? ` · HTTP ${source.lastHttpStatus}` : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDrawer title="New Monitored Source" focusKey="new">
        <form onSubmit={handleCreateSource} className="space-y-4">
          {createError ? <div className="admin-list-error">{createError}</div> : null}

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Label</span>
            <input
              type="text"
              value={createForm.label}
              onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))}
              className="form-input"
              placeholder="Cambria Heights council agendas"
              required
            />
          </label>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">URL</span>
            <input
              type="text"
              value={createForm.url}
              onChange={(event) => setCreateForm((current) => ({ ...current, url: event.target.value }))}
              className="form-input"
              placeholder="https://example.gov/agendas"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Type</span>
              <select
                value={createForm.sourceType}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, sourceType: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_MONITORED_SOURCE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatReporterMonitoredSourceEnumLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Scope</span>
              <select
                value={createForm.coverageScope}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, coverageScope: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_COVERAGE_SCOPE_OPTIONS.map((scope) => (
                  <option key={scope} value={scope}>
                    {formatReporterMonitoredSourceEnumLabel(scope)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Format</span>
              <select
                value={createForm.sourceFormat}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, sourceFormat: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_MONITORED_SOURCE_FORMAT_OPTIONS.map((format) => (
                  <option key={format} value={format}>
                    {formatReporterMonitoredSourceEnumLabel(format)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Execution Lane</span>
              <select
                value={createForm.executionLane}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, executionLane: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_MONITORED_SOURCE_EXECUTION_LANE_OPTIONS.map((lane) => (
                  <option key={lane} value={lane}>
                    {formatReporterMonitoredSourceEnumLabel(lane)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Coverage Place</span>
              <select
                value={createForm.placeId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, placeId: event.target.value }))
                }
                className="form-input"
              >
                <option value="">Tenant-wide</option>
                {coveragePlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Fetch Every</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={createForm.fetchFrequencyHours}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      fetchFrequencyHours: event.target.value,
                    }))
                  }
                  className="form-input"
                  required
                />
                <span className="text-sm text-slate-500">hours</span>
              </div>
            </label>
          </div>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Publisher</span>
            <input
              type="text"
              value={createForm.publisher}
              onChange={(event) => setCreateForm((current) => ({ ...current, publisher: event.target.value }))}
              className="form-input"
              placeholder="Cambria Heights Borough"
            />
          </label>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Notes</span>
            <textarea
              value={createForm.notes}
              onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
              className="form-input min-h-[120px]"
              placeholder="Why this source matters, expected update pattern, or fetch caveats."
            />
          </label>

          <button type="submit" className="page-header-action" disabled={isCreating}>
            {isCreating ? 'Saving…' : 'Create Source'}
          </button>
        </form>
      </AdminDrawer>

      <AdminDrawer title="Create Draft Event" focusKey="draft-event">
        {draftEventDialog ? (
          <form onSubmit={handleCreateDraftEvent} className="space-y-4">
            {draftEventError ? <div className="admin-list-error">{draftEventError}</div> : null}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              This creates a normal `Pending Review` event from the selected reporter candidate.
            </div>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Title</span>
              <input
                type="text"
                value={draftEventDialog.title}
                onChange={(event) =>
                  setDraftEventDialog((current) =>
                    current ? { ...current, title: event.target.value } : current
                  )
                }
                className="form-input"
                required
              />
            </label>

            <div className="admin-list-filter">
              <span className="admin-list-filter-label">Description</span>
              <TipTapEditor
                content={draftEventDialog.description}
                onChange={(description) =>
                  setDraftEventDialog((current) =>
                    current ? { ...current, description } : current
                  )
                }
                placeholder="Describe the event, schedule, audience, and any details attendees need."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Start Date</span>
                <input
                  type="date"
                  value={draftEventDialog.startDate}
                  onChange={(event) =>
                    setDraftEventDialog((current) =>
                      current ? { ...current, startDate: event.target.value } : current
                    )
                  }
                  className="form-input"
                  required
                />
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Start Time</span>
                <input
                  type="time"
                  value={draftEventDialog.startTime}
                  onChange={(event) =>
                    setDraftEventDialog((current) =>
                      current ? { ...current, startTime: event.target.value } : current
                    )
                  }
                  className="form-input"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">End Date</span>
                <input
                  type="date"
                  value={draftEventDialog.endDate}
                  onChange={(event) =>
                    setDraftEventDialog((current) =>
                      current ? { ...current, endDate: event.target.value } : current
                    )
                  }
                  className="form-input"
                />
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">End Time</span>
                <input
                  type="time"
                  value={draftEventDialog.endTime}
                  onChange={(event) =>
                    setDraftEventDialog((current) =>
                      current ? { ...current, endTime: event.target.value } : current
                    )
                  }
                  className="form-input"
                />
              </label>
            </div>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Venue Label</span>
              <input
                type="text"
                value={draftEventDialog.venueLabel}
                onChange={(event) =>
                  setDraftEventDialog((current) =>
                    current ? { ...current, venueLabel: event.target.value } : current
                  )
                }
                className="form-input"
                placeholder="Borough Building"
              />
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Image URL</span>
              <input
                type="url"
                value={draftEventDialog.imageUrl}
                onChange={(event) =>
                  setDraftEventDialog((current) =>
                    current ? { ...current, imageUrl: event.target.value } : current
                  )
                }
                className="form-input"
                placeholder="https://example.com/event-image.jpg"
              />
            </label>

            {draftEventDialog.sourceUrl ? (
              <div className="admin-list-filter">
                <span className="admin-list-filter-label">Original Source</span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <a
                    href={draftEventDialog.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sky-700 underline underline-offset-2"
                  >
                    {draftEventDialog.sourceUrl}
                  </a>
                </div>
              </div>
            ) : null}

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Location</span>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="text"
                  value={draftEventLocationQuery}
                  onChange={(event) => setDraftEventLocationQuery(event.target.value)}
                  className="form-input"
                  placeholder="Start typing a venue, street, city, or ZIP"
                />

                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {filteredDraftEventLocations.length > 0 ? (
                    filteredDraftEventLocations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() =>
                          setDraftEventDialog((current) =>
                            current ? { ...current, locationId: location.id } : current
                          )
                        }
                        className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left text-sm ${
                          draftEventDialog.locationId === location.id
                            ? 'bg-slate-950 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>
                          <span className="block font-semibold">{formatLocationPrimary(location)}</span>
                          <span className="block text-xs opacity-75">{formatLocationSecondary(location)}</span>
                        </span>
                      </button>
                    ))
                  ) : draftEventLocationQuery.trim() ? (
                    <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
                      No locations match that search.
                    </div>
                  ) : (
                    <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
                      Start typing to search saved locations.
                    </div>
                  )}
                </div>

                {selectedDraftEventLocation ? (
                  <p className="text-sm text-slate-600">
                    Selected:{' '}
                    <span className="font-semibold text-slate-900">
                      {formatLocationSearchLabel(selectedDraftEventLocation)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Start typing, then choose one of the matching saved locations.
                  </p>
                )}
              </div>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Organization</span>
              <select
                value={draftEventDialog.organizationId}
                onChange={(event) =>
                  setDraftEventDialog((current) =>
                    current ? { ...current, organizationId: event.target.value } : current
                  )
                }
                className="form-input"
                required
              >
                <option value="">Choose an organization…</option>
                {eventOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                    {organization.status === 'APPROVED' ? '' : ' · Pending'}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="page-header-action" disabled={creatingDraftEvent}>
              {creatingDraftEvent ? 'Creating…' : 'Create Draft Event'}
            </button>
          </form>
        ) : (
          <div className="text-sm text-slate-500">Select an event candidate first.</div>
        )}
      </AdminDrawer>

      <AdminDrawer title="Attach To Existing Reporter Run" focusKey="attach-run">
        {attachDialog ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">{attachDialog.item.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                From monitored source: {attachDialog.source.label}
              </div>
              {attachDialog.item.excerpt ? (
                <div className="mt-2 text-xs leading-5 text-slate-600">
                  {attachDialog.item.excerpt}
                </div>
              ) : null}
            </div>

            {reporterRuns.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                There are no open reporter runs to attach this item to.
              </div>
            ) : (
              <div className="space-y-4">
                {attachDialog && suggestedRunsByItemId.get(attachDialog.item.id)?.length ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Suggested Runs
                    </div>
                    <div className="mt-2 space-y-2">
                      {suggestedRunsByItemId.get(attachDialog.item.id)!.map((run) => (
                        <label
                          key={run.id}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-white px-3 py-3"
                        >
                          <input
                            type="radio"
                            name="suggested-run"
                            checked={selectedRunId === run.id}
                            onChange={() => setSelectedRunId(run.id)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {run.title || run.topic}
                            </div>
                            <div className="text-xs text-slate-500">
                              {run.status} • similarity score {run.score}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label className="admin-list-filter">
                  <span className="admin-list-filter-label">Reporter Run</span>
                  <select
                    value={selectedRunId}
                    onChange={(event) => setSelectedRunId(event.target.value)}
                    className="form-input"
                  >
                    {reporterRuns.map((run) => (
                      <option key={run.id} value={run.id}>
                        {(run.title || run.topic).slice(0, 100)} • {run.status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="admin-list-cell-button"
                onClick={() => {
                  setAttachDialog(null);
                  setSelectedRunId('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="page-header-action"
                onClick={() => void handleAttachItemToExistingRun()}
                disabled={!selectedRunId || attachingRunItemId === attachDialog.item.id}
              >
                {attachingRunItemId === attachDialog.item.id ? 'Attaching…' : 'Attach To Run'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Select an item first.</div>
        )}
      </AdminDrawer>
    </div>
  );
}
