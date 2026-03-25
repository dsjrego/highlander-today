# Highlander Today Content Analytics & Reaction Intelligence Plan

## Purpose

Highlander Today needs a site-wide statistics system that does more than count pageviews. The platform should be able to understand:

- what content people actually consume
- what content causes people to return
- what content leads to useful next actions
- how residents react to stories, events, listings, and future institutional content
- which sections, categories, and topics are helping the community versus creating noise

This system should support editorial judgment, product decisions, community-health analysis, and future ranking/recommendation work without turning the platform into an ad-tech surveillance product.

## Why This Matters

The platform is explicitly trying to become local community infrastructure, not just a publishing surface. That means success is not only:

- traffic
- impressions
- raw click volume

It is also:

- whether people find content useful
- whether content leads to messaging, participation, or real-world follow-through
- whether certain categories or authors produce repeat engagement
- whether the site is becoming more useful over time for the founding community

This analytics system should answer questions like:

- Which Local Life categories produce the most real reading, not just clicks?
- Which stories drive comment activity, shares, saves, or follow-up visits?
- Which event pages lead to trusted-user action or later attendance signals?
- Which marketplace/help-wanted pages cause messaging starts?
- Which content formats appear informative versus ignored?
- Are users bouncing because content is weak, because pages are slow, or because discovery/navigation is poor?

## Principles

1. **Community usefulness over vanity metrics:** prioritize signals that reflect value, not shallow traffic inflation.
2. **Privacy by design:** keep user-level data bounded, purposeful, and internally accountable.
3. **First-party only:** build around Highlander Today events and data ownership, not third-party ad tracking.
4. **Cross-content consistency:** the same system should work across articles, events, marketplace listings, help-wanted posts, roadmap ideas, support pages, and future organization pages.
5. **Anonymous where possible, identified where justified:** use anonymous/session analytics for broad usage patterns and user-linked analytics only when the product reason is clear.
6. **Actionable output:** metrics should feed editorial, product, moderation, and roadmap decisions.

## Scope

The system should eventually cover:

- site-wide traffic and engagement
- per-page and per-content-type performance
- reactions and usefulness signals
- funnel/drop-off analysis
- author/category/section performance
- conversion into core platform loops

Initial focus should be on:

- homepage
- Local Life articles
- events
- marketplace listings and storefronts
- Help Wanted posts
- About/support pages

## Core Questions To Measure

### Consumption

- views
- unique visitors
- returning visitors
- traffic source class: internal nav, direct, search, external referral
- time-on-page approximation
- scroll-depth milestones
- read-completion approximation for articles

### Reaction

- explicit reaction clicks
- save/bookmark intent if added
- comments created
- shares/copy-link clicks
- report-content clicks
- negative friction signals such as very fast exits

### Utility

- message-starts from content
- profile/store/organization click-through after content consumption
- event CTA engagement
- submission CTA engagement
- return visits to the same content or category
- follow-on navigation to related local content

### Editorial/Product Health

- performance by category
- performance by author or source
- performance by topic/tag once tags exist
- performance by homepage slot or card position
- performance by publish age
- content decay curves

## Event Taxonomy

All analytics should be built on a shared event taxonomy rather than page-specific one-off logs.

### Base Event Shape

Each event should capture a normalized set of fields:

- `eventName`
- `occurredAt`
- `communityId`
- `siteDomain`
- `userId` nullable
- `sessionId`
- `anonymousVisitorId`
- `contentType` nullable
- `contentId` nullable
- `pageType`
- `pagePath`
- `referrerType`
- `referrerUrl` sanitized/nullable
- `metadata` JSON for event-specific detail

### Phase 1 Event Set

- `page_view`
- `page_exit`
- `engaged_time_ping`
- `scroll_depth_reached`
- `content_impression`
- `content_open`
- `reaction_added`
- `comment_created`
- `share_clicked`
- `copy_link_clicked`
- `message_started_from_content`
- `cta_clicked`
- `search_result_clicked`
- `homepage_slot_clicked`

### Future Event Set

- `bookmark_added`
- `bookmark_removed`
- `event_interest_marked`
- `roadmap_idea_opened`
- `organization_profile_opened`
- `store_contact_revealed`
- `submission_started`
- `submission_completed`

## Reaction Model

The platform should not rush into generic social reactions, but it should support structured response signals that help answer whether content was useful.

Recommended first-generation reaction set:

- `useful`
- `important`
- `interesting`
- `needs-follow-up`

Possible later additions:

- section-specific reactions
- staff-only editorial quality labels
- post-publication review tags such as `evergreen`, `community-alert`, or `service-journalism`

Reactions should be:

- one reaction per user per content item initially
- changeable/removable
- visible internally first
- public only if there is a clear product reason

## Architecture Direction

### 1. Client Event Capture Layer

Create a small shared analytics client utility that can be called from page shells and interactive components. It should:

- assign or reuse a durable anonymous visitor ID
- assign session IDs
- queue lightweight events
- batch and debounce where reasonable
- avoid duplicate fire on hydration/re-render
- gracefully no-op if analytics is disabled

Likely home:

- `src/lib/analytics/`
- `src/components/analytics/`

### 2. Server Ingestion API

Add a first-party ingestion endpoint such as:

- `/api/analytics/events`

Responsibilities:

- validate payloads
- normalize context from middleware/session
- attach trusted server-known fields
- reject malformed or abusive traffic
- batch-write efficiently

### 3. Storage Model

Keep the raw event log separate from aggregated rollups.

Recommended layers:

- raw append-only event table
- daily aggregate tables
- content-performance rollups
- reaction summary tables

This prevents dashboards from querying the raw event stream for routine product questions.

### 4. Aggregation Jobs

Add scheduled jobs to compute:

- daily page metrics
- daily content metrics
- rolling 7/30/90-day summaries
- category and author rollups
- conversion metrics into messaging/comments/repeat visits

### 5. Admin / Editorial Reporting Surface

Eventually expose internal analytics pages for:

- top-performing content
- underperforming content
- category trends
- homepage slot effectiveness
- reaction/usefulness summaries
- conversion to messaging or other action

This should likely live under a future admin analytics surface rather than inside public pages.

## Suggested Data Model Direction

Exact schema can evolve, but a likely starting point is:

- `AnalyticsEvent`
- `AnalyticsSession`
- `ContentReaction`
- `ContentMetricsDaily`
- `CategoryMetricsDaily`
- `AuthorMetricsDaily`
- `HomepageSlotMetricsDaily`

Potential `AnalyticsEvent` fields:

- `id`
- `communityId`
- `siteDomain`
- `userId` nullable
- `sessionId`
- `anonymousVisitorId`
- `eventName`
- `contentType` nullable
- `contentId` nullable
- `pageType`
- `pagePath`
- `referrerType`
- `referrerHost` nullable
- `occurredAt`
- `metadata` JSONB

Potential `ContentReaction` fields:

- `id`
- `communityId`
- `userId`
- `contentType`
- `contentId`
- `reactionType`
- `createdAt`
- `updatedAt`

Potential `ContentMetricsDaily` fields:

- `id`
- `communityId`
- `date`
- `contentType`
- `contentId`
- `views`
- `uniqueVisitors`
- `engagedViews`
- `avgEngagedSeconds`
- `reactionCount`
- `commentCount`
- `shareClicks`
- `messageStarts`
- `returnVisitorViews`

## Content-Type Strategy

The analytics model should treat content types explicitly rather than forcing everything into article-only assumptions.

Recommended initial enum direction:

- `ARTICLE`
- `EVENT`
- `MARKETPLACE_LISTING`
- `STOREFRONT`
- `HELP_WANTED_POST`
- `ROADMAP_IDEA`
- `STATIC_PAGE`
- `SUPPORT_PAGE`

Later additions:

- `ORGANIZATION`
- `DIRECTORY_ENTRY`
- `JOURNAL_ENTRY`

## Privacy & Governance

This system should be useful without drifting into invasive behavior.

Recommended guardrails:

1. Avoid third-party ad pixels or selling analytics data.
2. Avoid storing unnecessary personal data in analytics tables.
3. Keep raw IP addresses out of long-lived analytics storage unless a specific abuse-prevention need exists.
4. Retain raw event data for a bounded period, then keep aggregates longer.
5. Restrict admin analytics access by role.
6. Treat reactions as product/community data, not public social proof by default.
7. Document what is being collected in future privacy/help documentation.

## How This Connects To Core Loops

### Information Loop

Measure article reads, event discovery, homepage navigation, and repeat visits.

### Interaction Loop

Measure comments, profile clicks, and messaging starts from content pages.

### Transaction Loop

Measure listing discovery, storefront exploration, and trusted-user message starts.

### Participation Loop

Measure event detail engagement, category return behavior, and future organization/community activity.

## Rollout Phases

### Phase A — Analytics Foundation

- define event taxonomy
- add anonymous visitor/session identifiers
- create ingestion endpoint
- log `page_view`, `content_open`, `scroll_depth_reached`, and `cta_clicked`
- create raw event table

### Phase B — Content Performance MVP

- add daily rollups
- add article/event/listing/help-wanted performance views
- track message-start conversions from content
- add internal reporting for top content, category performance, and bounce/engagement patterns

### Phase C — Reaction Intelligence MVP

- add first-generation reactions
- store per-user reactions
- aggregate reaction summaries per content item
- surface usefulness-oriented reporting internally

### Phase D — Editorial & Product Decision Support

- add homepage slot attribution
- add author/source/category trend reporting
- add content-decay and repeat-visit analysis
- connect findings to roadmap and editorial planning

## Recommended Milestone Placement

This work should be treated as a dedicated post-launch intelligence milestone, not as superficial analytics garnish. It is foundational for understanding whether the platform is actually becoming useful in the founding community.

Suggested roadmap placement:

- after the completed weighting/reputation foundation
- before or alongside larger expansion lanes like delivery/jobs or payments

Reason:

- the platform already has multiple live loops
- the next major risk is not just missing features, but lack of clarity about what people actually use and value
- better instrumentation should inform the next wave of product investment

## Practical First Build Recommendation

The first implementation should stay intentionally narrow:

1. instrument homepage, Local Life article detail, event detail, marketplace listing detail, storefront detail, and Help Wanted detail
2. capture page views, engaged-time pings, scroll milestones, CTA clicks, share/copy-link clicks, and message-starts
3. add internal-only reaction capture for articles first
4. build one admin report showing content performance by type/category over the last 30 days

That would be enough to produce real decision-grade signal without overbuilding a full analytics platform too early.

## Open Questions

1. Should reactions be article-only first, or cross-content from day one?
2. Should usefulness reactions be visible publicly, staff-only, or author-visible?
3. Should anonymous visitors be allowed to react, or only signed-in users?
4. How long should raw event retention last before downsampling or archival?
5. Should editorial dashboards emphasize section/category performance first, or content-level performance first?
6. Which metrics should count as primary success metrics for launch-community validation?

## Recommendation

Proceed with a first-party, privacy-bounded analytics system centered on content usefulness, reactions, and conversion into Highlander Today’s core interaction loops. Build the foundation once, design it for all content types, and use it to guide product/editorial decisions instead of relying on intuition or raw traffic alone.
