import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { safeAnalyticsPath, sanitizeAnalyticsMetadata } from "./policy";
import type {
  AnalyticsContentType,
  AnalyticsEventName,
  AnalyticsReferrerType,
  ContentReactionType,
} from "@/lib/analytics/types";

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
  metadata?: Record<string, string | number | boolean | null> | null;
  staff?: boolean;
}

export function classifyReferrer(
  referrerUrl: string | null | undefined,
  siteDomain: string | null | undefined,
): { referrerType: AnalyticsReferrerType; referrerHost: string | null } {
  if (!referrerUrl) {
    return { referrerType: "DIRECT", referrerHost: null };
  }

  try {
    const url = new URL(referrerUrl);
    const hostname = url.hostname.toLowerCase();
    const siteHost = siteDomain
      ? new URL(`https://${siteDomain}`).hostname
          .toLowerCase()
          .replace(/^www\./, "")
      : null;

    if (siteHost && hostname.replace(/^www\./, "") === siteHost) {
      return { referrerType: "INTERNAL", referrerHost: hostname };
    }

    if (
      /(^|\.)google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(
        hostname,
      ) ||
      /(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(hostname)
    ) {
      return { referrerType: "SEARCH", referrerHost: hostname };
    }

    return { referrerType: "EXTERNAL", referrerHost: hostname };
  } catch {
    return { referrerType: "UNKNOWN", referrerHost: null };
  }
}

export async function createAnalyticsEvent(input: CreateAnalyticsEventInput) {
  try {
    const pagePath = safeAnalyticsPath(input.pagePath);
    if (!input.communityId || !pagePath) return;
    const enabled = await db.siteSetting.findUnique({
      where: {
        communityId_key: {
          communityId: input.communityId,
          key: "analytics_enabled",
        },
      },
      select: { value: true },
    });
    if (enabled?.value === "false") return;
    await db.analyticsEvent.create({
      data: {
        communityId: input.communityId ?? null,
        siteDomain: input.siteDomain ?? null,
        userId: null,
        sessionId: input.sessionId ?? `server-${crypto.randomUUID()}`,
        anonymousVisitorId: input.anonymousVisitorId ?? null,
        eventName: input.eventName,
        contentType: input.contentType ?? null,
        contentId: input.contentId ?? null,
        pageType: input.pageType,
        pagePath,
        referrerType: input.referrerType ?? null,
        referrerHost: input.referrerHost ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        metadata: {
          ...sanitizeAnalyticsMetadata(input.metadata),
          origin: "server",
          schemaVersion: 2,
          staff: Boolean(input.staff),
        } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[analytics] Failed to create analytics event:", error);
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
  staff?: boolean;
}) {
  return createAnalyticsEvent({
    communityId: input.communityId,
    siteDomain: input.siteDomain,
    userId: input.userId,
    staff: input.staff,
    eventName: "reaction_added",
    contentType: input.contentType,
    contentId: input.contentId,
    pageType: "content-detail",
    pagePath: `/${({ ARTICLE: "local-life", RECIPE: "recipes", EVENT: "events", MARKETPLACE_LISTING: "marketplace", HELP_WANTED_POST: "help-wanted" } as Record<string, string>)[input.contentType] || "community"}/${input.contentId}`,
    metadata: {
      reactionType: input.reactionType,
      previousReactionType: input.previousReactionType ?? null,
    },
  });
}
