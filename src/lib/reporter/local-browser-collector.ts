export type BrowserCollectorSourceFamily = 'generic' | 'getoccasion';

export type BrowserCollectedItem = {
  dedupeKey?: string | null;
  externalId?: string | null;
  canonicalUrl?: string | null;
  title: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  publisher?: string | null;
  contentText?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type BrowserCollectedItemDetail = {
  title?: string | null;
  canonicalUrl?: string | null;
  excerpt?: string | null;
  contentText?: string | null;
  imageUrl?: string | null;
  eventLocation?: string | null;
  organizer?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string | null | undefined, maxLength: number) {
  const normalized = collapseWhitespace(value || '');
  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

const GET_OCCASION_SCHEDULE_TITLE =
  /^(\d{1,2})\s+(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\w+\s+(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)$/i;

function monthNameToIndex(value: string) {
  const month = value.toLowerCase();
  const monthMap: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  return monthMap[month] ?? null;
}

function parseTimeParts(value: string, meridiem: string) {
  const [hourText, minuteText] = value.split(':');
  let hour = Number(hourText);
  const minute = Number(minuteText);
  const normalizedMeridiem = meridiem.toUpperCase();

  if (normalizedMeridiem === 'PM' && hour < 12) {
    hour += 12;
  } else if (normalizedMeridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function cleanTrailingAvailability(value: string) {
  return collapseWhitespace(
    value
      .replace(/\b(?:sold out|join waitlist|waitlist|open)\b.*$/i, '')
      .replace(/\b\d+\s+spots?\s+left\b.*$/i, '')
  );
}

function extractStreetAddress(value: string) {
  return (
    value.match(
      /\b\d{1,5}\s+[A-Z0-9][A-Za-z0-9.'-]*(?:\s+[A-Z0-9][A-Za-z0-9.'-]*){0,5}\s(?:Ave|Avenue|St|Street|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court)\b/i
    )?.[0] || null
  );
}

function deriveGetOccasionTitleFromExcerpt(excerpt: string) {
  const normalized = cleanTrailingAvailability(excerpt);
  if (!normalized) {
    return null;
  }

  const organizerMarker =
    normalized.match(/^(.*?)\s+(L\.?A\.?\s*Studio\s*\+\s*ART14 Artist Residency)\b/i)?.[1] || null;
  if (organizerMarker && organizerMarker.length >= 6) {
    return collapseWhitespace(organizerMarker);
  }

  const beforeNarrative =
    normalized.match(/^(.*?)(?=\s+(?:This event|This class|Please join|Join us|Come and|Journey with|Meet |Learn |Participants))/i)?.[1] ||
    normalized.match(/^(.*?)(?=[.?!])/ )?.[1] ||
    null;

  if (beforeNarrative && beforeNarrative.length >= 6) {
    return collapseWhitespace(beforeNarrative);
  }

  return null;
}

function deriveGetOccasionOrganizerFromExcerpt(excerpt: string) {
  const normalized = collapseWhitespace(excerpt);
  return (
    normalized.match(/\b(L\.?A\.?\s*Studio\s*\+\s*ART14 Artist Residency)\b/i)?.[1] || null
  );
}

function enrichGetOccasionItem(item: BrowserCollectedItem, now = new Date()) {
  const normalizedTitle = collapseWhitespace(item.title);
  const excerpt = collapseWhitespace(item.excerpt || '');
  const metadataJson: Record<string, unknown> = { ...(item.metadataJson || {}) };

  const titleLooksLikeSchedule = GET_OCCASION_SCHEDULE_TITLE.test(normalizedTitle);
  const betterTitle = titleLooksLikeSchedule ? deriveGetOccasionTitleFromExcerpt(excerpt) : null;
  const organizer =
    (typeof metadataJson.organizer === 'string' && metadataJson.organizer.trim()) ||
    deriveGetOccasionOrganizerFromExcerpt(excerpt) ||
    null;
  const derivedLocation =
    (typeof metadataJson.eventLocation === 'string' && metadataJson.eventLocation.trim()) ||
    extractStreetAddress(`${normalizedTitle} ${excerpt}`) ||
    null;

  if (organizer) {
    metadataJson.organizer = organizer;
  }
  if (derivedLocation) {
    metadataJson.eventLocation = derivedLocation;
  }

  const scheduleMatch = normalizedTitle.match(GET_OCCASION_SCHEDULE_TITLE);
  if (scheduleMatch) {
    const [, dayText, monthText, startTimeText, startMeridiem, endTimeText, endMeridiem] = scheduleMatch;
    const monthIndex = monthNameToIndex(monthText);
    if (monthIndex !== null) {
      const year = now.getFullYear();
      const day = Number(dayText);
      const startParts = parseTimeParts(startTimeText, startMeridiem);
      const endParts = parseTimeParts(endTimeText, endMeridiem);
      const startDate = new Date(year, monthIndex, day, startParts.hour, startParts.minute);
      const endDate = new Date(year, monthIndex, day, endParts.hour, endParts.minute);

      metadataJson.eventStartAt = startDate.toISOString();
      metadataJson.eventEndAt = endDate.toISOString();

      if (!item.publishedAt) {
        item.publishedAt = startDate.toISOString();
      }
    }
  }

  if (betterTitle) {
    item.title = betterTitle;
  }

  if (excerpt) {
    let cleanedExcerpt = excerpt;
    if (betterTitle) {
      cleanedExcerpt = collapseWhitespace(cleanedExcerpt.replace(betterTitle, ''));
    }
    if (organizer) {
      cleanedExcerpt = collapseWhitespace(cleanedExcerpt.replace(organizer, ''));
    }
    item.excerpt = cleanTrailingAvailability(cleanedExcerpt) || item.excerpt;
  }

  item.metadataJson = metadataJson;
  return item;
}

function normalizeTitle(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/\b(?:a|an|the|of|in|at|for|to|and|or|on)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDateKey(value?: string | null) {
  const trimmed = collapseWhitespace(value || '');
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 16);
  }

  return trimmed.toLowerCase();
}

function extractMetadataLocation(metadataJson?: Record<string, unknown> | null) {
  const location =
    (typeof metadataJson?.eventLocation === 'string' && metadataJson.eventLocation.trim()) ||
    (typeof metadataJson?.location === 'string' && metadataJson.location.trim()) ||
    '';
  return collapseWhitespace(location).toLowerCase() || null;
}

function extractGetOccasionExternalId(candidateUrl: string | null | undefined) {
  const normalized = collapseWhitespace(candidateUrl || '');
  if (!normalized) {
    return null;
  }

  const parsed = safeUrl(normalized);
  const pathname = parsed?.pathname || normalized;

  return (
    pathname.match(/\/p\/n\/([A-Za-z0-9_-]+)/)?.[1] ||
    pathname.match(/\/p\/events\/([A-Za-z0-9_-]+)/)?.[1] ||
    null
  );
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function detectBrowserCollectorSourceFamily(sourceUrl: string): BrowserCollectorSourceFamily {
  const parsed = safeUrl(sourceUrl);
  const host = parsed?.hostname.toLowerCase() || '';

  if (host.endsWith('getoccasion.com')) {
    return 'getoccasion';
  }

  return 'generic';
}

export function normalizeBrowserCollectorCanonicalUrl(
  candidateUrl: string | null | undefined,
  sourceUrl: string,
  family: BrowserCollectorSourceFamily
) {
  const raw = collapseWhitespace(candidateUrl || '');
  if (!raw) {
    return sourceUrl;
  }

  const parsed = safeUrl(raw);
  if (!parsed) {
    return raw;
  }

  parsed.hash = '';

  if (family === 'getoccasion') {
    parsed.search = '';
  } else {
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        key.startsWith('utm_') ||
        key === 'fbclid' ||
        key === 'gclid' ||
        key === 'mc_cid' ||
        key === 'mc_eid'
      ) {
        parsed.searchParams.delete(key);
      }
    }
  }

  const normalized = parsed.toString();
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function buildBrowserCollectorDedupeKey(
  item: BrowserCollectedItem,
  sourceUrl: string,
  family: BrowserCollectorSourceFamily
) {
  const externalId = collapseWhitespace(item.externalId || '');
  const normalizedUrl = normalizeBrowserCollectorCanonicalUrl(item.canonicalUrl, sourceUrl, family);
  const normalizedSourceUrl = normalizeBrowserCollectorCanonicalUrl(sourceUrl, sourceUrl, family);
  const titleKey = normalizeTitle(item.title);
  const dateKey = normalizeDateKey(
    item.publishedAt ||
      (typeof item.metadataJson?.eventStartAt === 'string' ? item.metadataJson.eventStartAt : null)
  );
  const locationKey = extractMetadataLocation(item.metadataJson);

  if (family === 'getoccasion') {
    if (externalId) {
      return ['getoccasion-id', externalId, dateKey || 'no-date'].join(':');
    }
    const eventIdentity = normalizedUrl !== normalizedSourceUrl ? normalizedUrl : `${titleKey}:${locationKey || 'no-location'}`;
    return ['getoccasion', eventIdentity, dateKey || 'no-date'].join(':');
  }

  if (externalId) {
    return `external:${externalId}`;
  }

  if (normalizedUrl && normalizedUrl !== normalizedSourceUrl) {
    return `url:${normalizedUrl}`;
  }

  return ['event', titleKey || 'untitled', dateKey || 'no-date', locationKey || 'no-location'].join(':');
}

export function finalizeBrowserCollectedItems(
  items: BrowserCollectedItem[],
  sourceUrl: string
) {
  const family = detectBrowserCollectorSourceFamily(sourceUrl);
  const seen = new Set<string>();
  const finalized: BrowserCollectedItem[] = [];

  for (const item of items) {
    const title = collapseWhitespace(item.title);
    if (!title) {
      continue;
    }

    const normalizedUrl = normalizeBrowserCollectorCanonicalUrl(item.canonicalUrl, sourceUrl, family);
    const baseItem =
      family === 'getoccasion'
        ? enrichGetOccasionItem(
            {
              ...item,
              canonicalUrl: normalizedUrl,
            },
            new Date()
          )
        : {
            ...item,
            canonicalUrl: normalizedUrl,
          };
    const metadataJson: Record<string, unknown> = {
      ...(baseItem.metadataJson || {}),
      sourceFamily: family,
      renderedUrl:
        typeof item.metadataJson?.renderedUrl === 'string' && item.metadataJson.renderedUrl.trim()
          ? item.metadataJson.renderedUrl
          : sourceUrl,
    };

    if (baseItem.publishedAt) {
      metadataJson.eventStartAt = baseItem.publishedAt;
    }

    const normalizedItem: BrowserCollectedItem = {
      ...baseItem,
      title: collapseWhitespace(baseItem.title),
      externalId:
        baseItem.externalId ||
        (family === 'getoccasion'
          ? extractGetOccasionExternalId(normalizedUrl)
          : null),
      excerpt: collapseWhitespace(baseItem.excerpt || '') || null,
      canonicalUrl: normalizedUrl,
      publishedAt: baseItem.publishedAt || null,
      metadataJson,
    };

    const dedupeKey = buildBrowserCollectorDedupeKey(normalizedItem, sourceUrl, family);
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    finalized.push({
      ...normalizedItem,
      dedupeKey,
    });
  }

  return finalized;
}

export function mergeBrowserCollectedDetail(
  item: BrowserCollectedItem,
  detail: BrowserCollectedItemDetail
) {
  const metadataJson: Record<string, unknown> = {
    ...(item.metadataJson || {}),
  };

  if (detail.imageUrl) {
    metadataJson.imageUrl = detail.imageUrl;
  }
  if (detail.eventLocation) {
    metadataJson.eventLocation = detail.eventLocation;
  }
  if (detail.organizer) {
    metadataJson.organizer = detail.organizer;
  }
  if (detail.eventStartAt) {
    metadataJson.eventStartAt = detail.eventStartAt;
  }
  if (detail.eventEndAt) {
    metadataJson.eventEndAt = detail.eventEndAt;
  }

  return {
    ...item,
    title: collapseWhitespace(detail.title || item.title),
    canonicalUrl: detail.canonicalUrl || item.canonicalUrl || null,
    excerpt: truncate(detail.excerpt || item.excerpt, 4000),
    publishedAt: detail.eventStartAt || item.publishedAt || null,
    contentText: truncate(detail.contentText || item.contentText || detail.excerpt || item.excerpt, 12000),
    metadataJson,
  } satisfies BrowserCollectedItem;
}
