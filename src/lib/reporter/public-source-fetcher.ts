import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { recordReporterMonitoredSourceFetch } from './monitored-source-ingestion';

type ParsedIngestionItem = {
  dedupeKey?: string | null;
  externalId?: string | null;
  canonicalUrl?: string | null;
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | string | null;
  retrievedAt?: Date | string | null;
  publisher?: string | null;
  contentText?: string | null;
  metadataJson?: Prisma.InputJsonValue | null;
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripTags(value: string) {
  return collapseWhitespace(value.replace(/<[^>]+>/g, ' '));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function sanitizeText(value?: string | null) {
  if (!value) {
    return null;
  }
  return decodeHtmlEntities(stripTags(value));
}

function buildFormatMetadata(format: 'RSS' | 'ATOM' | 'JSON' | 'HTML'): Prisma.InputJsonValue {
  return {
    format,
  };
}

function truncate(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function resolveUrl(candidate: string | null | undefined, baseUrl: string) {
  const trimmed = candidate?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}

function maybeDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function extractFirstTagValue(block: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function extractAtomLink(block: string, baseUrl: string) {
  const relAlternate = block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (relAlternate?.[1]) {
    return resolveUrl(relAlternate[1], baseUrl);
  }

  const anyHref = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (anyHref?.[1]) {
    return resolveUrl(anyHref[1], baseUrl);
  }

  return null;
}

function extractRssLink(block: string, baseUrl: string) {
  const link = sanitizeText(extractFirstTagValue(block, ['link']));
  return resolveUrl(link, baseUrl);
}

function parseXmlFeed(xml: string, baseUrl: string, defaultPublisher?: string | null): ParsedIngestionItem[] {
  const isAtom = /<feed\b/i.test(xml);
  const entryRegex = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(entryRegex) || [];
  const items: ParsedIngestionItem[] = [];

  for (const block of matches) {
    const title = sanitizeText(extractFirstTagValue(block, ['title']));
    if (!title) {
      continue;
    }

    const excerpt = truncate(
      sanitizeText(extractFirstTagValue(block, ['description', 'summary', 'content', 'content:encoded'])),
      2000
    );
    const contentText = truncate(
      sanitizeText(extractFirstTagValue(block, ['content:encoded', 'content', 'description', 'summary'])),
      12000
    );
    const publishedAt = maybeDate(
      sanitizeText(extractFirstTagValue(block, ['pubDate', 'published', 'updated', 'dc:date']))
    );
    const externalId = sanitizeText(extractFirstTagValue(block, ['guid', 'id']));
    const canonicalUrl = isAtom ? extractAtomLink(block, baseUrl) : extractRssLink(block, baseUrl);
    const publisher =
      sanitizeText(extractFirstTagValue(block, ['source', 'author', 'dc:creator'])) || defaultPublisher || null;

    items.push({
      externalId,
      canonicalUrl,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText,
      metadataJson: buildFormatMetadata(isAtom ? 'ATOM' : 'RSS'),
    });
  }

  return items;
}

function findJsonItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = ['items', 'entries', 'results', 'articles', 'feed', 'data'];
  for (const key of candidateKeys) {
    const nested = record[key];
    const results = findJsonItems(nested);
    if (results.length) {
      return results;
    }
  }

  return [record];
}

function readJsonString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseJsonFeed(payload: unknown, baseUrl: string, defaultPublisher?: string | null): ParsedIngestionItem[] {
  const items: ParsedIngestionItem[] = [];

  for (const record of findJsonItems(payload)) {
    const title = readJsonString(record, ['title', 'headline', 'name']);
    if (!title) {
      continue;
    }

    const canonicalUrl = resolveUrl(
      readJsonString(record, ['url', 'link', 'canonicalUrl', 'externalUrl']),
      baseUrl
    );
    const excerpt = truncate(
      sanitizeText(
        readJsonString(record, ['excerpt', 'summary', 'description', 'dek', 'teaser'])
      ),
      2000
    );
    const contentText = truncate(
      sanitizeText(readJsonString(record, ['content', 'body', 'text', 'description'])),
      12000
    );
    const publishedAt = maybeDate(
      readJsonString(record, ['publishedAt', 'publicationDate', 'pubDate', 'date', 'updatedAt'])
    );
    const externalId = readJsonString(record, ['id', 'guid', 'slug']);
    const publisher =
      readJsonString(record, ['publisher', 'source', 'provider', 'organization']) || defaultPublisher || null;

    items.push({
      externalId,
      canonicalUrl,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText,
      metadataJson: buildFormatMetadata('JSON'),
    });
  }

  return items;
}

function extractMetaContent(html: string, name: string) {
  const patterns = [
    new RegExp(`<meta\\s+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta\\s+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["'][^>]*>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function isProbablyArticleTitle(title: string) {
  const collapsed = collapseWhitespace(title);
  if (collapsed.length < 18 || collapsed.length > 220) {
    return false;
  }

  if (countWords(collapsed) < 3) {
    return false;
  }

  const lowered = collapsed.toLowerCase();
  const obviousNavLabels = [
    'read more',
    'click here',
    'learn more',
    'home',
    'about us',
    'contact us',
    'privacy policy',
    'sign up',
    'log in',
    'watch live',
  ];

  return !obviousNavLabels.includes(lowered);
}

function extractTimeFromContext(context: string) {
  return maybeDate(
    sanitizeText(
      context.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1] ||
        context.match(/\b(?:published|updated)\b[^<]{0,80}?([A-Z][a-z]{2,8}\.? \d{1,2},? \d{4})/i)?.[1] ||
        null
    )
  );
}

function extractParagraphExcerpt(context: string, title: string) {
  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  for (const match of context.matchAll(paragraphRegex)) {
    const candidate = truncate(sanitizeText(match[1]), 2000);
    if (!candidate) {
      continue;
    }

    if (candidate === title) {
      continue;
    }

    if (candidate.length < 40) {
      continue;
    }

    return candidate;
  }

  return null;
}

function parseHtmlListingItems(
  html: string,
  baseUrl: string,
  defaultPublisher?: string | null
): ParsedIngestionItem[] {
  const publisher =
    sanitizeText(extractMetaContent(html, 'og:site_name')) || defaultPublisher || null;
  const baseWithoutHash = resolveUrl(baseUrl, baseUrl);
  const anchorRegex = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const items: ParsedIngestionItem[] = [];
  const seenKeys = new Set<string>();

  for (const match of html.matchAll(anchorRegex)) {
    const href = resolveUrl(match[2], baseUrl);
    const title = sanitizeText(match[4]);

    if (!href || !title || !isProbablyArticleTitle(title)) {
      continue;
    }

    if (
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href === baseWithoutHash
    ) {
      continue;
    }

    const matchIndex = match.index || 0;
    const contextStart = Math.max(0, matchIndex - 500);
    const contextEnd = Math.min(html.length, matchIndex + match[0].length + 900);
    const context = html.slice(contextStart, contextEnd);
    const excerpt = extractParagraphExcerpt(context, title);
    const publishedAt = extractTimeFromContext(context);
    const dedupeKey = href;

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    items.push({
      dedupeKey,
      canonicalUrl: href,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText: excerpt,
      metadataJson: {
        format: 'HTML',
        extractionMode: 'listing',
      },
    });
  }

  return items;
}

function parseHtmlDocument(html: string, baseUrl: string, defaultPublisher?: string | null): ParsedIngestionItem[] {
  const listingItems = parseHtmlListingItems(html, baseUrl, defaultPublisher);
  if (listingItems.length >= 2) {
    return listingItems;
  }

  const title =
    sanitizeText(extractMetaContent(html, 'og:title')) ||
    sanitizeText(extractMetaContent(html, 'twitter:title')) ||
    sanitizeText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || null);

  if (!title) {
    return [];
  }

  const excerpt = truncate(
    sanitizeText(extractMetaContent(html, 'description') || extractMetaContent(html, 'og:description')),
    2000
  );
  const canonicalUrl = resolveUrl(
    html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || null,
    baseUrl
  ) || baseUrl;
  const publisher =
    sanitizeText(extractMetaContent(html, 'og:site_name')) || defaultPublisher || null;
  const publishedAt = maybeDate(
    sanitizeText(
      extractMetaContent(html, 'article:published_time') ||
        html.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1] ||
        null
    )
  );
  const contentText = truncate(
    sanitizeText(
      html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
        html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
        html
    ),
    12000
  );

  return [
    {
      canonicalUrl,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText,
      metadataJson: {
        format: 'HTML',
        extractionMode: 'document',
      },
    },
  ];
}

function buildAcceptHeader(format: string) {
  switch (format) {
    case 'RSS':
    case 'ATOM':
      return 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8';
    case 'JSON':
      return 'application/json, text/json;q=0.9, */*;q=0.8';
    case 'HTML':
      return 'text/html, application/xhtml+xml, */*;q=0.8';
    default:
      return '*/*';
  }
}

function parseResponseItems(params: {
  sourceFormat: string;
  bodyText: string;
  sourceUrl: string;
  publisher?: string | null;
}) {
  switch (params.sourceFormat) {
    case 'RSS':
    case 'ATOM':
      return parseXmlFeed(params.bodyText, params.sourceUrl, params.publisher);
    case 'JSON': {
      const parsed = JSON.parse(params.bodyText) as unknown;
      return parseJsonFeed(parsed, params.sourceUrl, params.publisher);
    }
    case 'HTML':
      return parseHtmlDocument(params.bodyText, params.sourceUrl, params.publisher);
    case 'PDF':
    case 'ICS':
    case 'OTHER':
    default:
      throw new Error(`Automatic fetch parsing is not implemented for ${params.sourceFormat} sources yet.`);
  }
}

export async function executeReporterMonitoredSourceFetch(monitoredSourceId: string) {
  const source = await db.reporterMonitoredSource.findUnique({
    where: { id: monitoredSourceId },
    select: {
      id: true,
      label: true,
      communityId: true,
      url: true,
      sourceFormat: true,
      publisher: true,
      status: true,
      lastETag: true,
      lastModifiedHeader: true,
    },
  });

  if (!source) {
    throw new Error('Monitored source not found.');
  }

  if (source.status === 'ARCHIVED') {
    throw new Error('Archived monitored sources cannot be fetched.');
  }

  const startedAt = new Date();
  const requestHeaders = new Headers({
    Accept: buildAcceptHeader(source.sourceFormat),
    'User-Agent': 'HighlanderTodayReporterBot/1.0 (+https://highlander.today)',
  });

  if (source.lastETag) {
    requestHeaders.set('If-None-Match', source.lastETag);
  }
  if (source.lastModifiedHeader) {
    requestHeaders.set('If-Modified-Since', source.lastModifiedHeader);
  }

  let response: Response;

  try {
    response = await fetch(source.url, {
      method: 'GET',
      headers: requestHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown network failure while fetching source.';
    return recordReporterMonitoredSourceFetch({
      monitoredSourceId: source.id,
      status: 'FAILED',
      startedAt,
      completedAt: new Date(),
      errorMessage: message,
    });
  }

  const completedAt = new Date();
  const responseEtag = response.headers.get('etag');
  const responseLastModified = response.headers.get('last-modified');

  if (response.status === 304) {
    return recordReporterMonitoredSourceFetch({
      monitoredSourceId: source.id,
      status: 'NO_CHANGE',
      startedAt,
      completedAt,
      httpStatus: response.status,
      responseEtag,
      responseLastModified,
    });
  }

  if (!response.ok) {
    return recordReporterMonitoredSourceFetch({
      monitoredSourceId: source.id,
      status: 'FAILED',
      startedAt,
      completedAt,
      httpStatus: response.status,
      responseEtag,
      responseLastModified,
      errorMessage: `Fetch failed with HTTP ${response.status}.`,
    });
  }

  const bodyText = await response.text();

  try {
    const items = parseResponseItems({
      sourceFormat: source.sourceFormat,
      bodyText,
      sourceUrl: source.url,
      publisher: source.publisher,
    }).map((item) => ({
      ...item,
      retrievedAt: completedAt,
    }));

    return recordReporterMonitoredSourceFetch({
      monitoredSourceId: source.id,
      status: 'SUCCESS',
      startedAt,
      completedAt,
      httpStatus: response.status,
      responseEtag,
      responseLastModified,
      items,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to parse source response.';

    return recordReporterMonitoredSourceFetch({
      monitoredSourceId: source.id,
      status: 'FAILED',
      startedAt,
      completedAt,
      httpStatus: response.status,
      responseEtag,
      responseLastModified,
      errorMessage: message,
    });
  }
}
