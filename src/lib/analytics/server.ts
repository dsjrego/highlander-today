import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type {
  AnalyticsContentType,
  AnalyticsEventName,
  AnalyticsReferrerType,
  ContentReactionType,
} from '@/lib/analytics/types';

interface CreateAnalyticsEventInput {
  communityId?: string | null;
  siteDomain?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  anonymousVisitorId?: string | null;
  eventName: AnalyticsEventName;
  contentType?: AnalyticsContentType | null;
  contentId?: string | null;
  pageType: string;
  pagePath: string;
  referrerType?: AnalyticsReferrerType | null;
  referrerHost?: string | null;
  occurredAt?: Date;
  metadata?: Record<string, unknown> | null;
}

export function classifyReferrer(
  referrerUrl: string | null | undefined,
  siteDomain: string | null | undefined
): { referrerType: AnalyticsReferrerType; referrerHost: string | null } {
  if (!referrerUrl) {
    return { referrerType: 'DIRECT', referrerHost: null };
  }

  try {
    const url = new URL(referrerUrl);
    const hostname = url.hostname.toLowerCase();
    const siteHost = siteDomain?.toLowerCase() ?? null;

    if (siteHost && hostname === siteHost) {
      return { referrerType: 'INTERNAL', referrerHost: hostname };
    }

    if (
      hostname.includes('google.') ||
      hostname.includes('bing.com') ||
      hostname.includes('duckduckgo.com') ||
      hostname.includes('search.yahoo.com')
    ) {
      return { referrerType: 'SEARCH', referrerHost: hostname };
    }

    return { referrerType: 'EXTERNAL', referrerHost: hostname };
  } catch {
    return { referrerType: 'UNKNOWN', referrerHost: null };
  }
}

export async function createAnalyticsEvent(input: CreateAnalyticsEventInput) {
  try {
    await db.analyticsEvent.create({
      data: {
        communityId: input.communityId ?? null,
        siteDomain: input.siteDomain ?? null,
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? 'server',
        anonymousVisitorId: input.anonymousVisitorId ?? null,
        eventName: input.eventName,
        contentType: input.contentType ?? null,
        contentId: input.contentId ?? null,
        pageType: input.pageType,
        pagePath: input.pagePath,
        referrerType: input.referrerType ?? null,
        referrerHost: input.referrerHost ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error('[analytics] Failed to create analytics event:', error);
  }
}

export async function createReactionAnalyticsEvent(input: {
  communityId?: string | null;
  siteDomain?: string | null;
  userId: string;
  contentType: AnalyticsContentType;
  contentId: string;
  reactionType: ContentReactionType;
  previousReactionType?: ContentReactionType | null;
}) {
  return createAnalyticsEvent({
    communityId: input.communityId,
    siteDomain: input.siteDomain,
    userId: input.userId,
    eventName: 'reaction_added',
    contentType: input.contentType,
    contentId: input.contentId,
    pageType: 'content-detail',
    pagePath: `/${input.contentType.toLowerCase()}/${input.contentId}`,
    metadata: {
      reactionType: input.reactionType,
      previousReactionType: input.previousReactionType ?? null,
    },
  });
}
