import type { Prisma, ReporterCandidateType, ReporterCoverageScope } from '@prisma/client';
import { ReporterStorySignalLevel } from '@prisma/client';
import { db } from '@/lib/db';
import {
  findReporterTenantKeywordMatches,
  parseReporterTenantKeywords,
  REPORTER_TENANT_KEYWORDS_SETTING_KEY,
} from './tenant-keywords';
import { REPORTER_EVENT_ORIENTED_SOURCE_TYPE_OPTIONS } from './monitored-sources';

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

const EVENT_SIGNAL_TERMS = [
  'agenda',
  'concert',
  'conference',
  'event',
  'exhibit',
  'fair',
  'festival',
  'forum',
  'hearing',
  'meeting',
  'open house',
  'parade',
  'presentation',
  'reading',
  'ribbon cutting',
  'summit',
  'town hall',
  'workshop',
] as const;

const DEFAULT_LOOKBACK_DAYS = 10;
const DEFAULT_MAX_INGESTION_ITEMS = 250;
const DEFAULT_MAX_CANDIDATES = 12;
const STORY_CLUSTER_THRESHOLD = 3;
const COVERAGE_SCOPE_LOCAL = 'LOCAL' as ReporterCoverageScope;
const COVERAGE_SCOPE_COUNTY = 'COUNTY' as ReporterCoverageScope;
const COVERAGE_SCOPE_STATE = 'STATE' as ReporterCoverageScope;
const COVERAGE_SCOPE_NATIONAL = 'NATIONAL' as ReporterCoverageScope;
const DEFAULT_COVERAGE_SCOPE = COVERAGE_SCOPE_LOCAL;
const CANDIDATE_TYPE_ARTICLE_ONLY = 'ARTICLE_ONLY' as ReporterCandidateType;
const CANDIDATE_TYPE_EVENT_ONLY = 'EVENT_ONLY' as ReporterCandidateType;
const CANDIDATE_TYPE_EVENT_AND_ARTICLE = 'EVENT_AND_ARTICLE' as ReporterCandidateType;
const CANDIDATE_TYPE_NEITHER = 'NEITHER' as ReporterCandidateType;

type CandidateIngestionItem = {
  id: string;
  title: string;
  canonicalUrl: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  publisher: string | null;
  excerpt: string | null;
  metadataJson?: Prisma.JsonValue | null;
  monitoredSource: {
    id: string;
    label: string;
    sourceType: string;
    coverageScope?: ReporterCoverageScope | null;
    place: {
      id: string;
      displayName: string;
      slug: string;
      type: string;
    } | null;
  };
};

type CandidateWorkItem = {
  id: string;
  title: string;
  canonicalUrl: string | null;
  publishedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  publisher: string | null;
  excerpt: string | null;
  metadataJson?: Prisma.JsonValue | null;
  sourceId: string;
  sourceLabel: string;
  sourceType: string;
  sourceCoverageScope: ReporterCoverageScope;
  sourcePlaceId: string | null;
  sourcePlaceName: string | null;
};

type StorySignalView = {
  level: 'likely' | 'possible' | 'low';
  score: number;
  reasons: string[];
};

type EventExtractionView = {
  title: string;
  summary: string | null;
  startAt: Date | null;
  endAt: Date | null;
  location: string | null;
  organizer: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  isRecurring: boolean;
  recurrenceText: string | null;
  confidence: 'high' | 'medium' | 'low';
  missingFields: string[];
};

type CreatedEventView = {
  id: string;
  title: string;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  startDatetime: Date;
};

type StoryCandidateReadinessView = {
  level: 'unclaimed' | 'draftable' | 'needs-reporting' | 'blocked';
  label: string;
  reason: string;
  actionableClaimCount: number;
  supportedClaimCount: number;
  followUpClaimCount: number;
  blockerCount: number;
};

export type ReporterStoryCandidateView = {
  id: string;
  placeId: string | null;
  title: string;
  summary: string | null;
  candidateType: ReporterCandidateType;
  coverageScopes: ReporterCoverageScope[];
  eventExtraction: EventExtractionView | null;
  canSeedDraftEvent: boolean;
  createdEvents: CreatedEventView[];
  sourceCount: number;
  itemCount: number;
  latestAt: Date;
  matchedKeywords: string[];
  linkedReporterRun: {
    id: string;
    title: string | null;
    topic: string;
    status: string;
  } | null;
  readiness: StoryCandidateReadinessView;
  signal: StorySignalView;
  items: Array<{
    id: string;
    title: string;
    canonicalUrl: string | null;
    publishedAt: Date | null;
    firstSeenAt: Date;
    lastSeenAt: Date;
    publisher: string | null;
    excerpt: string | null;
    sourceId: string;
    sourceLabel: string;
    sourceType: string;
    sourceCoverageScope: ReporterCoverageScope;
    sourcePlaceName: string | null;
  }>;
};

const EVENT_ORIENTED_SOURCE_TYPE_SET = new Set<string>(REPORTER_EVENT_ORIENTED_SOURCE_TYPE_OPTIONS);

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

function normalizeCoverageScope(value: ReporterCoverageScope | string | null | undefined) {
  if (
    value === COVERAGE_SCOPE_LOCAL ||
    value === COVERAGE_SCOPE_COUNTY ||
    value === COVERAGE_SCOPE_STATE ||
    value === COVERAGE_SCOPE_NATIONAL
  ) {
    return value;
  }

  return DEFAULT_COVERAGE_SCOPE;
}

function normalizeCoverageScopes(values: Array<ReporterCoverageScope | string> | null | undefined) {
  const scopes = Array.from(new Set((values || []).map(normalizeCoverageScope)));
  return scopes.length ? scopes : [DEFAULT_COVERAGE_SCOPE];
}

function pickCoverageScopes(items: CandidateWorkItem[]) {
  return normalizeCoverageScopes(items.map((item) => item.sourceCoverageScope));
}

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readJsonString(
  value: Prisma.JsonObject | null | undefined,
  keys: string[]
): string | null {
  if (!value) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function readJsonBoolean(
  value: Prisma.JsonObject | null | undefined,
  keys: string[]
): boolean | null {
  if (!value) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'boolean') {
      return candidate;
    }
  }

  return null;
}

function readJsonDate(
  value: Prisma.JsonObject | null | undefined,
  keys: string[]
): Date | null {
  const text = readJsonString(value, keys);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractEventDateFromText(value: string | null | undefined) {
  const normalized = normalizeStoryText(value);
  if (!normalized) {
    return null;
  }

  const match =
    normalized.match(
      /\b(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}\b/i
    )?.[0] ||
    normalized.match(
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\.?\s+\d{4}\b/i
    )?.[0] ||
    normalized.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ||
    null;

  if (!match) {
    return null;
  }

  const parsed = new Date(match);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractEventLocationFromText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match =
    value.match(/\b(?:at|location:)\s+([A-Z][A-Za-z0-9&.'\- ]{4,80})/)?.[1] ||
    value.match(/\b(?:held|meet|meeting)\s+at\s+([A-Z][A-Za-z0-9&.'\- ]{4,80})/)?.[1] ||
    null;

  return match?.trim() || null;
}

function extractEventTimeHint(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return (
    value.match(/\b\d{1,2}:\d{2}\s?(?:a\.?m\.?|p\.?m\.?)\b/i)?.[0] ||
    value.match(/\b\d{1,2}\s?(?:a\.?m\.?|p\.?m\.?)\b/i)?.[0] ||
    null
  );
}

function detectRecurringText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const lowered = value.toLowerCase();
  if (
    lowered.includes('weekly') ||
    lowered.includes('monthly') ||
    lowered.includes('every saturday') ||
    lowered.includes('every sunday') ||
    lowered.includes('every monday') ||
    lowered.includes('every tuesday') ||
    lowered.includes('every wednesday') ||
    lowered.includes('every thursday') ||
    lowered.includes('every friday') ||
    lowered.includes('recurring')
  ) {
    return value;
  }

  return null;
}

function extractOrganizerFromMetadata(metadata: Prisma.JsonObject | null | undefined) {
  return readJsonString(metadata, ['organizer', 'publisher', 'host']);
}

function extractStructuredEvent(item: CandidateWorkItem): EventExtractionView | null {
  const metadata = isJsonObject(item.metadataJson) ? item.metadataJson : null;
  const schemaType = readJsonString(metadata, ['schemaType']);
  const format = readJsonString(metadata, ['format']);
  const title = item.title.trim();
  const summary = item.excerpt?.trim() || null;
  const sourceUrl = item.canonicalUrl;
  const textSource = [item.title, item.excerpt, item.publisher].filter(Boolean).join(' ');

  const metadataStartAt = readJsonDate(metadata, [
    'eventStartAt',
    'startDate',
    'datePublished',
  ]);
  const metadataEndAt = readJsonDate(metadata, ['eventEndAt', 'endDate']);
  const textStartAt = extractEventDateFromText(textSource);
  const startAt = metadataStartAt || item.publishedAt || textStartAt;
  const endAt = metadataEndAt;
  const location =
    readJsonString(metadata, ['eventLocation', 'location']) || extractEventLocationFromText(item.excerpt);
  const organizer = extractOrganizerFromMetadata(metadata) || item.publisher || null;
  const imageUrl = readJsonString(metadata, ['imageUrl']);
  const recurrenceText = detectRecurringText(textSource);
  const isRecurring = Boolean(readJsonBoolean(metadata, ['isRecurring'])) || Boolean(recurrenceText);

  let eventSignal = 0;
  if (format === 'ICS') {
    eventSignal += 4;
  }
  if (schemaType?.toLowerCase() === 'event') {
    eventSignal += 4;
  }
  if (EVENT_SIGNAL_TERMS.some((term) => textSource.toLowerCase().includes(term))) {
    eventSignal += 2;
  }
  if (startAt) {
    eventSignal += 1;
  }
  if (location) {
    eventSignal += 1;
  }
  if (extractEventTimeHint(textSource)) {
    eventSignal += 1;
  }

  if (eventSignal < 3) {
    return null;
  }

  const missingFields = [
    !startAt ? 'start' : null,
    !location ? 'location' : null,
    !organizer ? 'organizer' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    title,
    summary,
    startAt,
    endAt,
    location,
    organizer,
    imageUrl,
    sourceUrl,
    isRecurring,
    recurrenceText,
    confidence: eventSignal >= 7 ? 'high' : eventSignal >= 5 ? 'medium' : 'low',
    missingFields,
  };
}

function combineEventExtractions(items: CandidateWorkItem[]) {
  const eventItems = items
    .map((item) => ({ item, extraction: extractStructuredEvent(item) }))
    .filter((entry): entry is { item: CandidateWorkItem; extraction: EventExtractionView } => Boolean(entry.extraction));

  if (!eventItems.length) {
    return null;
  }

  const best = eventItems.sort((left, right) => {
    const confidenceWeight = { high: 3, medium: 2, low: 1 };
    const confidenceDelta =
      confidenceWeight[right.extraction.confidence] - confidenceWeight[left.extraction.confidence];
    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }
    return getItemActivityTime(right.item) - getItemActivityTime(left.item);
  })[0].extraction;

  return best;
}

function classifyCandidateType(params: {
  signalScore: number;
  eventExtraction: EventExtractionView | null;
  sourceCount: number;
  civicSignalCount: number;
}) {
  const articleSignal =
    params.signalScore +
    (params.sourceCount >= 2 ? 1 : 0) +
    (params.civicSignalCount > 0 ? 1 : 0);
  const hasEvent = Boolean(params.eventExtraction);

  if (hasEvent && articleSignal >= 7) {
    return CANDIDATE_TYPE_EVENT_AND_ARTICLE;
  }

  if (hasEvent) {
    return CANDIDATE_TYPE_EVENT_ONLY;
  }

  if (articleSignal >= 4) {
    return CANDIDATE_TYPE_ARTICLE_ONLY;
  }

  return CANDIDATE_TYPE_NEITHER;
}

function canSeedDraftEventFromItems(items: Array<{ sourceType: string }>) {
  return items.some((item) => EVENT_ORIENTED_SOURCE_TYPE_SET.has(item.sourceType));
}

function serializeEventExtraction(
  eventExtraction: EventExtractionView | null
): Prisma.InputJsonValue | undefined {
  if (!eventExtraction) {
    return undefined;
  }

  return {
    title: eventExtraction.title,
    summary: eventExtraction.summary,
    startAt: eventExtraction.startAt?.toISOString() || null,
    endAt: eventExtraction.endAt?.toISOString() || null,
    location: eventExtraction.location,
    organizer: eventExtraction.organizer,
    imageUrl: eventExtraction.imageUrl,
    sourceUrl: eventExtraction.sourceUrl,
    isRecurring: eventExtraction.isRecurring,
    recurrenceText: eventExtraction.recurrenceText,
    confidence: eventExtraction.confidence,
    missingFields: eventExtraction.missingFields,
  };
}

function scoreStoryItemSimilarity(a: CandidateWorkItem, b: CandidateWorkItem) {
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

function scoreStoryTextSimilarity(a: string | null | undefined, b: string | null | undefined) {
  const aTokens = buildStoryTokenSet(a);
  const bTokens = buildStoryTokenSet(b);

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }

  const normalizedA = normalizeStoryText(a);
  const normalizedB = normalizeStoryText(b);
  const titleBoost =
    normalizedA && normalizedB && (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA))
      ? 2
      : 0;

  return overlap + titleBoost;
}

function getItemActivityTime(item: {
  publishedAt: Date | null;
  lastSeenAt: Date;
  firstSeenAt: Date;
}) {
  return new Date(item.publishedAt || item.lastSeenAt || item.firstSeenAt).getTime();
}

function countCivicSignalTerms(value: string) {
  const lowered = normalizeStoryText(value);
  return CIVIC_SIGNAL_TERMS.filter((term) => lowered.includes(term)).length;
}

function compactSummary(items: CandidateWorkItem[]) {
  const excerpts = Array.from(
    new Set(
      items
        .map((item) => item.excerpt?.trim())
        .filter((excerpt): excerpt is string => Boolean(excerpt))
    )
  ).slice(0, 2);

  if (!excerpts.length) {
    return null;
  }

  return excerpts.join(' ');
}

function pickPrimaryPlaceId(items: CandidateWorkItem[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.sourcePlaceId) {
      continue;
    }
    counts.set(item.sourcePlaceId, (counts.get(item.sourcePlaceId) || 0) + 1);
  }

  let winner: string | null = null;
  let winnerCount = 0;
  for (const [placeId, count] of counts) {
    if (count > winnerCount) {
      winner = placeId;
      winnerCount = count;
    }
  }

  return winner;
}

function buildMatchedKeywords(items: CandidateWorkItem[], tenantKeywords: string[]) {
  return Array.from(
    new Set(
      items.flatMap((item) =>
        findReporterTenantKeywordMatches(
          [item.title, item.excerpt, item.sourceLabel, item.sourcePlaceName, item.publisher]
            .filter(Boolean)
            .join(' '),
          tenantKeywords
        )
      )
    )
  );
}

function assessStoryCandidateSignal(items: CandidateWorkItem[], matchedKeywords: string[]) {
  const representative = [...items].sort((a, b) => getItemActivityTime(b) - getItemActivityTime(a))[0];
  const combinedText = items.map((item) => [item.title, item.excerpt].filter(Boolean).join(' ')).join(' ');
  const civicSignalCount = countCivicSignalTerms(combinedText);
  const recentItemCount = items.filter((item) => {
    const ageHours = Math.max(0, (Date.now() - getItemActivityTime(item)) / (1000 * 60 * 60));
    return ageHours <= 72;
  }).length;
  const sourceCount = new Set(items.map((item) => item.sourceId)).size;
  const titleWordCount = tokenizeStoryText(representative?.title).length;

  let score = 0;
  const reasons: string[] = [];

  if (sourceCount >= 2) {
    score += Math.min(4, sourceCount);
    reasons.push(`appears across ${sourceCount} sources`);
  }

  if (matchedKeywords.length > 0) {
    score += Math.min(3, matchedKeywords.length);
    reasons.push(`matches ${matchedKeywords.length} tenant term${matchedKeywords.length === 1 ? '' : 's'}`);
  }

  if (representative?.canonicalUrl) {
    score += 2;
    reasons.push('has a direct article link');
  }

  if (representative?.excerpt && representative.excerpt.length >= 80) {
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

  if (recentItemCount > 0) {
    score += 1;
    reasons.push('has recent activity');
  }

  if (score >= 7) {
    return {
      signalLevel: ReporterStorySignalLevel.LIKELY,
      signal: { level: 'likely', score, reasons: reasons.slice(0, 3) } satisfies StorySignalView,
      civicSignalCount,
      recentItemCount,
    };
  }

  if (score >= 4) {
    return {
      signalLevel: ReporterStorySignalLevel.POSSIBLE,
      signal: { level: 'possible', score, reasons: reasons.slice(0, 3) } satisfies StorySignalView,
      civicSignalCount,
      recentItemCount,
    };
  }

  return {
    signalLevel: ReporterStorySignalLevel.LOW,
    signal: {
      level: 'low',
      score,
      reasons: reasons.length ? reasons.slice(0, 2) : ['weak story signal'],
    } satisfies StorySignalView,
    civicSignalCount,
    recentItemCount,
  };
}

function clusterStoryItems(items: CandidateWorkItem[]) {
  const remaining = [...items].sort((a, b) => getItemActivityTime(b) - getItemActivityTime(a));
  const clusters: CandidateWorkItem[][] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const clusterItems = [seed];

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index];
      if (scoreStoryItemSimilarity(seed, candidate) >= STORY_CLUSTER_THRESHOLD) {
        clusterItems.push(candidate);
        remaining.splice(index, 1);
      }
    }

    clusterItems.sort((a, b) => getItemActivityTime(b) - getItemActivityTime(a));
    clusters.push(clusterItems);
  }

  return clusters;
}

const storyCandidateSelect = {
  id: true,
  placeId: true,
  title: true,
  summary: true,
  candidateType: true,
  sourceCount: true,
  itemCount: true,
  latestSourceAt: true,
  matchedKeywords: true,
  coverageScopes: true,
  eventExtractionJson: true,
  createdEvents: {
    orderBy: [{ createdAt: 'desc' as const }],
    take: 3,
    select: {
      id: true,
      title: true,
      status: true,
      startDatetime: true,
    },
  },
  signalLevel: true,
  score: true,
  reasons: true,
  candidateItems: {
    orderBy: [{ sortOrder: 'asc' as const }],
    take: 8,
    select: {
      ingestionItem: {
        select: {
          id: true,
          title: true,
          canonicalUrl: true,
          publishedAt: true,
          firstSeenAt: true,
          lastSeenAt: true,
          publisher: true,
          excerpt: true,
          metadataJson: true,
          monitoredSource: {
            select: {
              id: true,
              label: true,
              sourceType: true,
              coverageScope: true,
              place: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
  },
  linkedReporterRun: {
    select: {
      id: true,
      title: true,
      topic: true,
      status: true,
      blockers: {
        where: {
          isResolved: false,
        },
        select: {
          id: true,
        },
      },
      claims: {
        select: {
          claimType: true,
          verificationStatus: true,
        },
      },
    },
  },
};

function mapSignalLevel(level: ReporterStorySignalLevel): StorySignalView['level'] {
  if (level === ReporterStorySignalLevel.LIKELY) {
    return 'likely';
  }
  if (level === ReporterStorySignalLevel.POSSIBLE) {
    return 'possible';
  }
  return 'low';
}

function buildCandidateReadiness(row: {
  linkedReporterRun: null | {
    id: string;
    title: string | null;
    topic: string;
    status: string;
    blockers: Array<{ id: string }>;
    claims: Array<{ claimType: string; verificationStatus: string }>;
  };
}) : StoryCandidateReadinessView {
  if (!row.linkedReporterRun) {
    return {
      level: 'unclaimed',
      label: 'Unclaimed Lead',
      reason: 'No reporter run is linked yet.',
      actionableClaimCount: 0,
      supportedClaimCount: 0,
      followUpClaimCount: 0,
      blockerCount: 0,
    };
  }

  const blockerCount = row.linkedReporterRun.blockers.length;
  const followUpClaimCount = row.linkedReporterRun.claims.filter(
    (claim) => claim.claimType === 'FOLLOW_UP_REQUIREMENT'
  ).length;
  const actionableClaimCount = row.linkedReporterRun.claims.filter(
    (claim) =>
      claim.verificationStatus === 'UNREVIEWED' ||
      claim.verificationStatus === 'NEEDS_CORROBORATION' ||
      claim.verificationStatus === 'DISPUTED' ||
      claim.claimType === 'FOLLOW_UP_REQUIREMENT'
  ).length;
  const supportedClaimCount = row.linkedReporterRun.claims.filter(
    (claim) => claim.verificationStatus === 'SUPPORTED'
  ).length;

  if (blockerCount > 0) {
    return {
      level: 'blocked',
      label: 'Blocked',
      reason: `${blockerCount} open blocker${blockerCount === 1 ? '' : 's'} on linked run.`,
      actionableClaimCount,
      supportedClaimCount,
      followUpClaimCount,
      blockerCount,
    };
  }

  if (supportedClaimCount > 0 && actionableClaimCount === 0) {
    return {
      level: 'draftable',
      label: 'Draftable',
      reason: 'Linked run has supported claims and no unresolved follow-up queue.',
      actionableClaimCount,
      supportedClaimCount,
      followUpClaimCount,
      blockerCount,
    };
  }

  return {
    level: 'needs-reporting',
    label: 'Needs Reporting',
    reason:
      actionableClaimCount > 0
        ? `${actionableClaimCount} claim${actionableClaimCount === 1 ? '' : 's'} still need review or corroboration.`
        : 'Linked run still needs stronger source-backed claims.',
    actionableClaimCount,
    supportedClaimCount,
    followUpClaimCount,
    blockerCount,
  };
}

function getReadinessSortWeight(level: StoryCandidateReadinessView['level']) {
  switch (level) {
    case 'unclaimed':
      return 4;
    case 'draftable':
      return 3;
    case 'needs-reporting':
      return 2;
    case 'blocked':
      return 1;
  }
}

export async function listReporterStoryCandidates(params: {
  communityId: string;
  limit?: number;
}) {
  const rows = await db.reporterStoryCandidate.findMany({
    where: {
      communityId: params.communityId,
    },
    orderBy: [{ score: 'desc' }, { latestSourceAt: 'desc' }],
    take: params.limit || DEFAULT_MAX_CANDIDATES,
    select: storyCandidateSelect,
  });

  return rows
    .map(
      (row): ReporterStoryCandidateView => {
      const eventExtractionJson = isJsonObject(row.eventExtractionJson)
        ? row.eventExtractionJson
        : null;

      return ({
      id: row.id,
      placeId: row.placeId,
      title: row.title,
      summary: row.summary,
      candidateType: row.candidateType,
      coverageScopes: normalizeCoverageScopes(row.coverageScopes),
      eventExtraction: eventExtractionJson
        ? {
            title:
              readJsonString(eventExtractionJson, ['title']) || row.title,
            summary: readJsonString(eventExtractionJson, ['summary']),
            startAt: readJsonDate(eventExtractionJson, ['startAt']),
            endAt: readJsonDate(eventExtractionJson, ['endAt']),
            location: readJsonString(eventExtractionJson, ['location']),
            organizer: readJsonString(eventExtractionJson, ['organizer']),
            imageUrl: readJsonString(eventExtractionJson, ['imageUrl']),
            sourceUrl: readJsonString(eventExtractionJson, ['sourceUrl']),
            isRecurring: Boolean(readJsonBoolean(eventExtractionJson, ['isRecurring'])),
            recurrenceText: readJsonString(eventExtractionJson, ['recurrenceText']),
            confidence:
              readJsonString(eventExtractionJson, ['confidence']) === 'high'
                ? 'high'
                : readJsonString(eventExtractionJson, ['confidence']) === 'medium'
                  ? 'medium'
                  : 'low',
            missingFields: Array.isArray(eventExtractionJson.missingFields)
              ? eventExtractionJson.missingFields.filter(
                  (value): value is string => typeof value === 'string'
                )
              : [],
          }
        : null,
      canSeedDraftEvent: canSeedDraftEventFromItems(
        row.candidateItems.map(({ ingestionItem }) => ({
          sourceType: ingestionItem.monitoredSource.sourceType,
        }))
      ),
      createdEvents: row.createdEvents,
      sourceCount: row.sourceCount,
      itemCount: row.itemCount,
      latestAt: row.latestSourceAt,
      matchedKeywords: row.matchedKeywords,
      linkedReporterRun: row.linkedReporterRun
        ? {
            id: row.linkedReporterRun.id,
            title: row.linkedReporterRun.title,
            topic: row.linkedReporterRun.topic,
            status: row.linkedReporterRun.status,
          }
        : null,
      readiness: buildCandidateReadiness(row),
      signal: {
        level: mapSignalLevel(row.signalLevel),
        score: row.score,
        reasons: row.reasons,
      },
      items: row.candidateItems.map(({ ingestionItem }) => ({
        id: ingestionItem.id,
        title: ingestionItem.title,
        canonicalUrl: ingestionItem.canonicalUrl,
        publishedAt: ingestionItem.publishedAt,
        firstSeenAt: ingestionItem.firstSeenAt,
        lastSeenAt: ingestionItem.lastSeenAt,
        publisher: ingestionItem.publisher,
        excerpt: ingestionItem.excerpt,
        sourceId: ingestionItem.monitoredSource.id,
        sourceLabel: ingestionItem.monitoredSource.label,
        sourceType: ingestionItem.monitoredSource.sourceType,
        sourceCoverageScope: normalizeCoverageScope(ingestionItem.monitoredSource.coverageScope),
        sourcePlaceName: ingestionItem.monitoredSource.place?.displayName || null,
      })),
      });
      }
    )
    .sort((left, right) => {
      const readinessDelta =
        getReadinessSortWeight(right.readiness.level) -
        getReadinessSortWeight(left.readiness.level);
      if (readinessDelta !== 0) {
        return readinessDelta;
      }
      if (right.signal.score !== left.signal.score) {
        return right.signal.score - left.signal.score;
      }
      return right.latestAt.getTime() - left.latestAt.getTime();
    });
}

export async function materializeReporterStoryCandidates(params: {
  communityId: string;
  limit?: number;
  lookbackDays?: number;
  maxIngestionItems?: number;
}) {
  const lookbackDays = params.lookbackDays || DEFAULT_LOOKBACK_DAYS;
  const maxIngestionItems = params.maxIngestionItems || DEFAULT_MAX_INGESTION_ITEMS;
  const limit = params.limit || DEFAULT_MAX_CANDIDATES;
  const lookbackCutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const [tenantKeywordSetting, ingestionRows] = await Promise.all([
    db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: params.communityId,
          key: REPORTER_TENANT_KEYWORDS_SETTING_KEY,
        },
      },
      select: {
        value: true,
      },
    }),
    db.reporterSourceIngestionItem.findMany({
      where: {
        monitoredSource: {
          communityId: params.communityId,
          status: {
            not: 'ARCHIVED',
          },
        },
        OR: [
          {
            publishedAt: {
              gte: lookbackCutoff,
            },
          },
          {
            lastSeenAt: {
              gte: lookbackCutoff,
            },
          },
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { lastSeenAt: 'desc' }],
      take: maxIngestionItems,
      select: {
        id: true,
        title: true,
        canonicalUrl: true,
        publishedAt: true,
        firstSeenAt: true,
        lastSeenAt: true,
        publisher: true,
        excerpt: true,
        metadataJson: true,
        monitoredSource: {
          select: {
            id: true,
            label: true,
            sourceType: true,
            coverageScope: true,
            place: {
              select: {
                id: true,
                displayName: true,
                slug: true,
                type: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const [openReporterRuns, recentPublishedArticles] = await Promise.all([
    db.reporterRun.findMany({
      where: {
        communityId: params.communityId,
        status: {
          notIn: ['ARCHIVED', 'CONVERTED_TO_ARTICLE'],
        },
      },
      select: {
        id: true,
        topic: true,
        title: true,
        status: true,
      },
      take: 150,
      orderBy: [{ updatedAt: 'desc' }],
    }),
    db.article.findMany({
      where: {
        communityId: params.communityId,
        status: 'PUBLISHED',
        publishedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        publishedAt: true,
      },
      take: 150,
      orderBy: [{ publishedAt: 'desc' }],
    }),
  ]);

  const tenantKeywords = parseReporterTenantKeywords(tenantKeywordSetting?.value || '');
  const workItems: CandidateWorkItem[] = (ingestionRows as CandidateIngestionItem[]).map((item) => ({
    id: item.id,
    title: item.title,
    canonicalUrl: item.canonicalUrl,
    publishedAt: item.publishedAt,
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
    publisher: item.publisher,
    excerpt: item.excerpt,
    metadataJson: item.metadataJson,
    sourceId: item.monitoredSource.id,
    sourceLabel: item.monitoredSource.label,
    sourceType: item.monitoredSource.sourceType,
    sourceCoverageScope: normalizeCoverageScope(item.monitoredSource.coverageScope),
    sourcePlaceId: item.monitoredSource.place?.id || null,
    sourcePlaceName: item.monitoredSource.place?.displayName || null,
  }));

  const clusters = clusterStoryItems(workItems)
    .map((items) => {
      const matchedKeywords = buildMatchedKeywords(items, tenantKeywords);
      const assessment = assessStoryCandidateSignal(items, matchedKeywords);
      const candidateText = [items[0]?.title, compactSummary(items), ...items.map((item) => item.excerpt)]
        .filter(Boolean)
        .join(' ');

      const openRunOverlap = openReporterRuns.reduce((best, run) => {
        const score = scoreStoryTextSimilarity(candidateText, `${run.title || ''} ${run.topic}`);
        return score > best.score ? { score, run } : best;
      }, { score: 0, run: null as null | (typeof openReporterRuns)[number] });

      const recentArticleOverlap = recentPublishedArticles.reduce((best, article) => {
        const score = scoreStoryTextSimilarity(candidateText, `${article.title} ${article.excerpt || ''}`);
        return score > best.score ? { score, article } : best;
      }, { score: 0, article: null as null | (typeof recentPublishedArticles)[number] });

      let adjustedScore = assessment.signal.score;
      const adjustedReasons = [...assessment.signal.reasons];

      if (openRunOverlap.score >= 3 && openRunOverlap.run) {
        adjustedScore = Math.max(0, adjustedScore - Math.min(3, openRunOverlap.score - 1));
        adjustedReasons.unshift(`resembles open reporter run: ${openRunOverlap.run.title || openRunOverlap.run.topic}`);
      }

      if (recentArticleOverlap.score >= 4 && recentArticleOverlap.article) {
        adjustedScore = Math.max(0, adjustedScore - Math.min(4, recentArticleOverlap.score - 2));
        adjustedReasons.unshift(`resembles recent Highlander coverage: ${recentArticleOverlap.article.title}`);
      }

      const adjustedLevel =
        adjustedScore >= 7
          ? ReporterStorySignalLevel.LIKELY
          : adjustedScore >= 4
            ? ReporterStorySignalLevel.POSSIBLE
            : ReporterStorySignalLevel.LOW;

      const eventExtraction = combineEventExtractions(items);
      const candidateType = classifyCandidateType({
        signalScore: adjustedScore,
        eventExtraction,
        sourceCount: new Set(items.map((item) => item.sourceId)).size,
        civicSignalCount: assessment.civicSignalCount,
      });

      return {
        title: items[0]?.title || 'Untitled candidate',
        summary: compactSummary(items),
        candidateType,
        matchedKeywords,
        coverageScopes: pickCoverageScopes(items),
        eventExtraction,
        placeId: pickPrimaryPlaceId(items),
        sourceCount: new Set(items.map((item) => item.sourceId)).size,
        itemCount: items.length,
        latestSourceAt: new Date(getItemActivityTime(items[0])),
        candidateItems: items,
        signalLevel: adjustedLevel,
        signal: {
          ...assessment.signal,
          score: adjustedScore,
          reasons: adjustedReasons.slice(0, 4),
          level:
            adjustedLevel === ReporterStorySignalLevel.LIKELY
              ? 'likely'
              : adjustedLevel === ReporterStorySignalLevel.POSSIBLE
                ? 'possible'
                : 'low',
        } satisfies StorySignalView,
        civicSignalCount: assessment.civicSignalCount,
        recentItemCount: assessment.recentItemCount,
      };
    })
    .sort((a, b) => {
      if (b.signal.score !== a.signal.score) {
        return b.signal.score - a.signal.score;
      }
      return b.latestSourceAt.getTime() - a.latestSourceAt.getTime();
    })
    .slice(0, limit);

  await db.$transaction(async (tx) => {
    await tx.reporterStoryCandidateItem.deleteMany({
      where: {
        reporterStoryCandidate: {
          communityId: params.communityId,
        },
      },
    });
    await tx.reporterStoryCandidate.deleteMany({
      where: {
        communityId: params.communityId,
      },
    });

    for (const cluster of clusters) {
      await tx.reporterStoryCandidate.create({
        data: {
          communityId: params.communityId,
          placeId: cluster.placeId,
          title: cluster.title,
          summary: cluster.summary,
          signalLevel: cluster.signalLevel,
          candidateType: cluster.candidateType,
          coverageScopes: cluster.coverageScopes,
          eventExtractionJson: serializeEventExtraction(cluster.eventExtraction),
          score: cluster.signal.score,
          reasons: cluster.signal.reasons,
          matchedKeywords: cluster.matchedKeywords,
          sourceCount: cluster.sourceCount,
          itemCount: cluster.itemCount,
          recentItemCount: cluster.recentItemCount,
          civicSignalCount: cluster.civicSignalCount,
          latestSourceAt: cluster.latestSourceAt,
          candidateItems: {
            create: cluster.candidateItems.map((item, index) => ({
              ingestionItemId: item.id,
              sortOrder: index,
            })),
          },
        },
      });
    }
  });

  const candidates = await listReporterStoryCandidates({
    communityId: params.communityId,
    limit,
  });

  return {
    candidateCount: candidates.length,
    candidates,
  };
}
