import { inflateSync } from 'zlib';
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

function buildFormatMetadata(format: 'RSS' | 'ATOM' | 'JSON' | 'HTML' | 'PDF'): Prisma.InputJsonValue {
  return {
    format,
  };
}

function normalizeTitleForDedupe(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(?:a|an|the|of|in|at|for|to|and|or|on)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function decodePdfLiteralString(value: string) {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      result += character;
      continue;
    }

    const next = value[index + 1];
    if (!next) {
      break;
    }

    index += 1;
    switch (next) {
      case 'n':
        result += '\n';
        break;
      case 'r':
        result += '\r';
        break;
      case 't':
        result += '\t';
        break;
      case 'b':
        result += '\b';
        break;
      case 'f':
        result += '\f';
        break;
      case '(':
      case ')':
      case '\\':
        result += next;
        break;
      default:
        if (/[0-7]/.test(next)) {
          const octal = `${next}${value[index + 1] || ''}${value[index + 2] || ''}`.match(/^[0-7]{1,3}/)?.[0] || next;
          result += String.fromCharCode(parseInt(octal, 8));
          index += octal.length - 1;
        } else {
          result += next;
        }
        break;
    }
  }

  return result;
}

function decodePdfHexString(value: string) {
  const normalized = value.replace(/\s+/g, '');
  const padded = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  let result = '';

  for (let index = 0; index < padded.length; index += 2) {
    const pair = padded.slice(index, index + 2);
    const code = Number.parseInt(pair, 16);
    if (!Number.isNaN(code)) {
      result += String.fromCharCode(code);
    }
  }

  return result;
}

function extractPdfTextSegments(content: string) {
  const segments: string[] = [];
  const textBlockRegex = /BT([\s\S]*?)ET/g;

  for (const blockMatch of content.matchAll(textBlockRegex)) {
    const block = blockMatch[1];

    for (const literalMatch of block.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
      const raw = literalMatch[0].replace(/\)\s*Tj$/, '').slice(1);
      segments.push(decodePdfLiteralString(raw));
    }

    for (const arrayMatch of block.matchAll(/\[(.*?)\]\s*TJ/gs)) {
      const parts = arrayMatch[1].match(/\((?:\\.|[^\\)])*\)|<[^>]+>/g) || [];
      for (const part of parts) {
        if (part.startsWith('(')) {
          segments.push(decodePdfLiteralString(part.slice(1, -1)));
        } else if (part.startsWith('<')) {
          segments.push(decodePdfHexString(part.slice(1, -1)));
        }
      }
    }
  }

  return segments;
}

function extractPdfMetadataString(pdfText: string, fieldName: string) {
  const match = pdfText.match(new RegExp(`\\/${fieldName}\\s*\\((.*?)\\)`, 's'));
  return match?.[1] ? decodePdfLiteralString(match[1]) : null;
}

function parsePdfDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/^D:/, '');
  const match = compact.match(/^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) {
    return maybeDate(trimmed);
  }

  const [, year, month = '01', day = '01', hour = '00', minute = '00', second = '00'] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );
}

function extractDateFromText(value?: string | null) {
  const trimmed = collapseWhitespace(value || '');
  if (!trimmed) {
    return null;
  }

  const MONTHS = '(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\\.?';
  const ORDINAL = '(?:st|nd|rd|th)?';

  const explicit =
    // "May 27, 2026" or "May 27th, 2026" (named month first, optional ordinal, optional comma)
    trimmed.match(new RegExp(`\\b${MONTHS}\\s+\\d{1,2}${ORDINAL},?\\s+\\d{4}\\b`, 'i'))?.[0] ||
    // "27 May 2026" or "27th May 2026" (day first)
    trimmed.match(new RegExp(`\\b\\d{1,2}${ORDINAL}\\s+${MONTHS}\\s+\\d{4}\\b`, 'i'))?.[0] ||
    // "2026-05-27" (ISO date)
    trimmed.match(/\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/)?.[0] ||
    // "5/27/2026" or "5/27/26"
    trimmed.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/)?.[0] ||
    null;

  return explicit ? maybeDate(explicit) : null;
}

function isProbablyPdfNoticeHeading(segment: string) {
  const collapsed = collapseWhitespace(segment);
  if (collapsed.length < 16 || collapsed.length > 160) {
    return false;
  }

  const wordCount = countWords(collapsed);
  if (wordCount < 3 || wordCount > 18) {
    return false;
  }

  if (/[.?!:]$/.test(collapsed)) {
    return false;
  }

  const lowered = collapsed.toLowerCase();
  const headingSignals = [
    'notice',
    'agenda',
    'hearing',
    'meeting',
    'minutes',
    'resolution',
    'ordinance',
    'board',
    'council',
    'commission',
    'authority',
    'proposal',
    'bid',
    'zoning',
    'planning',
  ];

  const hasSignal = headingSignals.some((signal) => lowered.includes(signal));
  const punctuationHeavy = /[.?!]{2,}/.test(collapsed) || /,\s+\d{4}\b/.test(collapsed);
  return hasSignal && !punctuationHeavy;
}

function buildPdfFallbackText(pdfText: string) {
  return (pdfText.match(/[A-Za-z][A-Za-z0-9,.'":;()\-\/ ]{20,}/g) || [])
    .map((segment) => collapseWhitespace(segment))
    .filter((segment) => countWords(segment) >= 4);
}

function extractPdfPlainText(bytes: Uint8Array) {
  const pdfText = Buffer.from(bytes).toString('latin1');
  const streamRegex = /<<[\s\S]*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const textSegments: string[] = [];

  for (const streamMatch of pdfText.matchAll(streamRegex)) {
    const objectHeader = streamMatch[0];
    const streamBody = streamMatch[1];
    let decodedContent: string | null = null;

    if (/\/FlateDecode\b/.test(objectHeader)) {
      try {
        const inflated = inflateSync(Buffer.from(streamBody, 'latin1'));
        decodedContent = inflated.toString('latin1');
      } catch {
        decodedContent = null;
      }
    } else {
      decodedContent = streamBody;
    }

    if (!decodedContent) {
      continue;
    }

    textSegments.push(...extractPdfTextSegments(decodedContent));
  }

  const normalizedSegments = textSegments
    .map((segment) => collapseWhitespace(segment))
    .filter((segment) => segment.length >= 3);

  if (normalizedSegments.length) {
    return {
      text: collapseWhitespace(normalizedSegments.join(' ')),
      segments: normalizedSegments,
      metadataSource: pdfText,
    };
  }

  const fallbackSegments = buildPdfFallbackText(pdfText);
  return {
    text: collapseWhitespace(fallbackSegments.join(' ')),
    segments: fallbackSegments,
    metadataSource: pdfText,
  };
}

function derivePdfDocumentTitle(contentText: string | null, baseUrl: string, pdfText: string) {
  const metadataTitle = sanitizeText(extractPdfMetadataString(pdfText, 'Title'));
  if (metadataTitle && metadataTitle.length >= 8) {
    return metadataTitle;
  }

  const lines = contentText
    ?.split(/(?<=[.?!])\s+|\n+/)
    .map((line) => collapseWhitespace(line))
    .filter(Boolean);
  const candidate = lines?.find((line) => line.length >= 18 && line.length <= 180) || null;
  if (candidate) {
    return candidate;
  }

  try {
    const url = new URL(baseUrl);
    const lastSegment = url.pathname.split('/').filter(Boolean).pop() || 'document';
    return lastSegment.replace(/[-_]+/g, ' ').replace(/\.pdf$/i, '').trim() || 'PDF document';
  } catch {
    return 'PDF document';
  }
}

function buildPdfNoticeItems(params: {
  segments: string[];
  baseUrl: string;
  publisher: string | null;
  fallbackPublishedAt: Date | null;
}) {
  const headingIndexes = params.segments
    .map((segment, index) => (isProbablyPdfNoticeHeading(segment) ? index : -1))
    .filter((index) => index >= 0);

  if (headingIndexes.length < 2) {
    return [];
  }

  const items: ParsedIngestionItem[] = [];

  for (let i = 0; i < headingIndexes.length; i += 1) {
    const start = headingIndexes[i];
    const end = headingIndexes[i + 1] ?? params.segments.length;
    const blockSegments = params.segments.slice(start, end).filter(Boolean);
    if (blockSegments.length < 2) {
      continue;
    }

    const title = truncate(blockSegments[0], 220);
    const blockText = collapseWhitespace(blockSegments.join(' '));
    const excerpt = truncate(blockText, 2000);
    const publishedAt = extractDateFromText(blockText) || params.fallbackPublishedAt;
    if (!title) {
      continue;
    }

    const dedupeKey = params.publisher
      ? `pdf-notice:${params.publisher.toLowerCase().trim()}:${normalizeTitleForDedupe(title)}`
      : `${params.baseUrl}#${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `${i + 1}`}`;

    items.push({
      dedupeKey,
      canonicalUrl: params.baseUrl,
      title,
      excerpt,
      publishedAt,
      publisher: params.publisher,
      contentText: truncate(blockText, 12000),
      metadataJson: {
        format: 'PDF',
        extractionMode: 'notice_split',
      },
    });
  }

  return items;
}

function parsePdfDocument(
  bytes: Uint8Array,
  baseUrl: string,
  defaultPublisher?: string | null
): ParsedIngestionItem[] {
  const { text, segments, metadataSource } = extractPdfPlainText(bytes);
  const contentText = truncate(sanitizeText(text), 12000);
  const metadataPublishedAt =
    parsePdfDateValue(extractPdfMetadataString(metadataSource, 'ModDate')) ||
    parsePdfDateValue(extractPdfMetadataString(metadataSource, 'CreationDate'));
  const publisher =
    sanitizeText(extractPdfMetadataString(metadataSource, 'Author')) || defaultPublisher || null;
  const noticeItems = buildPdfNoticeItems({
    segments,
    baseUrl,
    publisher,
    fallbackPublishedAt: metadataPublishedAt,
  });

  if (noticeItems.length >= 2) {
    return noticeItems;
  }

  const title = derivePdfDocumentTitle(contentText, baseUrl, metadataSource);
  const excerpt = truncate(contentText, 2000);

  return [
    {
      dedupeKey: baseUrl,
      canonicalUrl: baseUrl,
      title,
      excerpt,
      publishedAt: metadataPublishedAt || extractDateFromText(contentText),
      publisher,
      contentText,
      metadataJson: {
        format: 'PDF',
        extractionMode: 'document',
      },
    },
  ];
}

function unfoldIcsLines(ics: string) {
  return ics.replace(/\r?\n[ \t]/g, '');
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function extractIcsField(block: string, fieldName: string) {
  const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`^${escapedName}(?:;[^:\\r\\n]*)?:(.*)$`, 'im'));
  return match?.[1] ? match[1].trim() : null;
}

function parseIcsDateValue(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{8}$/.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6)) - 1;
    const day = Number(trimmed.slice(6, 8));
    return new Date(Date.UTC(year, month, day));
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/
  );
  if (dateTimeMatch) {
    const [, year, month, day, hour, minute, second, zulu] = dateTimeMatch;
    if (zulu === 'Z') {
      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second)
        )
      );
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  return maybeDate(trimmed);
}

function parseIcsCalendar(ics: string, baseUrl: string, defaultPublisher?: string | null): ParsedIngestionItem[] {
  const unfolded = unfoldIcsLines(ics);
  const eventBlocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) || [];
  const items: ParsedIngestionItem[] = [];

  for (const block of eventBlocks) {
    const title = sanitizeText(unescapeIcsText(extractIcsField(block, 'SUMMARY') || ''));
    if (!title) {
      continue;
    }

    const description = sanitizeText(unescapeIcsText(extractIcsField(block, 'DESCRIPTION') || ''));
    const location = sanitizeText(unescapeIcsText(extractIcsField(block, 'LOCATION') || ''));
    const canonicalUrl = resolveUrl(extractIcsField(block, 'URL'), baseUrl);
    const publishedAt =
      parseIcsDateValue(extractIcsField(block, 'DTSTART')) ||
      parseIcsDateValue(extractIcsField(block, 'DTSTAMP')) ||
      parseIcsDateValue(extractIcsField(block, 'CREATED'));
    const updatedAt =
      parseIcsDateValue(extractIcsField(block, 'LAST-MODIFIED')) ||
      parseIcsDateValue(extractIcsField(block, 'DTSTAMP'));
    const externalId = sanitizeText(unescapeIcsText(extractIcsField(block, 'UID') || ''));
    const publisher =
      sanitizeText(unescapeIcsText(extractIcsField(block, 'ORGANIZER') || '')) || defaultPublisher || null;
    const excerpt = truncate(
      [description, location ? `Location: ${location}` : null].filter(Boolean).join(' '),
      2000
    );

    items.push({
      dedupeKey: externalId || canonicalUrl || null,
      externalId,
      canonicalUrl,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText: truncate(description, 12000),
      metadataJson: {
        format: 'ICS',
        eventStartAt: publishedAt?.toISOString() || null,
        eventUpdatedAt: updatedAt?.toISOString() || null,
        location,
      },
    });
  }

  return items;
}

function parseJsonLike(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeSchemaType(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstString = value.find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    return firstString?.trim() || null;
  }

  return null;
}

function flattenJsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenJsonLdNodes(entry));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const graphNodes = Array.isArray(record['@graph']) ? flattenJsonLdNodes(record['@graph']) : [];
  const itemListNodes = Array.isArray(record.itemListElement)
    ? flattenJsonLdNodes(
        record.itemListElement.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return entry;
          }

          const entryRecord = entry as Record<string, unknown>;
          return entryRecord.item && typeof entryRecord.item === 'object' ? entryRecord.item : entryRecord;
        })
      )
    : [];

  return [record, ...graphNodes, ...itemListNodes];
}

function readSchemaText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      const nestedText =
        (typeof nested['@id'] === 'string' && nested['@id'].trim()) ||
        (typeof nested.name === 'string' && nested.name.trim()) ||
        (typeof nested.url === 'string' && nested.url.trim()) ||
        null;
      if (nestedText) {
        return nestedText;
      }
    }
  }

  return null;
}

function parseHtmlJsonLdItems(
  html: string,
  baseUrl: string,
  defaultPublisher?: string | null
): ParsedIngestionItem[] {
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const items: ParsedIngestionItem[] = [];
  const seenKeys = new Set<string>();

  for (const match of html.matchAll(scriptRegex)) {
    const parsed = parseJsonLike(match[1]);
    if (!parsed) {
      continue;
    }

    for (const node of flattenJsonLdNodes(parsed)) {
      const schemaType = normalizeSchemaType(node['@type']);
      if (!schemaType) {
        continue;
      }

      const loweredType = schemaType.toLowerCase();
      const supportedType =
        loweredType.includes('article') ||
        loweredType.includes('posting') ||
        loweredType === 'report' ||
        loweredType === 'event';

      if (!supportedType) {
        continue;
      }

      const title = sanitizeText(readSchemaText(node, ['headline', 'name', 'title']));
      if (!title || !isProbablyArticleTitle(title)) {
        continue;
      }

      const canonicalUrl = resolveUrl(
        readSchemaText(node, ['url', '@id', 'mainEntityOfPage']),
        baseUrl
      );
      const externalId = sanitizeText(readSchemaText(node, ['identifier', '@id']));
      const dedupeKey = externalId || canonicalUrl || `${schemaType}:${title}`;

      if (seenKeys.has(dedupeKey)) {
        continue;
      }

      seenKeys.add(dedupeKey);

      const description = sanitizeText(readSchemaText(node, ['description', 'abstract']));
      const articleBody = sanitizeText(readSchemaText(node, ['articleBody', 'text']));
      const location = sanitizeText(readSchemaText(node, ['location']));
      const publishedAt = maybeDate(
        readSchemaText(node, ['datePublished', 'startDate', 'dateCreated', 'uploadDate'])
      );
      const updatedAt = maybeDate(readSchemaText(node, ['dateModified', 'endDate']));
      const publisher =
        sanitizeText(readSchemaText(node, ['publisher', 'author', 'provider', 'organizer'])) ||
        defaultPublisher ||
        null;
      const excerpt = truncate(
        [description, loweredType === 'event' && location ? `Location: ${location}` : null]
          .filter(Boolean)
          .join(' '),
        2000
      );

      items.push({
        dedupeKey,
        externalId,
        canonicalUrl,
        title,
        excerpt,
        publishedAt,
        publisher,
        contentText: truncate(articleBody || description, 12000),
        metadataJson: {
          format: 'HTML',
          extractionMode: 'jsonld',
          schemaType,
          eventLocation: loweredType === 'event' ? location : null,
          structuredUpdatedAt: updatedAt?.toISOString() || null,
        },
      });
    }
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

function isGenericCallToActionLabel(value: string | null | undefined) {
  const lowered = collapseWhitespace(value || '').toLowerCase();
  if (!lowered) {
    return true;
  }

  const genericLabels = new Set([
    'read more',
    'read full release',
    'continue reading',
    'click here',
    'learn more',
    'more info',
    'details',
    'register',
    'buy tickets',
    'tickets',
    'rsvp',
    'sign up',
    'apply now',
    'book now',
    'home',
    'about us',
    'contact us',
    'privacy policy',
    'gift a class',
    'class proposal',
    'watch live',
  ]);

  return genericLabels.has(lowered);
}

function hasEventSignalInText(value: string | null | undefined) {
  const lowered = collapseWhitespace(value || '').toLowerCase();
  if (!lowered) {
    return false;
  }

  return (
    /\b(?:event|class|classes|workshop|festival|concert|meeting|hearing|open house|presentation|exhibit|camp|market|fundraiser|reading)\b/i.test(
      lowered
    ) ||
    /\b\d{1,2}:\d{2}\s?(?:a\.?m\.?|p\.?m\.?)\b/i.test(lowered) ||
    /\b\d{1,2}\s?(?:a\.?m\.?|p\.?m\.?)\b/i.test(lowered) ||
    Boolean(extractDateFromText(lowered))
  );
}

function isProbablyEventTitle(title: string, context?: string | null) {
  const collapsed = collapseWhitespace(title);
  if (collapsed.length < 8 || collapsed.length > 160) {
    return false;
  }

  const wordCount = countWords(collapsed);
  if (wordCount < 2 || wordCount > 16) {
    return false;
  }

  if (isGenericCallToActionLabel(collapsed)) {
    return false;
  }

  return hasEventSignalInText(`${collapsed} ${sanitizeText(context) || ''}`);
}

function extractTimeFromContext(context: string) {
  const timeAttr = sanitizeText(
    context.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1] || null
  );
  if (timeAttr) {
    return maybeDate(timeAttr);
  }
  return extractDateFromText(sanitizeText(context));
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

function extractHeadingFromContext(context: string) {
  const headingRegex = /<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi;

  for (const match of context.matchAll(headingRegex)) {
    const candidate = sanitizeText(match[1]);
    if (!candidate || isGenericCallToActionLabel(candidate)) {
      continue;
    }

    if (isProbablyArticleTitle(candidate) || isProbablyEventTitle(candidate, context)) {
      return candidate;
    }
  }

  return null;
}

function extractContextExcerpt(context: string, title: string) {
  const text = sanitizeText(context);
  if (!text) {
    return null;
  }

  const collapsedTitle = collapseWhitespace(title);
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((sentence) => collapseWhitespace(sentence))
    .filter(Boolean);

  for (const sentence of sentences) {
    if (sentence === collapsedTitle || sentence.length < 32) {
      continue;
    }

    if (sentence.toLowerCase().includes(collapsedTitle.toLowerCase()) && sentence.length <= collapsedTitle.length + 12) {
      continue;
    }

    return truncate(sentence, 2000);
  }

  return null;
}

function extractLocationFromHtmlContext(context: string) {
  const text = sanitizeText(context);
  if (!text) {
    return null;
  }

  return (
    text.match(/\b(?:at|location:)\s+([A-Z][A-Za-z0-9&.'\- ]{4,100}?)(?:[.,;]|$)/)?.[1]?.trim() ||
    text.match(/\b(?:held|meet|meeting)\s+at\s+([A-Z][A-Za-z0-9&.'\- ]{4,100}?)(?:[.,;]|$)/)?.[1]?.trim() ||
    null
  );
}

function buildHtmlListingMetadata(context: string, publishedAt: Date | null) {
  const location = extractLocationFromHtmlContext(context);

  return {
    format: 'HTML',
    extractionMode: 'listing',
    eventLocation: location,
    eventStartAt: publishedAt?.toISOString() || null,
  } satisfies Prisma.InputJsonObject;
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
    const rawAnchorTitle = sanitizeText(match[4]);

    if (
      !href ||
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
    const derivedHeading = extractHeadingFromContext(context);
    const title = rawAnchorTitle && !isGenericCallToActionLabel(rawAnchorTitle) ? rawAnchorTitle : derivedHeading;

    if (
      !title ||
      (!isProbablyArticleTitle(title) && !isProbablyEventTitle(title, context))
    ) {
      continue;
    }

    const excerpt = extractParagraphExcerpt(context, title) || extractContextExcerpt(context, title);
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
      metadataJson: buildHtmlListingMetadata(context, publishedAt),
    });
  }

  return items;
}

function parseHtmlEventBlockItems(
  html: string,
  baseUrl: string,
  defaultPublisher?: string | null
): ParsedIngestionItem[] {
  const publisher =
    sanitizeText(extractMetaContent(html, 'og:site_name')) || defaultPublisher || null;
  const baseWithoutHash = resolveUrl(baseUrl, baseUrl) || baseUrl;
  const blockRegex = /<(article|section|li|div)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const items: ParsedIngestionItem[] = [];
  const seenKeys = new Set<string>();

  for (const match of html.matchAll(blockRegex)) {
    const blockHtml = match[0];
    const blockText = sanitizeText(blockHtml);
    if (!blockText || blockText.length < 40 || blockText.length > 1800) {
      continue;
    }

    const title = extractHeadingFromContext(blockHtml);
    if (!title || !isProbablyEventTitle(title, blockHtml)) {
      continue;
    }

    if (!hasEventSignalInText(blockText)) {
      continue;
    }

    const hrefMatches = Array.from(blockHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
    const primaryHref =
      hrefMatches
        .map((hrefMatch) => ({
          href: resolveUrl(hrefMatch[1], baseUrl),
          label: sanitizeText(hrefMatch[2]),
        }))
        .find(
          (entry) =>
            entry.href &&
            entry.href !== baseWithoutHash &&
            !entry.href.startsWith('javascript:') &&
            !entry.href.startsWith('mailto:') &&
            !isGenericCallToActionLabel(entry.label)
        )?.href || baseWithoutHash;

    const excerpt = extractParagraphExcerpt(blockHtml, title) || extractContextExcerpt(blockHtml, title);
    const publishedAt = extractTimeFromContext(blockHtml);
    const dedupeKey = `html-block:${normalizeTitleForDedupe(title)}`;

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    items.push({
      dedupeKey,
      canonicalUrl: primaryHref,
      title,
      excerpt,
      publishedAt,
      publisher,
      contentText: excerpt || truncate(blockText, 12000),
      metadataJson: {
        ...buildHtmlListingMetadata(blockHtml, publishedAt),
        extractionMode: 'event-block',
      },
    });
  }

  return items;
}

function mergeParsedItemsUnique(...groups: ParsedIngestionItem[][]) {
  const merged: ParsedIngestionItem[] = [];
  const seenKeys = new Set<string>();

  for (const group of groups) {
    for (const item of group) {
      const key = item.dedupeKey || item.externalId || item.canonicalUrl || item.title;
      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      merged.push(item);
    }
  }

  return merged;
}

function parseHtmlDocument(html: string, baseUrl: string, defaultPublisher?: string | null): ParsedIngestionItem[] {
  const structuredItems = parseHtmlJsonLdItems(html, baseUrl, defaultPublisher);
  const listingItems = parseHtmlListingItems(html, baseUrl, defaultPublisher);
  const eventBlockItems = parseHtmlEventBlockItems(html, baseUrl, defaultPublisher);
  const extractedItems = mergeParsedItemsUnique(structuredItems, listingItems, eventBlockItems);

  if (extractedItems.length >= 2) {
    return extractedItems;
  }

  if (structuredItems.length === 1) {
    return structuredItems;
  }

  if (eventBlockItems.length === 1) {
    return eventBlockItems;
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
    case 'ICS':
      return 'text/calendar, application/ics, */*;q=0.8';
    case 'PDF':
      return 'application/pdf, */*;q=0.8';
    default:
      return '*/*';
  }
}

function parseResponseItems(params: {
  sourceFormat: string;
  bodyText?: string;
  bodyBytes?: Uint8Array;
  sourceUrl: string;
  publisher?: string | null;
}) {
  switch (params.sourceFormat) {
    case 'RSS':
    case 'ATOM':
      return parseXmlFeed(params.bodyText || '', params.sourceUrl, params.publisher);
    case 'JSON': {
      const parsed = JSON.parse(params.bodyText || '') as unknown;
      return parseJsonFeed(parsed, params.sourceUrl, params.publisher);
    }
    case 'HTML':
      return parseHtmlDocument(params.bodyText || '', params.sourceUrl, params.publisher);
    case 'ICS':
      return parseIcsCalendar(params.bodyText || '', params.sourceUrl, params.publisher);
    case 'PDF':
      return parsePdfDocument(params.bodyBytes || new Uint8Array(), params.sourceUrl, params.publisher);
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
      executionLane: true,
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

  if (source.executionLane === 'LOCAL_BROWSER') {
    throw new Error('This monitored source is configured for local browser execution.');
  }

  const startedAt = new Date();
  const requestHeaders = new Headers({
    Accept: buildAcceptHeader(source.sourceFormat),
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
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

  try {
    const bodyBytes = new Uint8Array(await response.arrayBuffer());
    const bodyText =
      source.sourceFormat === 'PDF' ? undefined : Buffer.from(bodyBytes).toString('utf-8');
    const items = parseResponseItems({
      sourceFormat: source.sourceFormat,
      bodyText,
      bodyBytes,
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
