import type { Prisma } from '@prisma/client';
import { db } from './db';
import { ArticleStatus, EventStatus, MarketplaceStatus } from './constants';
import { resolveTenantCommunityId } from './tenant';

export type ManagedHomepageSectionType =
  | 'FEATURED_ARTICLES'
  | 'LATEST_NEWS'
  | 'UPCOMING_EVENTS'
  | 'RECENT_MARKETPLACE';

export type HomepageContentType = 'ARTICLE' | 'EVENT' | 'MARKETPLACE_LISTING';

export interface HomepageContentItem {
  contentType: HomepageContentType;
  contentId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  url: string;
  metadata?: string;
  author?: {
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string;
    trustLevel?: string;
  };
  secondaryUrl?: string;
  secondaryLabel?: string;
  searchText?: string;
}

export interface HomepageSectionData {
  id: string;
  sectionType: ManagedHomepageSectionType;
  title: string;
  sortOrder: number;
  isVisible: boolean;
  maxItems: number;
  pinnedItems: HomepageContentItem[];
  availableItems: HomepageContentItem[];
  displayItems: HomepageContentItem[];
}

export interface ResolveHomepageCommunityOptions {
  preferredCommunityId?: string;
  preferredDomain?: string;
  host?: string;
}

type SectionConfig = {
  title: string;
  contentType: HomepageContentType;
  maxItems: number;
};

export const HOMEPAGE_SECTION_CONFIG: Record<ManagedHomepageSectionType, SectionConfig> = {
  FEATURED_ARTICLES: {
    title: 'Featured',
    contentType: 'ARTICLE',
    maxItems: 1,
  },
  LATEST_NEWS: {
    title: 'Latest News',
    contentType: 'ARTICLE',
    maxItems: 5,
  },
  UPCOMING_EVENTS: {
    title: 'Upcoming Events',
    contentType: 'EVENT',
    maxItems: 4,
  },
  RECENT_MARKETPLACE: {
    title: 'Market',
    contentType: 'MARKETPLACE_LISTING',
    maxItems: 3,
  },
};

export const DEFAULT_SECTION_ORDER = [
  'FEATURED_ARTICLES',
  'LATEST_NEWS',
  'UPCOMING_EVENTS',
  'RECENT_MARKETPLACE',
] as const;

type HomepageSectionWithPins = Prisma.HomepageSectionGetPayload<{
  include: {
    pinnedItems: true;
  };
}>;

export async function resolveHomepageCommunityId(options?: ResolveHomepageCommunityOptions) {
  return resolveTenantCommunityId(options);
}

export async function ensureHomepageSections(communityId: string): Promise<HomepageSectionWithPins[]> {
  const existingSections = await db.homepageSection.findMany({
    where: {
      communityId,
      sectionType: { in: Array.from(DEFAULT_SECTION_ORDER) },
    },
    include: {
      pinnedItems: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const existingTypes = new Set(existingSections.map((section) => section.sectionType));

  if (existingTypes.size !== DEFAULT_SECTION_ORDER.length) {
    await db.$transaction(
      DEFAULT_SECTION_ORDER
        .filter((sectionType) => !existingTypes.has(sectionType))
        .map((sectionType, index) =>
          db.homepageSection.create({
            data: {
              communityId,
              sectionType,
              sortOrder: DEFAULT_SECTION_ORDER.indexOf(sectionType) + 1 + index,
              isVisible: true,
            },
          })
        )
    );

    return db.homepageSection.findMany({
      where: {
        communityId,
        sectionType: { in: Array.from(DEFAULT_SECTION_ORDER) },
      },
      include: {
        pinnedItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  return existingSections;
}

function formatArticleMetadata(article: {
  author: { firstName: string; lastName: string };
  category: { name: string } | null;
  publishedAt: Date | null;
}) {
  return [
    article.category?.name,
    `${article.author.firstName} ${article.author.lastName}`.trim(),
    article.publishedAt
      ? article.publishedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

function formatEventMetadata(event: {
  startDatetime: Date;
  locationText: string | null;
  costText: string | null;
}) {
  return [
    event.startDatetime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    event.locationText,
    event.costText,
  ]
    .filter(Boolean)
    .join(' • ');
}

function formatMarketplaceMetadata(listing: {
  category: string;
  priceCents: number;
  store: { name: string };
}) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(listing.priceCents / 100);

  return [
    listing.category,
    formattedPrice,
    listing.store.name,
  ]
    .filter(Boolean)
    .join(' • ');
}

async function getArticleCandidates(communityId: string, limit: number) {
  const articles = await db.article.findMany({
    where: {
      communityId,
      status: ArticleStatus.PUBLISHED,
    },
    include: {
      author: {
        select: { firstName: true, lastName: true, profilePhotoUrl: true, trustLevel: true },
      },
      category: {
        select: { name: true },
      },
    },
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });

  return articles.map<HomepageContentItem>((article) => ({
    contentType: 'ARTICLE',
    contentId: article.id,
    title: article.title,
    description: article.excerpt ?? undefined,
    imageUrl: article.featuredImageUrl ?? undefined,
    url: `/local-life/${article.id}`,
    metadata: formatArticleMetadata(article),
    author: {
      firstName: article.author.firstName,
      lastName: article.author.lastName,
      profilePhotoUrl: article.author.profilePhotoUrl ?? undefined,
      trustLevel: article.author.trustLevel ?? undefined,
    },
    searchText: `${article.title} ${article.author.lastName}`.toLowerCase(),
  }));
}

export async function getHomepageArticleCandidates(communityId: string, limit = 100) {
  return getArticleCandidates(communityId, limit);
}

async function getEventCandidates(communityId: string, limit: number) {
  const events = await db.event.findMany({
    where: {
      communityId,
      status: EventStatus.PUBLISHED,
      startDatetime: { gte: new Date() },
    },
    orderBy: { startDatetime: 'asc' },
    take: limit,
  });

  return events.map<HomepageContentItem>((event) => ({
    contentType: 'EVENT',
    contentId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    imageUrl: event.photoUrl ?? undefined,
    url: `/events/${event.id}`,
    metadata: formatEventMetadata(event),
  }));
}

async function getMarketplaceCandidates(communityId: string, limit: number) {
  const listings = await db.marketplaceListing.findMany({
    where: {
      communityId,
      status: MarketplaceStatus.ACTIVE,
    },
    include: {
      store: {
        select: { name: true },
      },
      photos: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return listings.map<HomepageContentItem>((listing) => ({
    contentType: 'MARKETPLACE_LISTING',
    contentId: listing.id,
    title: listing.title,
    description: listing.description ?? undefined,
    imageUrl: listing.photos[0]?.imageUrl,
    url: `/marketplace/${listing.id}`,
    metadata: formatMarketplaceMetadata(listing),
    secondaryUrl: `/marketplace/stores/${listing.storeId}`,
    secondaryLabel: `View ${listing.store.name}`,
  }));
}

async function getSectionCandidatePool(sectionType: ManagedHomepageSectionType, communityId: string) {
  const config = HOMEPAGE_SECTION_CONFIG[sectionType];
  const candidateLimit = Math.max(config.maxItems * 4, 12);

  switch (config.contentType) {
    case 'ARTICLE':
      return getArticleCandidates(communityId, candidateLimit);
    case 'EVENT':
      return getEventCandidates(communityId, candidateLimit);
    case 'MARKETPLACE_LISTING':
      return getMarketplaceCandidates(communityId, candidateLimit);
  }
}

function mapPinnedItems(
  pinnedItems: Array<{ contentType: HomepageContentType; contentId: string; sortOrder: number }>,
  candidates: HomepageContentItem[]
) {
  const byKey = new Map(
    candidates.map((candidate) => [`${candidate.contentType}:${candidate.contentId}`, candidate])
  );

  return pinnedItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((pinnedItem) => byKey.get(`${pinnedItem.contentType}:${pinnedItem.contentId}`))
    .filter((item): item is HomepageContentItem => Boolean(item));
}

export async function getHomepageSectionsData(communityId: string): Promise<HomepageSectionData[]> {
  const sections = await ensureHomepageSections(communityId);

  const candidatePools = await Promise.all(
    sections.map(async (section) => ({
      sectionId: section.id,
      items: await getSectionCandidatePool(section.sectionType as ManagedHomepageSectionType, communityId),
    }))
  );

  const candidatesBySectionId = new Map(
    candidatePools.map((pool) => [pool.sectionId, pool.items])
  );

  const resolvedSections = sections
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => {
      const sectionType = section.sectionType as ManagedHomepageSectionType;
      const config = HOMEPAGE_SECTION_CONFIG[sectionType];
      const availableItems = candidatesBySectionId.get(section.id) ?? [];
      const pinnedItems = mapPinnedItems(
        section.pinnedItems.map((item) => ({
          contentType: item.contentType as HomepageContentType,
          contentId: item.contentId,
          sortOrder: item.sortOrder,
        })),
        availableItems
      );
      const availableExcludingPinned = availableItems.filter(
        (item) =>
          !pinnedItems.some(
            (pinnedItem) =>
              pinnedItem.contentType === item.contentType && pinnedItem.contentId === item.contentId
          )
      );

      return {
        id: section.id,
        sectionType,
        title: config.title,
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        maxItems: config.maxItems,
        pinnedItems,
        availableItems: availableExcludingPinned,
        displayItems: (pinnedItems.length > 0 ? pinnedItems : availableItems).slice(0, config.maxItems),
      };
    });

  const featuredSection = resolvedSections.find(
    (section) => section.sectionType === 'FEATURED_ARTICLES' && section.isVisible
  );

  if (!featuredSection) {
    return resolvedSections;
  }

  const featuredArticleIds = new Set(
    featuredSection.displayItems
      .filter((item) => item.contentType === 'ARTICLE')
      .map((item) => item.contentId)
  );

  return resolvedSections.map((section) => {
    if (section.sectionType !== 'LATEST_NEWS') {
      return section;
    }

    const pinnedItems = section.pinnedItems.filter((item) => !featuredArticleIds.has(item.contentId));
    const availableItems = section.availableItems.filter((item) => !featuredArticleIds.has(item.contentId));

    return {
      ...section,
      pinnedItems,
      availableItems,
      displayItems: (pinnedItems.length > 0 ? pinnedItems : availableItems).slice(0, section.maxItems),
    };
  });
}
