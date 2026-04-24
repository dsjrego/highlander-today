import { z } from 'zod';

export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'page_exit',
  'engaged_time_ping',
  'scroll_depth_reached',
  'content_impression',
  'content_open',
  'reaction_added',
  'comment_created',
  'share_clicked',
  'copy_link_clicked',
  'message_started_from_content',
  'cta_clicked',
  'search_result_clicked',
  'homepage_slot_clicked',
] as const;

export const ANALYTICS_CONTENT_TYPES = [
  'ARTICLE',
  'EVENT',
  'MARKETPLACE_LISTING',
  'STOREFRONT',
  'HELP_WANTED_POST',
  'ROADMAP_IDEA',
  'STATIC_PAGE',
  'SUPPORT_PAGE',
  'RECIPE',
  'ORGANIZATION',
] as const;

export const CONTENT_REACTION_TYPES = [
  'useful',
  'important',
  'interesting',
  'needs_follow_up',
] as const;

export const ANALYTICS_REFERRER_TYPES = [
  'INTERNAL',
  'DIRECT',
  'SEARCH',
  'EXTERNAL',
  'UNKNOWN',
] as const;

export const AnalyticsClientEventSchema = z.object({
  eventName: z.enum(ANALYTICS_EVENT_NAMES),
  contentType: z.enum(ANALYTICS_CONTENT_TYPES).optional().nullable(),
  contentId: z.string().trim().min(1).max(128).optional().nullable(),
  pageType: z.string().trim().min(1).max(80),
  pagePath: z.string().trim().min(1).max(500),
  referrerUrl: z.string().trim().url().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const AnalyticsEventBatchSchema = z.object({
  events: z.array(AnalyticsClientEventSchema).min(1).max(50),
});

export const ContentReactionBodySchema = z.object({
  contentType: z.enum(ANALYTICS_CONTENT_TYPES),
  contentId: z.string().trim().min(1).max(128),
  reactionType: z.enum(CONTENT_REACTION_TYPES),
});

export const ContentReactionQuerySchema = z.object({
  contentType: z.enum(ANALYTICS_CONTENT_TYPES),
  contentId: z.string().trim().min(1).max(128),
});

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsContentType = (typeof ANALYTICS_CONTENT_TYPES)[number];
export type ContentReactionType = (typeof CONTENT_REACTION_TYPES)[number];
export type AnalyticsReferrerType = (typeof ANALYTICS_REFERRER_TYPES)[number];
export type AnalyticsClientEventInput = z.infer<typeof AnalyticsClientEventSchema>;
