import type { AnalyticsContentType, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type SupportedRollupContentType =
  | 'ARTICLE'
  | 'EVENT'
  | 'MARKETPLACE_LISTING'
  | 'HELP_WANTED_POST'
  | 'RECIPE';

type ContentMetricsAccumulator = {
  communityId: string;
  date: Date;
  contentType: SupportedRollupContentType;
  contentId: string;
  categoryLabel: string | null;
  authorUserId: string | null;
  pageViews: number;
  uniqueVisitors: number;
  opens: number;
  engagedPings: number;
  reactions: number;
  comments: number;
  shares: number;
  messageStarts: number;
  uniqueVisitorKeys: Set<string>;
};

type HomepageSlotAccumulator = {
  communityId: string;
  date: Date;
  slotPosition: number;
  boxType: string;
  placement: string;
  contentType: AnalyticsContentType | null;
  contentId: string | null;
  impressions: number;
  clicks: number;
};

const SUPPORTED_TYPES: SupportedRollupContentType[] = [
  'ARTICLE',
  'EVENT',
  'MARKETPLACE_LISTING',
  'HELP_WANTED_POST',
  'RECIPE',
];

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function addDays(input: Date, days: number) {
  return new Date(input.getTime() + days * 24 * 60 * 60 * 1000);
}

function getContentKey(contentType: SupportedRollupContentType, contentId: string) {
  return `${contentType}:${contentId}`;
}

function getSlotKey(input: {
  communityId: string;
  date: Date;
  slotPosition: number;
  boxType: string;
  placement: string;
  contentType: AnalyticsContentType | null;
  contentId: string | null;
}) {
  return [
    input.communityId,
    input.date.toISOString(),
    input.slotPosition,
    input.boxType,
    input.placement,
    input.contentType ?? 'none',
    input.contentId ?? 'none',
  ].join(':');
}

async function resolveContentDescriptorsByType(
  idsByType: Map<SupportedRollupContentType, Set<string>>
) {
  const [articles, events, listings, helpWantedPosts, recipes] = await Promise.all([
    db.article.findMany({
      where: { id: { in: Array.from(idsByType.get('ARTICLE') ?? []) } },
      select: {
        id: true,
        authorUserId: true,
        category: { select: { name: true } },
      },
    }),
    db.event.findMany({
      where: { id: { in: Array.from(idsByType.get('EVENT') ?? []) } },
      select: {
        id: true,
        submittedByUserId: true,
        organization: { select: { name: true } },
      },
    }),
    db.marketplaceListing.findMany({
      where: { id: { in: Array.from(idsByType.get('MARKETPLACE_LISTING') ?? []) } },
      select: {
        id: true,
        authorUserId: true,
        category: true,
      },
    }),
    db.helpWantedPost.findMany({
      where: { id: { in: Array.from(idsByType.get('HELP_WANTED_POST') ?? []) } },
      select: {
        id: true,
        authorUserId: true,
        postingType: true,
      },
    }),
    db.recipe.findMany({
      where: { id: { in: Array.from(idsByType.get('RECIPE') ?? []) } },
      select: {
        id: true,
        authorUserId: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const descriptors = new Map<
    string,
    { categoryLabel: string | null; authorUserId: string | null }
  >();

  for (const article of articles) {
    descriptors.set(getContentKey('ARTICLE', article.id), {
      categoryLabel: article.category?.name ?? 'Uncategorized',
      authorUserId: article.authorUserId,
    });
  }

  for (const event of events) {
    descriptors.set(getContentKey('EVENT', event.id), {
      categoryLabel: event.organization?.name ?? 'General event',
      authorUserId: event.submittedByUserId,
    });
  }

  for (const listing of listings) {
    descriptors.set(getContentKey('MARKETPLACE_LISTING', listing.id), {
      categoryLabel: listing.category,
      authorUserId: listing.authorUserId,
    });
  }

  for (const post of helpWantedPosts) {
    descriptors.set(getContentKey('HELP_WANTED_POST', post.id), {
      categoryLabel: post.postingType,
      authorUserId: post.authorUserId,
    });
  }

  for (const recipe of recipes) {
    descriptors.set(getContentKey('RECIPE', recipe.id), {
      categoryLabel: recipe.category?.name ?? 'Recipes',
      authorUserId: recipe.authorUserId,
    });
  }

  return descriptors;
}

export async function recomputeAnalyticsRollupsForDay(day: Date) {
  const date = startOfUtcDay(day);
  const nextDate = addDays(date, 1);

  const [eventRows, reactionRows] = await Promise.all([
    db.analyticsEvent.findMany({
      where: {
        occurredAt: {
          gte: date,
          lt: nextDate,
        },
      },
      select: {
        communityId: true,
        contentType: true,
        contentId: true,
        eventName: true,
        anonymousVisitorId: true,
        sessionId: true,
        pageType: true,
        metadata: true,
      },
    }),
    db.contentReaction.findMany({
      where: {
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
      select: {
        communityId: true,
        contentType: true,
        contentId: true,
      },
    }),
  ]);

  const idsByType = new Map<SupportedRollupContentType, Set<string>>();
  for (const contentType of SUPPORTED_TYPES) {
    idsByType.set(contentType, new Set());
  }

  const contentMetrics = new Map<string, ContentMetricsAccumulator>();
  const homepageSlots = new Map<string, HomepageSlotAccumulator>();

  for (const row of eventRows) {
    if (row.communityId && row.contentType && row.contentId && SUPPORTED_TYPES.includes(row.contentType as SupportedRollupContentType)) {
      const contentType = row.contentType as SupportedRollupContentType;
      idsByType.get(contentType)?.add(row.contentId);

      const key = getContentKey(contentType, row.contentId);
      const existing = contentMetrics.get(key) ?? {
        communityId: row.communityId,
        date,
        contentType,
        contentId: row.contentId,
        categoryLabel: null,
        authorUserId: null,
        pageViews: 0,
        uniqueVisitors: 0,
        opens: 0,
        engagedPings: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        messageStarts: 0,
        uniqueVisitorKeys: new Set<string>(),
      };

      switch (row.eventName) {
        case 'page_view':
          existing.pageViews += 1;
          break;
        case 'content_open':
          existing.opens += 1;
          break;
        case 'engaged_time_ping':
          existing.engagedPings += 1;
          break;
        case 'share_clicked':
        case 'copy_link_clicked':
        case 'homepage_slot_clicked':
          existing.shares += 1;
          break;
        case 'comment_created':
          existing.comments += 1;
          break;
        case 'message_started_from_content':
          existing.messageStarts += 1;
          break;
      }

      const uniqueVisitorKey = row.anonymousVisitorId ?? row.sessionId ?? null;
      if (uniqueVisitorKey) {
        existing.uniqueVisitorKeys.add(uniqueVisitorKey);
      }

      contentMetrics.set(key, existing);
    }

    if (row.communityId && row.pageType === 'homepage' && row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)) {
      const metadata = row.metadata as Prisma.JsonObject;
      const slotPosition = typeof metadata.slot === 'number' ? metadata.slot : null;
      const boxType = typeof metadata.boxType === 'string' ? metadata.boxType : null;
      const placement = typeof metadata.placement === 'string' ? metadata.placement : null;

      if (slotPosition && boxType && placement) {
        const accumulator: HomepageSlotAccumulator = {
          communityId: row.communityId,
          date,
          slotPosition,
          boxType,
          placement,
          contentType: row.contentType ?? null,
          contentId: row.contentId ?? null,
          impressions: 0,
          clicks: 0,
        };

        const slotKey = getSlotKey(accumulator);
        const existing = homepageSlots.get(slotKey) ?? accumulator;

        if (row.eventName === 'content_impression') {
          existing.impressions += 1;
        }

        if (row.eventName === 'homepage_slot_clicked') {
          existing.clicks += 1;
        }

        homepageSlots.set(slotKey, existing);
      }
    }
  }

  for (const row of reactionRows) {
    if (!row.communityId || !row.contentType || !row.contentId || !SUPPORTED_TYPES.includes(row.contentType as SupportedRollupContentType)) {
      continue;
    }

    const contentType = row.contentType as SupportedRollupContentType;
    idsByType.get(contentType)?.add(row.contentId);

    const key = getContentKey(contentType, row.contentId);
    const existing = contentMetrics.get(key) ?? {
      communityId: row.communityId,
      date,
      contentType,
      contentId: row.contentId,
      categoryLabel: null,
      authorUserId: null,
      pageViews: 0,
      uniqueVisitors: 0,
      opens: 0,
      engagedPings: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      messageStarts: 0,
      uniqueVisitorKeys: new Set<string>(),
    };
    existing.reactions += 1;
    contentMetrics.set(key, existing);
  }

  const descriptors = await resolveContentDescriptorsByType(idsByType);

  for (const [key, row] of contentMetrics.entries()) {
    const descriptor = descriptors.get(key);
    row.categoryLabel = descriptor?.categoryLabel ?? null;
    row.authorUserId = descriptor?.authorUserId ?? null;
    row.uniqueVisitors = row.uniqueVisitorKeys.size;
  }

  const categoryMetrics = new Map<
    string,
    Omit<ContentMetricsAccumulator, 'contentId' | 'authorUserId' | 'uniqueVisitorKeys'> & {
      categoryLabel: string;
    }
  >();

  for (const row of contentMetrics.values()) {
    const categoryLabel = row.categoryLabel ?? 'Uncategorized';
    const key = [row.communityId, row.contentType, categoryLabel].join(':');
    const existing = categoryMetrics.get(key) ?? {
      communityId: row.communityId,
      date,
      contentType: row.contentType,
      categoryLabel,
      pageViews: 0,
      uniqueVisitors: 0,
      opens: 0,
      engagedPings: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      messageStarts: 0,
    };

    existing.pageViews += row.pageViews;
    existing.uniqueVisitors += row.uniqueVisitors;
    existing.opens += row.opens;
    existing.engagedPings += row.engagedPings;
    existing.reactions += row.reactions;
    existing.comments += row.comments;
    existing.shares += row.shares;
    existing.messageStarts += row.messageStarts;
    categoryMetrics.set(key, existing);
  }

  await db.$transaction([
    db.contentMetricsDaily.deleteMany({ where: { date } }),
    db.categoryMetricsDaily.deleteMany({ where: { date } }),
    db.homepageSlotMetricsDaily.deleteMany({ where: { date } }),
    ...(contentMetrics.size > 0
      ? [
          db.contentMetricsDaily.createMany({
            data: Array.from(contentMetrics.values()).map((row) => ({
              communityId: row.communityId,
              date,
              contentType: row.contentType,
              contentId: row.contentId,
              categoryLabel: row.categoryLabel,
              authorUserId: row.authorUserId,
              pageViews: row.pageViews,
              uniqueVisitors: row.uniqueVisitors,
              opens: row.opens,
              engagedPings: row.engagedPings,
              reactions: row.reactions,
              comments: row.comments,
              shares: row.shares,
              messageStarts: row.messageStarts,
            })),
          }),
        ]
      : []),
    ...(categoryMetrics.size > 0
      ? [
          db.categoryMetricsDaily.createMany({
            data: Array.from(categoryMetrics.values()).map((row) => ({
              communityId: row.communityId,
              date,
              contentType: row.contentType,
              categoryLabel: row.categoryLabel,
              pageViews: row.pageViews,
              uniqueVisitors: row.uniqueVisitors,
              opens: row.opens,
              engagedPings: row.engagedPings,
              reactions: row.reactions,
              comments: row.comments,
              shares: row.shares,
              messageStarts: row.messageStarts,
            })),
          }),
        ]
      : []),
    ...(homepageSlots.size > 0
      ? [
          db.homepageSlotMetricsDaily.createMany({
            data: Array.from(homepageSlots.values()).map((row) => ({
              communityId: row.communityId,
              date,
              slotPosition: row.slotPosition,
              boxType: row.boxType,
              placement: row.placement,
              contentType: row.contentType,
              contentId: row.contentId,
              impressions: row.impressions,
              clicks: row.clicks,
            })),
          }),
        ]
      : []),
  ]);

  return {
    date,
    contentRows: contentMetrics.size,
    categoryRows: categoryMetrics.size,
    homepageSlotRows: homepageSlots.size,
  };
}

export async function recomputeAnalyticsRollupsForRange(start: Date, endInclusive: Date) {
  const results = [];
  let cursor = startOfUtcDay(start);
  const last = startOfUtcDay(endInclusive);

  while (cursor <= last) {
    results.push(await recomputeAnalyticsRollupsForDay(cursor));
    cursor = addDays(cursor, 1);
  }

  return results;
}
