import { parseDocument } from 'htmlparser2';
import type { Prisma } from '@prisma/client';

export const PACAST_USER_AGENT = 'HighlanderToday-Reporter/1.0 (+https://highlander.today)';
type Node = ReturnType<typeof parseDocument>['children'][number];
const children = (node: Node): Node[] => ('children' in node ? node.children : []);
const allNodes = (node: Node): Node[] => [node, ...children(node).flatMap(allNodes)];
const isTag = (node: Node, name: string) => 'attribs' in node && node.name === name;
function text(node: Node): string {
  if ('attribs' in node && ['script', 'style', 'nav', 'footer'].includes(node.name)) return '';
  return node.type === 'text' ? node.data : children(node).map(text).join(' ');
}
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

export function isPacastListingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'pacast.com' &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.port &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function listingDate(value: string): string | null {
  const match = value.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})$/,
  );
  if (!match) return null;
  const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ].indexOf(match[1]);
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
  return date.getUTCFullYear() === Number(match[3]) &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === Number(match[2])
    ? date.toISOString().slice(0, 10)
    : null;
}

/** Listing dates are source/activity dates, never verified publication dates. */
export function pacastListedActivityDate(metadata: unknown): Date | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  if (
    value.extractionMode !== 'pacast-listing' ||
    typeof value.sourceListedDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.sourceListedDate)
  )
    return null;
  const date = new Date(`${value.sourceListedDate}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.sourceListedDate
    ? date
    : null;
}

type PacastItem = {
  dedupeKey: string;
  externalId: string;
  canonicalUrl: string;
  title: string;
  excerpt: string;
  publishedAt: null;
  publisher: string;
  contentText: null;
  metadataJson: Prisma.InputJsonObject;
};

/** Fail closed when PAcast's record structure changes; navigation is never news. */
export function parsePacastListing(html: string, publisher?: string | null): PacastItem[] {
  const items = new Map<string, PacastItem>();
  const dom = parseDocument(html, { decodeEntities: true });
  const banners = allNodes(dom).filter(
    (node) => isTag(node, 'section') && 'attribs' in node && node.attribs.id === 'banner',
  );
  for (const banner of banners.slice(0, 40)) {
    const descendants = allNodes(banner);
    const heading = descendants.find((node) => isTag(node, 'h2'));
    const dateParagraph = descendants.find((node) => isTag(node, 'p'));
    const anchor = descendants.find(
      (node) =>
        isTag(node, 'a') && 'attribs' in node && /^(?:a|m)\?p=\d+$/.test(node.attribs.href || ''),
    );
    const title = heading ? clean(text(heading)) : '';
    const dateLocation = dateParagraph ? clean(text(dateParagraph)) : '';
    const dateText = dateLocation.match(/^[A-Za-z]+ \d{1,2}, \d{4}/)?.[0] || '';
    const sourceListedDate = listingDate(dateText);
    if (!title || title.length > 300 || !sourceListedDate || !anchor || !('attribs' in anchor))
      continue;
    const href = anchor.attribs.href;
    const externalId = href.match(/\?p=(\d+)$/)![1];
    const recordKind = href.startsWith('a?') ? 'advisory' : 'media';
    const canonicalUrl = new URL(href, 'https://pacast.com/').toString();
    const listedLocation =
      dateLocation
        .slice(dateText.length)
        .replace(/^\s*-\s*/, '')
        .trim()
        .slice(0, 300) || null;
    const existing = items.get(externalId);
    // The same production can move from advisory to media without duplicating a lead.
    if (existing?.metadataJson.recordKind === 'media' && recordKind === 'advisory') continue;
    items.set(externalId, {
      dedupeKey: `pacast:${externalId}`,
      externalId,
      canonicalUrl,
      title,
      excerpt: `PAcast ${recordKind} listing dated ${sourceListedDate}${listedLocation ? ` — ${listedLocation}` : ''}.`,
      publishedAt: null,
      publisher: publisher?.trim() || 'Commonwealth Media Services',
      contentText: null,
      metadataJson: {
        format: 'HTML',
        extractionMode: 'pacast-listing',
        recordKind,
        sourceListedDate,
        dateBasis: `listed-${recordKind}-date`,
        datePrecision: 'day',
        listedLocation,
        publicationDateVerified: false,
        documentTextRequired: true,
      },
    });
  }
  if (!items.size)
    throw new Error(
      'PAcast returned no validated dated media/advisory records; refusing generic page fallback.',
    );
  return [...items.values()]
    .sort((a, b) =>
      String(b.metadataJson.sourceListedDate).localeCompare(
        String(a.metadataJson.sourceListedDate),
      ),
    )
    .slice(0, 12);
}
