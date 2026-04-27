import type { Prisma } from '@prisma/client';
import { db } from './db';
import { ArticleStatus, EventStatus, MarketplaceStatus } from './constants';
import { formatLocationPrimary } from './location-format';
import { getArticleUiImageUrl } from './article-images';
import { resolveTenantCommunityId } from './tenant';

export type HomepageContentType = 'ARTICLE' | 'RECIPE' | 'EVENT' | 'MARKETPLACE_LISTING';
export type HomepageBoxType = 'ARTICLES' | 'EVENTS' | 'RECIPES' | 'MARKETPLACE' | 'MEMORIAM';

export interface HomepageContentItem {
  contentType: HomepageContentType;
  contentId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageDisplayMode?: 'cover' | 'contain';
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

export interface HomepageBoxData {
  id: string;
  boxType: HomepageBoxType;
  title: string;
  description: string;
  contentType: HomepageContentType;
  sortOrder: number;
  isVisible: boolean;
  maxLinks: number;
  heroItem: HomepageContentItem | null;
  linkItems: HomepageContentItem[];
  pinnedItems: HomepageContentItem[];
  availableItems: HomepageContentItem[];
}

export interface ResolveHomepageCommunityOptions {
  preferredCommunityId?: string;
  preferredDomain?: string;
  host?: string;
}

type HomepageBoxConfig = {
  title: string;
  description: string;
  contentType: HomepageContentType;
  defaultSortOrder: number;
};

export const HOMEPAGE_BOX_CONFIG: Record<HomepageBoxType, HomepageBoxConfig> = {
  ARTICLES: {
    title: 'Local Life',
    description: 'A lead story with optional supporting links.',
    contentType: 'ARTICLE',
    defaultSortOrder: 1,
  },
  EVENTS: {
    title: 'Events',
    description: 'One featured event with optional supporting links.',
    contentType: 'EVENT',
    defaultSortOrder: 2,
  },
  RECIPES: {
    title: 'Recipes & Food',
    description: 'One featured recipe with optional supporting links.',
    contentType: 'RECIPE',
    defaultSortOrder: 3,
  },
  MARKETPLACE: {
    title: 'Marketplace',
    description: 'One featured listing with optional supporting links.',
    contentType: 'MARKETPLACE_LISTING',
    defaultSortOrder: 4,
  },
  MEMORIAM: {
    title: 'Memoriam',
    description: 'Recently remembered community members.',
    contentType: 'ARTICLE', // unused — MEMORIAM renders via RecentlyRemembered component
    defaultSortOrder: 5,
  },
};

// These box types are auto-created for every new community.
export const DEFAULT_HOMEPAGE_BOX_ORDER = [
  'ARTICLES',
  'EVENTS',
  'RECIPES',
  'MARKETPLACE',
] as const satisfies readonly HomepageBoxType[];

// All recognised box types — opt-in types like MEMORIAM are included here
// but are NOT auto-created; admins add them manually via /admin/homepage.
const ALL_KNOWN_BOX_TYPES = [
  ...DEFAULT_HOMEPAGE_BOX_ORDER,
  'MEMORIAM',
] as const satisfies readonly HomepageBoxType[];

type HomepageBoxWithItems = Prisma.HomepageBoxGetPayload<{
  include: {
    items: {
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }];
    };
  };
}>;

type LegacyHomepageSectionWithPins = Prisma.HomepageSectionLegacyGetPayload<{
  include: {
    pinnedItems: {
      orderBy: { sortOrder: 'asc' };
    };
  };
}>;

export async function resolveHomepageCommunityId(options?: ResolveHomepageCommunityOptions) {
  return resolveTenantCommunityId(options);
}

export async function ensureHomepageBoxes(communityId: string): Promise<HomepageBoxWithItems[]> {
  // Check only the default types to decide what needs auto-creating.
  const existingBoxes = await db.homepageBox.findMany({
    where: {
      communityId,
      boxType: { in: Array.from(DEFAULT_HOMEPAGE_BOX_ORDER) },
    },
    include: {
      items: {
        orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const existingTypes = new Set(existingBoxes.map((box) => box.boxType as HomepageBoxType));

  if (existingTypes.size !== DEFAULT_HOMEPAGE_BOX_ORDER.length) {
    await db.$transaction(
      DEFAULT_HOMEPAGE_BOX_ORDER
        .filter((boxType) => !existingTypes.has(boxType))
        .map((boxType) =>
          db.homepageBox.create({
            data: {
              communityId,
              boxType,
              sortOrder: HOMEPAGE_BOX_CONFIG[boxType].defaultSortOrder,
              isVisible: true,
              maxLinks: 5,
            },
          })
        )
    );

  }

  await maybeImportLegacyHomepageData(communityId);

  // Fetch all known box types so opt-in boxes like MEMORIAM are included when present.
  return db.homepageBox.findMany({
    where: {
      communityId,
      boxType: { in: Array.from(ALL_KNOWN_BOX_TYPES) },
    },
    include: {
      items: {
        orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

async function maybeImportLegacyHomepageData(communityId: string) {
  const [boxes, legacySections] = await Promise.all([
    db.homepageBox.findMany({
      where: {
        communityId,
        boxType: { in: Array.from(DEFAULT_HOMEPAGE_BOX_ORDER) },
      },
      include: {
        items: {
          orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
    db.homepageSectionLegacy.findMany({
      where: {
        communityId,
        sectionType: {
          in: [
            'FEATURED_ARTICLES',
            'LATEST_NEWS',
            'FEATURED_RECIPES',
            'UPCOMING_EVENTS',
            'RECENT_MARKETPLACE',
          ],
        },
      },
      include: {
        pinnedItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
  ]);

  const alreadyMigrated = boxes.some((box) => box.items.length > 0);
  const legacyHasPins = legacySections.some((section) => section.pinnedItems.length > 0);

  if (alreadyMigrated || !legacyHasPins) {
    return;
  }

  const legacyByType = new Map(
    legacySections.map((section) => [section.sectionType, section])
  );
  const boxByType = new Map(boxes.map((box) => [box.boxType as HomepageBoxType, box]));
  const migrationPlan = buildLegacyHomepageMigrationPlan(legacyByType, boxByType);

  if (migrationPlan.length === 0) {
    return;
  }

  await db.$transaction(
    migrationPlan.flatMap((entry) => {
      const operations: Prisma.PrismaPromise<unknown>[] = [
        db.homepageBox.update({
          where: { id: entry.boxId },
          data: {
            sortOrder: entry.sortOrder,
            isVisible: entry.isVisible,
            maxLinks: 5,
          },
        }),
      ];

      if (entry.items.length > 0) {
        operations.push(
          db.homepageBoxItem.createMany({
            data: entry.items.map((item, index) => ({
              homepageBoxId: entry.boxId,
              role: item.role,
              contentType: item.contentType,
              contentId: item.contentId,
              pinnedByUserId: item.pinnedByUserId,
              sortOrder: index + 1,
              pinnedAt: item.pinnedAt,
            })),
          })
        );
      }

      return operations;
    })
  );
}

function buildLegacyHomepageMigrationPlan(
  legacyByType: Map<string, LegacyHomepageSectionWithPins>,
  boxByType: Map<HomepageBoxType, HomepageBoxWithItems>
) {
  const articleBox = boxByType.get('ARTICLES');
  const eventBox = boxByType.get('EVENTS');
  const recipeBox = boxByType.get('RECIPES');
  const marketplaceBox = boxByType.get('MARKETPLACE');
  const featuredArticles = legacyByType.get('FEATURED_ARTICLES');
  const latestNews = legacyByType.get('LATEST_NEWS');
  const featuredRecipes = legacyByType.get('FEATURED_RECIPES');
  const upcomingEvents = legacyByType.get('UPCOMING_EVENTS');
  const recentMarketplace = legacyByType.get('RECENT_MARKETPLACE');

  const plan: Array<{
    boxId: string;
    sortOrder: number;
    isVisible: boolean;
    items: Array<{
      role: 'HERO' | 'LINK';
      contentType: HomepageContentType;
      contentId: string;
      pinnedByUserId: string;
      pinnedAt: Date;
    }>;
  }> = [];

  if (articleBox) {
    const heroItem = featuredArticles?.pinnedItems[0];
    const linkItems = latestNews?.pinnedItems ?? [];
    const items = [
      ...(heroItem
        ? [
            {
              role: 'HERO' as const,
              contentType: heroItem.contentType as HomepageContentType,
              contentId: heroItem.contentId,
              pinnedByUserId: heroItem.pinnedByUserId,
              pinnedAt: heroItem.pinnedAt,
            },
          ]
        : []),
      ...linkItems.slice(0, 5).map((item) => ({
        role: 'LINK' as const,
        contentType: item.contentType as HomepageContentType,
        contentId: item.contentId,
        pinnedByUserId: item.pinnedByUserId,
        pinnedAt: item.pinnedAt,
      })),
    ];

    plan.push({
      boxId: articleBox.id,
      sortOrder: featuredArticles?.sortOrder ?? HOMEPAGE_BOX_CONFIG.ARTICLES.defaultSortOrder,
      isVisible: featuredArticles?.isVisible ?? true,
      items,
    });
  }

  const simpleMappings: Array<{
    box: HomepageBoxWithItems | undefined;
    section: LegacyHomepageSectionWithPins | undefined;
    fallbackSortOrder: number;
  }> = [
    {
      box: eventBox,
      section: upcomingEvents,
      fallbackSortOrder: HOMEPAGE_BOX_CONFIG.EVENTS.defaultSortOrder,
    },
    {
      box: recipeBox,
      section: featuredRecipes,
      fallbackSortOrder: HOMEPAGE_BOX_CONFIG.RECIPES.defaultSortOrder,
    },
    {
      box: marketplaceBox,
      section: recentMarketplace,
      fallbackSortOrder: HOMEPAGE_BOX_CONFIG.MARKETPLACE.defaultSortOrder,
    },
  ];

  simpleMappings.forEach(({ box, section, fallbackSortOrder }) => {
    if (!box) {
      return;
    }

    plan.push({
      boxId: box.id,
      sortOrder: section?.sortOrder ?? fallbackSortOrder,
      isVisible: section?.isVisible ?? true,
      items:
        section?.pinnedItems.slice(0, 6).map((item, index) => ({
          role: (index === 0 ? 'HERO' : 'LINK') as 'HERO' | 'LINK',
          contentType: item.contentType as HomepageContentType,
          contentId: item.contentId,
          pinnedByUserId: item.pinnedByUserId,
          pinnedAt: item.pinnedAt,
        })) ?? [],
    });
  });

  return plan;
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

function formatRecipeMetadata(recipe: {
  category: { name: string } | null;
  author: { firstName: string; lastName: string };
  totalMinutes: number | null;
  servings: number | null;
}) {
  return [
    recipe.category?.name,
    `${recipe.author.firstName} ${recipe.author.lastName}`.trim(),
    recipe.totalMinutes ? `${recipe.totalMinutes} min` : null,
    recipe.servings ? `${recipe.servings} servings` : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

function formatEventMetadata(event: {
  startDatetime: Date;
  venueLabel: string | null;
  location: {
    name: string | null;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string | null;
  };
  costText: string | null;
}) {
  return [
    event.startDatetime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    formatLocationPrimary(event.location, event.venueLabel),
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

  return [listing.category, formattedPrice, listing.store.name].filter(Boolean).join(' • ');
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
    imageUrl: getArticleUiImageUrl(article.featuredImageUrl) ?? undefined,
    imageDisplayMode: article.featuredImageUrl?.trim() ? 'cover' : undefined,
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

async function getRecipeCandidates(communityId: string, limit: number) {
  const recipes = await db.recipe.findMany({
    where: {
      communityId,
      status: 'PUBLISHED',
    },
    include: {
      author: {
        select: { firstName: true, lastName: true, profilePhotoUrl: true, trustLevel: true },
      },
      category: {
        select: { name: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  return recipes.map<HomepageContentItem>((recipe) => ({
    contentType: 'RECIPE',
    contentId: recipe.id,
    title: recipe.title,
    description: recipe.excerpt ?? undefined,
    imageUrl: getArticleUiImageUrl(recipe.featuredImageUrl) ?? undefined,
    imageDisplayMode: recipe.featuredImageUrl?.trim() ? 'cover' : undefined,
    url: `/recipes/${recipe.id}`,
    metadata: formatRecipeMetadata(recipe),
    author: {
      firstName: recipe.author.firstName,
      lastName: recipe.author.lastName,
      profilePhotoUrl: recipe.author.profilePhotoUrl ?? undefined,
      trustLevel: recipe.author.trustLevel ?? undefined,
    },
    searchText: `${recipe.title} ${recipe.author.lastName}`.toLowerCase(),
  }));
}

async function getEventCandidates(communityId: string, limit: number) {
  const events = await db.event.findMany({
    where: {
      communityId,
      status: EventStatus.PUBLISHED,
      startDatetime: { gte: new Date() },
    },
    include: {
      location: {
        select: {
          name: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
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
    imageDisplayMode: event.photoUrl ? 'cover' : undefined,
    url: `/events/${event.id}`,
    metadata: formatEventMetadata(event),
    searchText: `${event.title} ${event.location.name ?? event.location.city}`.toLowerCase(),
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
    imageDisplayMode: listing.photos[0]?.imageUrl ? 'cover' : undefined,
    url: `/marketplace/${listing.id}`,
    metadata: formatMarketplaceMetadata(listing),
    secondaryUrl: `/marketplace/stores/${listing.storeId}`,
    secondaryLabel: `View ${listing.store.name}`,
    searchText: `${listing.title} ${listing.store.name}`.toLowerCase(),
  }));
}

export async function getHomepageArticleCandidates(communityId: string, limit = 100) {
  return getArticleCandidates(communityId, limit);
}

export async function getHomepageRecipeCandidates(communityId: string, limit = 100) {
  return getRecipeCandidates(communityId, limit);
}

export async function getHomepageEventCandidates(communityId: string, limit = 100) {
  return getEventCandidates(communityId, limit);
}

export async function getHomepageMarketplaceCandidates(communityId: string, limit = 100) {
  return getMarketplaceCandidates(communityId, limit);
}

function getHomepageItemKey(item: Pick<HomepageContentItem, 'contentType' | 'contentId'>) {
  return `${item.contentType}:${item.contentId}`;
}

function mapPinnedItems(
  pinnedItems: Array<{ contentType: HomepageContentType; contentId: string; sortOrder: number }>,
  candidates: HomepageContentItem[]
) {
  const byKey = new Map(
    candidates.map((candidate) => [getHomepageItemKey(candidate), candidate])
  );

  return pinnedItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((pinnedItem) => byKey.get(getHomepageItemKey(pinnedItem)))
    .filter((item): item is HomepageContentItem => Boolean(item));
}

function getCandidatesForBoxType(
  boxType: HomepageBoxType,
  candidatePools: {
    articles: HomepageContentItem[];
    events: HomepageContentItem[];
    recipes: HomepageContentItem[];
    marketplace: HomepageContentItem[];
  }
) {
  switch (boxType) {
    case 'ARTICLES':
      return candidatePools.articles;
    case 'EVENTS':
      return candidatePools.events;
    case 'RECIPES':
      return candidatePools.recipes;
    case 'MARKETPLACE':
      return candidatePools.marketplace;
    case 'MEMORIAM':
      // MEMORIAM renders via RecentlyRemembered — no content candidates needed.
      return [];
  }
}

export async function getHomepageBoxesData(communityId: string): Promise<HomepageBoxData[]> {
  const boxes = await ensureHomepageBoxes(communityId);
  const [articles, events, recipes, marketplace] = await Promise.all([
    getHomepageArticleCandidates(communityId),
    getHomepageEventCandidates(communityId),
    getHomepageRecipeCandidates(communityId),
    getHomepageMarketplaceCandidates(communityId),
  ]);

  const candidatePools = { articles, events, recipes, marketplace };

  return boxes
    .filter((box) => (ALL_KNOWN_BOX_TYPES as readonly string[]).includes(box.boxType))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((box) => {
      const boxType = box.boxType as HomepageBoxType;
      const config = HOMEPAGE_BOX_CONFIG[boxType];
      const candidates = getCandidatesForBoxType(boxType, candidatePools);
      const pinnedItems = mapPinnedItems(
        box.items.map((item) => ({
          contentType: item.contentType as HomepageContentType,
          contentId: item.contentId,
          sortOrder: item.sortOrder,
        })),
        candidates
      );
      const availableItems = candidates.filter(
        (candidate) =>
          !pinnedItems.some((pinnedItem) => getHomepageItemKey(pinnedItem) === getHomepageItemKey(candidate))
      );
      const heroItem = pinnedItems[0] ?? candidates[0] ?? null;
      const linkCandidates =
        pinnedItems.length > 0
          ? pinnedItems.slice(1)
          : candidates.filter((candidate) => getHomepageItemKey(candidate) !== getHomepageItemKey(heroItem ?? candidate));
      const linkItems = linkCandidates.slice(0, box.maxLinks);

      return {
        id: box.id,
        boxType,
        title: config.title,
        description: config.description,
        contentType: config.contentType,
        sortOrder: box.sortOrder,
        isVisible: box.isVisible,
        maxLinks: box.maxLinks,
        heroItem,
        linkItems,
        pinnedItems,
        availableItems,
      };
    });
}
