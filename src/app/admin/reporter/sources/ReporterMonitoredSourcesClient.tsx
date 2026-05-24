'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import {
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
}

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
  sourcePlaceName: string | null;
};

type StoryPacketCluster = {
  id: string;
  title: string;
  items: MonitoredIngestionStoryItem[];
  sourceCount: number;
  latestAt: string | Date;
  matchedKeywords: string[];
};

type StorySignalAssessment = {
  level: 'likely' | 'possible' | 'low';
  score: number;
  reasons: string[];
};

const STATUS_OPTIONS = ['ALL', ...REPORTER_MONITORED_SOURCE_STATUS_OPTIONS] as const;

const EMPTY_CREATE_FORM = {
  label: '',
  sourceType: 'MUNICIPAL_NOTICES',
  sourceFormat: 'HTML',
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

function scoreItemSimilarity(a: MonitoredIngestionStoryItem, b: MonitoredIngestionStoryItem) {
  const aTokens = buildStoryTokenSet(`${a.title} ${a.excerpt || ''}`);
  const bTokens = buildStoryTokenSet(`${b.title} ${b.excerpt || ''}`);

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }

  const aTitle = normalizeStoryText(a.title);
  const bTitle = normalizeStoryText(b.title);
  const titleBoost =
    aTitle && bTitle && (aTitle.includes(bTitle) || bTitle.includes(aTitle)) ? 2 : 0;

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

function assessStoryPacketSignal(packet: StoryPacketCluster) {
  let score = 0;
  const reasons: string[] = [];
  const civicSignalCount = countCivicSignalTerms(
    packet.items.map((item) => [item.title, item.excerpt].filter(Boolean).join(' ')).join(' ')
  );
  const recentItems = packet.items.filter((item) => {
    const ageHours = Math.max(0, (Date.now() - getItemActivityTime(item)) / (1000 * 60 * 60));
    return ageHours <= 72;
  }).length;

  if (packet.sourceCount >= 2) {
    score += Math.min(4, packet.sourceCount);
    reasons.push(`appears across ${packet.sourceCount} sources`);
  }

  if (packet.matchedKeywords.length > 0) {
    score += Math.min(3, packet.matchedKeywords.length);
    reasons.push(`matches ${packet.matchedKeywords.length} tenant term${packet.matchedKeywords.length === 1 ? '' : 's'}`);
  }

  if (civicSignalCount > 0) {
    score += Math.min(3, civicSignalCount);
    reasons.push('contains civic/public-interest language');
  }

  if (recentItems > 0) {
    score += 1;
    reasons.push('has recent activity');
  }

  if (score >= 7) {
    return { level: 'likely', score, reasons: reasons.slice(0, 3) } satisfies StorySignalAssessment;
  }

  if (score >= 4) {
    return { level: 'possible', score, reasons: reasons.slice(0, 3) } satisfies StorySignalAssessment;
  }

  return {
    level: 'low',
    score,
    reasons: reasons.length ? reasons.slice(0, 2) : ['weak packet signal'],
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

export default function ReporterMonitoredSourcesClient({
  sources,
  coveragePlaces,
  reporterRuns,
  tenantKeywordsText: initialTenantKeywordsText,
}: ReporterMonitoredSourcesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'all';

  const [rows, setRows] = useState(sources);
  const [query, setQuery] = useState('');
  const [tenantKeywordsText, setTenantKeywordsText] = useState(initialTenantKeywordsText);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [updatingSourceId, setUpdatingSourceId] = useState<string | null>(null);
  const [runningFetchSourceId, setRunningFetchSourceId] = useState<string | null>(null);
  const [runningDueSources, setRunningDueSources] = useState(false);
  const [creatingRunItemId, setCreatingRunItemId] = useState<string | null>(null);
  const [creatingRunPacketId, setCreatingRunPacketId] = useState<string | null>(null);
  const [attachDialog, setAttachDialog] = useState<AttachDialogState>(null);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [attachingRunItemId, setAttachingRunItemId] = useState<string | null>(null);
  const [isSavingTenantKeywords, setIsSavingTenantKeywords] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  const storyPackets = useMemo<StoryPacketCluster[]>(() => {
    const remaining = [...recentStoryItems];
    const clusters: StoryPacketCluster[] = [];

    while (remaining.length > 0) {
      const seed = remaining.shift()!;
      const clusterItems = [seed];

      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        const candidate = remaining[index];
        const score = scoreItemSimilarity(seed, candidate);
        if (score >= 3) {
          clusterItems.push(candidate);
          remaining.splice(index, 1);
        }
      }

      const distinctSourceCount = new Set(clusterItems.map((item) => item.sourceId)).size;
      if (clusterItems.length >= 2 && distinctSourceCount >= 2) {
        clusterItems.sort((a, b) => getItemActivityTime(b) - getItemActivityTime(a));
        const matchedKeywords = Array.from(
          new Set(clusterItems.flatMap((item) => itemKeywordMatchesById.get(item.id) || []))
        );
        clusters.push({
          id: `packet-${seed.id}`,
          title: clusterItems[0].title,
          items: clusterItems,
          sourceCount: distinctSourceCount,
          latestAt: clusterItems[0].publishedAt || clusterItems[0].lastSeenAt,
          matchedKeywords,
        });
      }
    }

    return clusters
      .sort((a, b) => {
        const aSignal = assessStoryPacketSignal(a);
        const bSignal = assessStoryPacketSignal(b);
        if (bSignal.score !== aSignal.score) {
          return bSignal.score - aSignal.score;
        }
        return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
      })
      .slice(0, 8);
  }, [itemKeywordMatchesById, recentStoryItems]);

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
        source.url,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeView, query, rows, statusFilter, typeFilter]);

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
          url: createForm.url,
          publisher: createForm.publisher,
          notes: createForm.notes,
          placeId: createForm.placeId || null,
          fetchFrequencyMinutes: Number(createForm.fetchFrequencyHours) * 60,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create monitored source');
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

  async function handleCreateReporterRunFromPacket(packet: StoryPacketCluster) {
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
            ...(packet.matchedKeywords.length
              ? [`Tenant keyword matches: ${packet.matchedKeywords.join(', ')}`]
              : []),
            ...packet.items.map(
              (item) =>
                `${item.sourceLabel}: ${item.title}${item.canonicalUrl ? ` (${item.canonicalUrl})` : ''}`
            ),
          ].join('\n'),
          supportingLinks,
          initialSources: packet.items.map((item) => ({
            sourceType: item.canonicalUrl ? 'NEWS_ARTICLE' : 'STAFF_NOTE',
            title: item.title,
            url: item.canonicalUrl,
            excerpt: item.excerpt,
            contentText: item.excerpt,
            note: `From monitored source: ${item.sourceLabel}`,
            reliabilityTier: 'UNVERIFIED',
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reporter run from story packet');
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

      {storyPackets.length > 0 ? (
        <div className="rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.95),rgba(248,250,252,0.98))] px-5 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                Story Packets
              </div>
              <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                Possible Multi-Source Stories
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                These clusters group similar recent items across different monitored sources so
                you can start one reporter run with a fuller source packet.
              </p>
            </div>
            <div className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
              {storyPackets.length} packet{storyPackets.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {storyPackets.map((packet) => {
              const packetSignal = assessStoryPacketSignal(packet);

              return (
                <div
                  key={packet.id}
                  className="rounded-3xl border border-sky-100 bg-white px-4 py-4 shadow-sm"
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-slate-950">{packet.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {packet.sourceCount} source{packet.sourceCount === 1 ? '' : 's'} •{' '}
                      {packet.items.length} item{packet.items.length === 1 ? '' : 's'} • latest{' '}
                      {formatDateTime(packet.latestAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <AdminChip tone={storySignalTone(packetSignal.level)}>
                        {storySignalLabel(packetSignal.level)}
                      </AdminChip>
                      <span className="text-xs text-slate-500">score {packetSignal.score}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {packetSignal.reasons.join(' • ')}
                    </div>
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
                  <button
                    type="button"
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 shadow-sm transition hover:border-sky-600 hover:bg-sky-100 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleCreateReporterRunFromPacket(packet)}
                    disabled={creatingRunPacketId === packet.id}
                  >
                    {creatingRunPacketId === packet.id ? 'Creating…' : 'Create Run From Packet'}
                  </button>
                </div>

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
            );
            })}
          </div>
        </div>
      ) : null}

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
                            disabled={runningFetchSourceId === source.id || source.status === 'ARCHIVED'}
                          >
                            <RefreshCcw className={`h-3.5 w-3.5 ${runningFetchSourceId === source.id ? 'animate-spin' : ''}`} />
                            <span>{runningFetchSourceId === source.id ? 'Fetching…' : 'Fetch now'}</span>
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
                        <div className="text-sm text-slate-900">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
