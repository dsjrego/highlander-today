import { Prisma } from '@prisma/client';
import { db } from './db';
import { ArticleStatus, EventStatus, MarketplaceStatus } from './constants';

export type SearchResultType = 'article' | 'event' | 'marketplace';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  url: string;
  relevance: number;
  communityId?: string;
  imageUrl?: string;
  metadata?: string;
}

export interface SearchCounts {
  article: number;
  event: number;
  marketplace: number;
}

export interface SearchResultsPage {
  query: string;
  results: SearchResult[];
  counts: SearchCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  appliedType: SearchResultType | null;
}

interface SearchOptions {
  communityId?: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: SearchResultType;
    minRelevance?: number;
  };
}

interface SearchPageOptions {
  communityId?: string;
  limit?: number;
  page?: number;
  type?: SearchResultType;
}

interface CommunityResolutionOptions {
  communityId?: string | null;
  communityDomain?: string | null;
  host?: string | null;
}

const LOCALHOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
}

async function getFallbackCommunityId(): Promise<string | undefined> {
  return (await db.community.findFirst({ select: { id: true } }))?.id;
}

export async function resolveSearchCommunityId(
  options: CommunityResolutionOptions = {}
): Promise<string | undefined> {
  if (options.communityId) {
    return options.communityId;
  }

  const candidates = [options.communityDomain, options.host]
    .map((value) => normalizeHost(value))
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (LOCALHOSTS.has(candidate)) {
      return getFallbackCommunityId();
    }

    const domains = candidate.startsWith('www.')
      ? [candidate, candidate.slice(4)]
      : [candidate, `www.${candidate}`];

    const community = await db.community.findFirst({
      where: {
        domain: {
          in: domains,
        },
      },
      select: { id: true },
    });

    if (community) {
      return community.id;
    }
  }

  return getFallbackCommunityId();
}

function buildTextRelevance(query: string, fields: Array<string | null | undefined>): number {
  const haystack = fields
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  if (!haystack) {
    return 0;
  }

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, term) => {
      if (haystack.includes(term)) {
        return score + 1;
      }

      return score;
    }, 0);
}

function buildArticleMetadata(article: {
  category: { name: string } | null;
  publishedAt: Date | null;
  author: { firstName: string; lastName: string };
}): string {
  const pieces = [
    article.category?.name,
    article.author.firstName && article.author.lastName
      ? `${article.author.firstName} ${article.author.lastName}`
      : null,
    article.publishedAt
      ? article.publishedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
  ];

  return pieces.filter(Boolean).join(' • ');
}

function buildEventMetadata(event: {
  startDatetime: Date;
  locationText: string | null;
  costText: string | null;
}): string {
  const pieces = [
    event.startDatetime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    event.locationText,
    event.costText,
  ];

  return pieces.filter(Boolean).join(' • ');
}

function buildMarketplaceMetadata(listing: {
  category: string;
  priceCents: number;
  author: { firstName: string; lastName: string };
}): string {
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(listing.priceCents / 100);

  const sellerName =
    listing.author.firstName && listing.author.lastName
      ? `${listing.author.firstName} ${listing.author.lastName}`
      : null;

  return [listing.category, price, sellerName].filter(Boolean).join(' • ');
}

function buildArticleWhere(query: string, communityId?: string): Prisma.ArticleWhereInput {
  return {
    status: ArticleStatus.PUBLISHED,
    ...(communityId ? { communityId } : {}),
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { excerpt: { contains: query, mode: 'insensitive' as const } },
      { body: { contains: query, mode: 'insensitive' as const } },
    ],
  };
}

function buildEventWhere(query: string, communityId?: string): Prisma.EventWhereInput {
  return {
    status: EventStatus.PUBLISHED,
    ...(communityId ? { communityId } : {}),
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { locationText: { contains: query, mode: 'insensitive' as const } },
    ],
  };
}

function buildMarketplaceWhere(
  query: string,
  communityId?: string
): Prisma.MarketplaceListingWhereInput {
  return {
    status: MarketplaceStatus.ACTIVE,
    ...(communityId ? { communityId } : {}),
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { category: { contains: query, mode: 'insensitive' as const } },
    ],
  };
}

async function findSearchArticles(
  query: string,
  communityId: string | undefined,
  take: number
) {
  return db.article.findMany({
    where: buildArticleWhere(query, communityId),
    include: {
      author: {
        select: { firstName: true, lastName: true },
      },
      category: {
        select: { name: true },
      },
    },
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    take,
  });
}

async function findSearchEvents(query: string, communityId: string | undefined, take: number) {
  return db.event.findMany({
    where: buildEventWhere(query, communityId),
    orderBy: [{ startDatetime: 'asc' }, { createdAt: 'desc' }],
    take,
  });
}

async function findSearchMarketplaceListings(
  query: string,
  communityId: string | undefined,
  take: number
) {
  return db.marketplaceListing.findMany({
    where: buildMarketplaceWhere(query, communityId),
    include: {
      author: {
        select: { firstName: true, lastName: true },
      },
      photos: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function searchContent(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { communityId, limit = 20, offset = 0, filters = {} } = options;
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const take = limit + offset;

  const [articles, events, listings] = await Promise.all([
    !filters.type || filters.type === 'article'
      ? findSearchArticles(trimmedQuery, communityId, take)
      : Promise.resolve([]),
    !filters.type || filters.type === 'event'
      ? findSearchEvents(trimmedQuery, communityId, take)
      : Promise.resolve([]),
    !filters.type || filters.type === 'marketplace'
      ? findSearchMarketplaceListings(trimmedQuery, communityId, take)
      : Promise.resolve([]),
  ]);

  const results: SearchResult[] = [
    ...articles.map((article) => ({
      id: article.id,
      type: 'article' as const,
      title: article.title,
      description: article.excerpt ?? undefined,
      url: `/local-life/${article.id}`,
      relevance:
        buildTextRelevance(trimmedQuery, [article.title, article.excerpt, article.body]) +
        (article.isFeatured ? 1 : 0),
      communityId: article.communityId,
      imageUrl: article.featuredImageUrl ?? undefined,
      metadata: buildArticleMetadata(article),
    })),
    ...events.map((event) => ({
      id: event.id,
      type: 'event' as const,
      title: event.title,
      description: event.description ?? undefined,
      url: `/events/${event.id}`,
      relevance: buildTextRelevance(trimmedQuery, [
        event.title,
        event.description,
        event.locationText,
      ]),
      communityId: event.communityId,
      imageUrl: event.photoUrl ?? undefined,
      metadata: buildEventMetadata(event),
    })),
    ...listings.map((listing) => ({
      id: listing.id,
      type: 'marketplace' as const,
      title: listing.title,
      description: listing.description ?? undefined,
      url: `/marketplace/${listing.id}`,
      relevance: buildTextRelevance(trimmedQuery, [
        listing.title,
        listing.description,
        listing.category,
      ]),
      communityId: listing.communityId,
      imageUrl: listing.photos[0]?.imageUrl,
      metadata: buildMarketplaceMetadata(listing),
    })),
  ];

  return results
    .filter((result) => !filters.minRelevance || result.relevance >= filters.minRelevance)
    .sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title))
    .slice(offset, offset + limit);
}

export async function searchContentPage(
  query: string,
  options: SearchPageOptions = {}
): Promise<SearchResultsPage> {
  const trimmedQuery = query.trim();
  const limit = Math.max(1, Math.min(options.limit ?? 12, 50));
  const page = Math.max(1, options.page ?? 1);
  const appliedType = options.type ?? null;

  if (!trimmedQuery) {
    return {
      query: trimmedQuery,
      results: [],
      counts: { article: 0, event: 0, marketplace: 0 },
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      },
      appliedType,
    };
  }

  const [counts, results] = await Promise.all([
    Promise.all([
      db.article.count({ where: buildArticleWhere(trimmedQuery, options.communityId) }),
      db.event.count({ where: buildEventWhere(trimmedQuery, options.communityId) }),
      db.marketplaceListing.count({
        where: buildMarketplaceWhere(trimmedQuery, options.communityId),
      }),
    ]).then(([article, event, marketplace]) => ({
      article,
      event,
      marketplace,
    })),
    searchContent(trimmedQuery, {
      communityId: options.communityId,
      limit,
      offset: (page - 1) * limit,
      filters: appliedType ? { type: appliedType } : undefined,
    }),
  ]);

  const total = appliedType
    ? counts[appliedType]
    : counts.article + counts.event + counts.marketplace;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    query: trimmedQuery,
    results,
    counts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    appliedType,
  };
}

export async function searchArticles(query: string, communityId?: string, limit = 10) {
  return searchContent(query, {
    communityId,
    limit,
    filters: { type: 'article' },
  });
}

export async function searchEvents(query: string, communityId?: string, limit = 10) {
  return searchContent(query, {
    communityId,
    limit,
    filters: { type: 'event' },
  });
}

export async function searchListings(query: string, communityId?: string, limit = 10) {
  return searchContent(query, {
    communityId,
    limit,
    filters: { type: 'marketplace' },
  });
}

export async function searchMarketplace(query: string, communityId?: string, limit = 10) {
  return searchListings(query, communityId, limit);
}
