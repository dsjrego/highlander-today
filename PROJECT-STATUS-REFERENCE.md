# Highlander Today — Project Status Reference

> Companion to `PROJECT-STATUS.md`.
> This file preserves the fuller implementation ledger, rollout history, verification notes, deployment/bootstrap runbook, upload snapshot, and infrastructure rationale.

> **Last updated:** 2026-04-08 (session 130 — documented full recurring-event schedule regeneration semantics plus recurrence-helper test coverage)
> **Purpose:** Detailed companion context for AI assistants. Read `PROJECT-STATUS.md` first each session, then use this file for the fuller historical/reference detail when needed.

> **Open polish note:** the live `/profile/[id]` header still needs one more pass on avatar click-target density. The pill/ovoid button boundary around the clickable page-header avatar was reduced, and the profile header has page-specific tighter spacing overrides now, but the user still considers the space around the avatar/content too loose; next pass should make the clickable avatar boundary hug the image even more tightly and continue compressing that profile-header layout specifically rather than broadening the shared default further.
>
> **Open mobile masthead note:** the live phone masthead received another compact layout pass. Search/messages/account actions are tighter and the `Highlander Today` title/logo row now aligns more cleanly, but it should still get a real-device visual check before being considered fully closed.
>
> **Open mobile page-header note:** the shared `InternalPageHeader` now has explicit mobile alignment/compactness controls and the `Directory` route is using that cleaner component path. Treat this as materially improved rather than still blocked, but keep a short browser/device QA pass on the list before declaring the mobile header system complete.

> **Session 110 reference note:** organization inbox / CRM direction is now documented in `ORGANIZATION-INBOX-CRM-PLAN.md`. The current recommendation is to build a second communication domain rather than extend the person-to-person DM tables: durable `OrganizationMailbox` roles, org-scoped `OrganizationContactProfile` history, dedicated inbox threads/messages/internal notes, assignment, and future compatibility with billing/payment records that should later attach to the same org-scoped contact profile rather than being modeled as freeform messages.
>
> **Session 111 reference note:** directory interaction rules were tightened. The default people view now stays empty until a search is entered; top-level `Businesses`, `Government`, and `Organizations` pills load full current-tenant results alphabetically without requiring a text search; the pill label now navigates while the chevron opens subtype menus; the old detail column was removed; the contact header now reads `Phone`; people-row messaging is trust-gated so only trusted-capable viewers reach the compose flow; and `/directory` now shows a persistent viewer-state banner for auth/trust/directory-inclusion guidance. Self-serve organization listing prompts remain intentionally deferred until the product has a real submit-or-claim loop for ordinary users.
>
> **Session 112 reference note:** the directory viewer-state banner was moved above the search form so account/trust/listing guidance appears before interaction instead of after the category pills. The trusted-user banner copy was also tightened so the sentence-ending `profile settings.` text is the link rather than a separate CTA line.
>
> **Session 115 reference note:** the `/directory` presentation was tightened substantially after the first live pass felt too pill-heavy and padded. The oversized standalone search button was removed in favor of an inline magnifying-glass submit inside the search field, the nested search shell treatment was flattened, redundant empty-state helper copy and the separate compressed sort menu were removed, `Businesses` and `Organizations` were normalized to the same visual treatment as the other filter tabs, and desktop sorting now routes through clickable `Name`, `Section`, and `Type` headings on the result list itself instead of a separate control cluster.
>
> **Session 116 reference note:** a second `/directory` polish pass removed the remaining bulky helper chrome. The page-header description line was removed so the route now presents only the `Directory` title, the three viewer-state messages were normalized to the same plain-text pattern without tinted background containers, and the old `About N results` line above the returned list was deleted so only the actual results, heading-based sort controls, and necessary no-results messaging remain visible.
>
> **Session 117 reference note:** the shared public shell received a mobile-specific navigation pass. On phones, `BannerActions` now renders search and messages as icon-only actions, the user/account trigger is a literal hamburger menu in the upper-right, and the old wrapped `NavigationBar` pill rows are hidden in favor of a vertical mobile menu inside the hamburger that reads the same DB-driven category structure and exposes expandable child groups. Several follow-up tweaks were attempted around mobile masthead spacing/title alignment and `InternalPageHeader` centering/compactness, but those issues remain unresolved enough that they are now explicitly tracked as known follow-up polish rather than considered finished.
>
> **Session 122 reference note:** trusted-user defaults and profile/admin moderation controls were tightened without any schema changes. Both trust-promotion paths (`/api/users/[id]/vouch` and `src/lib/trust.ts`) plus trust reinstatement to `TRUSTED` now automatically set `users.isDirectoryListed = true`, while existing production rows can be aligned with `UPDATE users SET "isDirectoryListed" = true WHERE "trustLevel" = 'TRUSTED' AND "isDirectoryListed" = false;`. `/api/profile` now accepts `?userId=...` for `SUPER_ADMIN` on both read and update, allowing super admins to open the `Account Settings` tab on any `/profile/[id]` route and edit even identity-locked fields; the lower-panel account actions (`Change Password`, `Email Preferences`, `Deactivate Account`) remain visible only to the owner or a super admin. `/admin/users` now accepts a `directory` query param (`listed` / `unlisted`) and exposes that through a new `Directory` filter with a `No directory` option. The public `/organizations/[slug]` page header was also simplified again so it shows only the icon and organization name; the organization group/type badges remain in the hero body, and organization descriptions continue to render as sanitized TipTap HTML with preserved safe text-alignment styling.
>
> **Session 127 reference note:** the admin organization-detail forms interface received a focused compaction pass after the first live rollout felt too verbose. The top-level forms subtabs now read `List` and `+ Form`; expanded form records now use `Details`, `Questions`, `Results`, and `+ Question`; question records are shown as one-row list entries with inline expansion rather than always-open stacked editors; and the managed-form header no longer repeats the share URL or link-visibility metadata when a `Copy URL` action already exists. The row-level public-link action is now icon-only, and the form title row styling was flattened so it aligns visually with the rest of the compact admin list.
>
> **Session 128 reference note:** the event model now has a first concrete recurrence layer that still preserves the one-day-per-event structure. Prisma includes `EventSeries`, event creation can generate weekly, monthly-on-date, and monthly-on-weekday occurrences as separate `Event` rows, and event detail/admin surfaces now show session position plus linked series sessions. Event creation is now intentionally organization-backed rather than person-only: `submittedByUserId` still records who performed the action, but public/admin event creation now requires `organizationId`; `/events/submit` and `/admin/events` use search-first organization selectors; and the public event submit flow can create a `PENDING_APPROVAL` organization inline and still submit a pending event attached to it.
>
> **Session 129 reference note:** recurring-event management now has a first scoped admin loop instead of creation-only behavior. `/api/events/[id]` accepts `SINGLE`, `FUTURE`, and `SERIES` scope handling for recurring event updates/deletes; `/admin/events/[id]` now includes an inline editor for those scopes; and the event-series helper layer now recalculates session positions/counts so remaining occurrences stay accurate after scoped edits or removals. Current intentional limit: series-wide schedule/cadence regeneration is still deferred, so date/time changes remain single-occurrence only. This same session also tightened the public mobile shell and homepage polish: `InternalPageHeader` gained explicit mobile alignment/compactness props, the phone masthead action row was compacted again, homepage `Coming Soon` cards now use full mobile width, and autogenerated article fallback hero art on homepage feature cards now renders in a contained/centered mode so the generated `Highlander Today` branding is fully visible on narrow screens instead of being clipped.
>
> **Session 130 reference note:** recurring-event editing now covers the missing schedule-regeneration semantics. `/admin/events/[id]` can now submit changed start/end dates, times, and cadence for scoped recurring edits; `/api/events/[id]` regenerates the affected occurrences from the edited anchor using the existing weekly / monthly-on-date / monthly-on-weekday recurrence model; `SERIES` scope rewrites the current series in place; and `FUTURE` scope intentionally forks the selected occurrence plus later sessions into a new `EventSeries` so historical earlier sessions keep their original recurrence history. The recurring helper test suite in `tests/unit/event-series.test.ts` was expanded in parallel to cover regenerated weekly and monthly-weekday occurrence patterns plus the rebuilt summary text. One practical note from that test pass: recurrence generation preserves local wall-clock time, so raw UTC timestamps can shift across DST boundaries even when the intended local session time stays constant.

## Overview

Highlander Today is a multi-tenant community platform anchored in **Cambria Heights**: the boroughs and townships in the Cambria Heights School District area of **Cambria County, Pennsylvania**. It combines local content, events, a store-based market/ecommerce surface, help wanted, a reusable delivery/job marketplace direction, and private messaging with a trust-based membership model. Members vouch for new members; trust revocation cascades via BFS.

The long-term vision is community infrastructure that behaves more like a communication utility than a conventional commercial product. Each community gets its own locally rooted space, but communities connect to one another, so local never means isolated. Cambria Heights is the proving ground: get it right here first, then expand.

Full spec: `highlander-today-spec.md` (~1143 lines).

Key concepts:
- Trust levels: `ANONYMOUS -> REGISTERED -> TRUSTED -> SUSPENDED`
- Roles: `Reader -> Contributor -> Staff Writer -> Editor -> Admin -> Super Admin`
- Identity lock: entering DOB and then being vouched permanently locks name + DOB
- Badge colors: red = untrusted, orange = suspended
- Multi-tenancy is by domain/slug
- Brand colors: Primary `#46A8CC`, Accent `#A51E30`

Supporting planning docs:
- `ADMIN-CONTENT-REFERENCE-PLAN.md` — internal admin documentation/reference system plan covering content-model definitions, `Local Life` versus `Community` framing, category-to-model guidance, and the recommended read-only admin reference page
- `ARTICLE-SOURCING-PLAN.md` — lightweight Wikipedia-inspired sourcing/citations direction for Local Life articles, emphasizing structured source lists and accountable reporting without forcing a heavyweight editorial workflow
- `ARTICLE-LICENSING-MARKETPLACE-PLAN.md` — future-facing editorial licensing marketplace concept where accountable local authors can license approved stories to organizations for republication under defined terms; explicitly document-first and not a current build priority
- `COMMUNITY-SECTION-PLAN.md` — new `Community` top-level nav section containing `History` (local history articles and community memory), `Moving To` (information for prospective and new residents), and `Memoriam` (death notices and memorial pages); includes homepage presence direction, connections to Verified Local Memory, and relationship to real estate and welcome packages
- `CONTENT-ANALYTICS-PLAN.md` — first-party site/content analytics plan covering purpose, event taxonomy, reaction/usefulness signals, architecture direction, privacy guardrails, and phased rollout for understanding what content people use and value
- `DONATIONS-TRANSPARENCY-PLAN.md` — donations/transparency plan, provider recommendation, data model, rollout phases, launch recommendation
- `DIRECTORY-PLAN.md` — directory model for people and organizations, trusted-only messaging, opt-in listing rules, organization roster visibility, recommended `Organization` / `OrganizationMembership` direction, and the now-partially-implemented public/admin directory foundation
- `DESIGN-SYSTEM-ARCHITECTURE.md` — shared UI terminology, page/section/card hierarchy, component-vs-theme separation, and tenant-aware theming direction
- `ORGANIZATION-INBOX-CRM-PLAN.md` — separate organization inbox / CRM direction with role-based mailboxes, org-scoped contact history, assignment, internal notes, and future billing/payment compatibility
- `LOCAL-CREATOR-NETWORK-PLAN.md` — local creator/shows network direction focused on structured discovery, audience measurement, creator monetization, external-host-first media strategy, and future connected-TV distribution rather than social-video imitation
- `OBITUARIES-PLAN.md` — obituary and memorial direction covering the split between factual death notices and richer memorial pages, plus verification, steward control, moderation, provenance, and anti-abuse guardrails; public section is `Memoriam` under the `Community` nav dropdown
- `MONETIZATION-PLAN.md` — two-tier monetization direction (home community free, tenant communities paid), disruption thesis against extractive internet platforms, value-added revenue mechanisms (memorial media hosting, premium store presence, auto-generated print/distribution materials, event promotion, real estate services, organization pages), legal notice positioning, and sequencing guidance
- `QUALIFIED-INTEREST-MARKETPLACE-PLAN.md` — buyer-initiated offer/lead marketplace where residents control access to their attention, businesses pay for qualified engagement, compensation flows mainly to the resident, and the platform acts as accountable market infrastructure rather than an ad surface

## Product Philosophy

This is local community communication and coordination infrastructure intended to replace fragmented local newspapers, Facebook groups, classifieds, and informal word of mouth. It should become the default place a resident checks to answer:

- what is happening locally
- where can I get something
- who can help me
- how can I participate

It should feel like an extension of the community itself, not an external service layered on top of town life.

## Core Principles

1. **Local First:** prioritize local relevance over cross-community features.
2. **Identity and Accountability:** users are real, vouched-for people with persistent identity.
3. **Activity Over Features:** success is measured by real interaction, not feature count.
4. **Daily Usefulness:** content, events, and visible activity must create return behavior.
5. **Complete Interaction Loops:** finish end-to-end loops instead of half-building many systems.
6. **Community Value Creation:** the platform should create durable value for the community and behave like shared infrastructure, not an extractive service.

## Primary User Loops

1. **Information Loop:** user checks platform -> sees local content/events -> gains awareness -> returns later
2. **Interaction Loop:** user discovers content/listing -> comments or messages -> gets response -> continues engagement
3. **Transaction Loop:** user creates listing -> listing is discovered -> trusted user initiates contact -> agreement is reached -> listing is marked complete
4. **Participation Loop:** user joins local event/activity -> sees related platform activity -> engages with others -> builds recognition and trust

No new major feature should be introduced unless it clearly strengthens at least one of these loops.

## Launch Strategy Constraints

1. Add a new community only after the current one shows repeat engagement and successful interaction loops.
2. Visible real activity is required before broader promotion.
3. Seed with real, identifiable local users rather than synthetic or anonymous content.
4. Early success depends on strong local identity, not network effects.
5. Features may be built before public rollout; hidden or gated exposure is acceptable until momentum justifies wider UI exposure.

## Trust System Intent

The trust system exists to ensure users are real and accountable, let reputation accumulate over time, and reduce spam, fraud, and low-quality interaction. Trust is foundational but not sufficient on its own; it must be reinforced by visible activity, repeated interaction, and local recognition.

## Non Goals (Early Stages)

- Full ecommerce with payments, shipping, and inventory management
- Maximizing listing volume at the expense of quality and interaction
- Expanding to multiple communities before validating engagement in the first
- Competing directly on scale with large platforms

The focus is depth in one community before breadth.

## Tech Stack

Next.js 14 (App Router) + TypeScript, PostgreSQL 16 (Docker on port **5433**), Prisma ORM, NextAuth.js v4 (CredentialsProvider + GoogleProvider + JWT, **no PrismaAdapter**), Tailwind CSS + `@tailwindcss/typography`, TipTap, `isomorphic-dompurify`, Cloudflare R2, Sharp, PostgreSQL `tsvector` search, Jest + RTL, D3.js.

## Local Dev Setup

```bash
docker-compose up -d && npm run db:push && npx prisma db seed && npm run dev
```

### `.env`

```bash
DATABASE_URL=postgresql://<db-user>:<db-password>@127.0.0.1:5433/highlander_today?connect_timeout=10&sslmode=disable
NEXTAUTH_SECRET="<set-in-.env>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<your-google-client-id>"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
FACEBOOK_CLIENT_ID="<your-facebook-app-id>"
FACEBOOK_CLIENT_SECRET="<your-facebook-app-secret>"
```

### Seed Data

`prisma/seed.ts` creates community `Highlander Today` (slug `highlander-today`), 4 homepage sections, and default site settings. Create the initial Super Admin explicitly with:

```bash
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

Important seed note: `seed.ts` now creates the active `Local Life` taxonomy used by the live app, including `local-stores`, `people`, `recipes-food`, `outdoors-tips`, `arts-creativity`, `history-heritage`, `guides`, and `opinion-commentary`. The database is now the source of truth for Local Life category reads; UI surfaces should fetch categories dynamically from `/api/categories` or the shared cached category service rather than hardcoding labels/slugs.

## Site Sections & Navigation

- **Local Life** (`/local-life`): article listing, detail, submit, and drafts are live. The shared navbar dropdown, the `/local-life` pill row, and the article submit category field now read from the DB-backed Local Life category tree via the cached `/api/categories?parent=local-life` flow rather than a hardcoded nav list. Current intended options/order are `Local Stores` (direct link override to `/marketplace/stores`), `Our People`, `Recipes & Food`, `Gardening & Nature`, `Arts & Music`, `History & Heritage`, `Guides & How-Tos`, and `Opinion`, backed by category slugs `local-stores`, `people`, `recipes-food`, `outdoors-tips`, `arts-creativity`, `history-heritage`, `guides`, and `opinion-commentary`. The `/local-life` pill row no longer shows `All`, uses the darker transparent/cyan treatment instead of the older light-gray pills, and filters article results by specific category slug when a content pill is selected. The submit page now uses the standardized `FormCard` layout, places the hero image maintenance card on the left and the article fields on the right, uses shared button/action styling consistent with `/profile/edit`, and includes a `Writing` / `Article Preview` toggle so authors can see an approximate reader-facing Local Life article layout before saving or submitting. That preview uses the shared `src/components/articles/ArticlePreview.tsx` surface, which is also now used in the admin approval queue so editors review articles in a fuller publication-style layout instead of only a raw HTML block. Hero-image captions are now supported end-to-end as an optional article field: authors can enter a caption/credit under the upload on `/local-life/submit`, the preview/admin review surfaces render it beneath the image, and the public article detail page now shows the caption under the hero image when present.
- **Experiences** (`/experiences`): `events`, `outdoor-recreation`, `sports-activities`, `classes-workshops`, `tours-attractions`, `rentals-getaways`, `entertainment-nightlife`, `seasonal`. The landing page now uses the active `Youth Local` shell with the shared compact section header, modern filter pills, category cards, and a bridge to the live `/events` experience surface. Non-event experience categories remain directional placeholders rather than DB-backed content.
- **About**: top-level nav dropdown separate from Local Life and Experiences. Public subpages are `Mission` and `Blog` (the current route remains `/about/journal`); `/about/roadmap` now exists but is restricted to `SUPER_ADMIN`. Mission copy uses a warm first-person-plural voice grounded in Cambria Heights and the highlands of Cambria County, positioning the platform as community infrastructure and expansion as “get it right here first.”

Nav:
- `Home`
- DB-backed top-level categories from `Category` rows with `parentCategoryId = null`
- Any top-level category with children renders as a dropdown; categories without children render as plain nav pills
- `Community` can now exist structurally in the navbar if created in categories admin, but the public `/community` route is still planned rather than fully built. See `COMMUNITY-SECTION-PLAN.md`.

Subcategory links use `?category=slug` query params matching `Category.slug`, with route overrides such as `local-stores -> /marketplace/stores` and `events -> /events`. `NavigationBar` now reads the full top-level category tree from the DB-backed categories API instead of using a partially hardcoded section list; `Home` remains the only fixed public nav pill. The earlier Super Admin-only `Support` and `Arcade` top-nav items were removed from the public navbar. Legacy `/articles` still exists for backward compatibility.

## Project Structure

```text
prisma/
  schema.prisma          # 25+ models
  seed.ts                # Structural seed: community, categories, homepage, site settings
src/app/
  api/                   # 40+ API route files (real Prisma queries + auth)
  admin/                 # 10+ admin pages
  (auth)/                # login, register, complete-trust
  articles/              # legacy route family
  local-life/            # listing, submit, drafts, [id] detail
  experiences/           # refreshed landing page, category focus surface, bridges into /events
  events/                # list, submit
  marketplace/           # list, create, stores, [id] detail
  help-wanted/           # list, detail, submit, manage, edit
  roadmap/               # internal roadmap surfaces; now Super Admin only via middleware gate
  arcade/                # placeholder (Super Admin only)
  messages/              # list, conversation detail
  search/                # search page
  profile/               # view, edit, vouch controls, profile actions
  layout.tsx             # root layout: masthead, NavigationBar, footer
  page.tsx               # homepage
src/components/
  admin/                 # UserTable, AuditLogTable, ApprovalQueue, etc.
  articles/              # ArticleCard, ArticleEditor, CommentThread
  events/                # EventCard, EventForm, CalendarView
  layout/                # NavigationBar (active), BannerActions (active), Navigation.tsx/Footer.tsx (unused)
  marketplace/           # ListingCard, ListingForm
  messaging/             # ConversationList, MessageThread
  shared/                # Pagination, ImageUploader, SearchBar, DOBEntryModal
  trust/                 # TrustBadge, VouchButton, VouchConfirmModal, VouchingGraph
  Providers.tsx          # SessionProvider wrapper
src/lib/
  db.ts                  # Prisma singleton, named export { db }
  auth.ts                # inactive helper, not live NextAuth config
  permissions.ts         # role matrix + checkPermission shim + DELETE_USER action
  trust.ts               # vouching chain logic, BFS cascade
  audit.ts, login-events.ts, activity-log.ts, upload.ts, search.ts, homepage.ts, community.ts, tenant.ts, constants.ts
```

## Current Status

### Product Direction

- The product is meant to become trusted local coordination infrastructure for underserved communities and businesses, not an undifferentiated merger of Amazon, DoorDash, Shopify, Craigslist, and social media.
- Strategically, it is closer to what a serious local newspaper or civic business hub should have become online: local content, trust, discovery, commerce, and eventually fulfillment.
- The moat is community identity, trust, moderation, and local discoverability, not listings alone.
- The main execution risk is scope explosion plus stale scaffold code. Prioritize complete user loops over horizontal feature spread.
- The founding community is both the first operating focus and the long-term home base.
- Additional communities may be added later, but expansion should reinforce the home community rather than dilute it.
- The platform should be treated as local digital infrastructure: a daily-use utility for residents, organizations, and businesses.
- Broad adoption in the first community matters both for validation and for creating durable local value and possible employment.
- Expansion claims are only credible after visible local adoption and repeat interaction loops are proven in Cambria Heights.
- Help Wanted should function as a trusted local opportunity board for jobs, service requests, and short-term gigs/tasks, with all interaction staying inside the trust + messaging system.
- If donations or service revenue are introduced, public aggregate funding/expenditure reporting should make the platform legible as accountable local infrastructure.
- Proposed public fund buckets are `Community Support`, `Growth Fund`, and `Team Support`, with allocations driven by policy records rather than hardcoded copy.
- Stripe is the current recommended donations provider. Givebutter is the closest speed-first fallback. GoFundMe is not the preferred foundation.
- Donations are strategically useful but not a launch requirement; introduce fundraising only after the home community sees real value, visible activity, and at least a basic transparency surface.
- The public `About` area is live with `Mission`, `Roadmap`, and `Blog` as the visible nav label for `/about/journal`. Mission copy now uses a warm first-person-plural voice rooted in Cambria Heights and the highlands of Cambria County.
- Public messaging explicitly frames the product as infrastructure: technology that works more like a utility than a slot machine.
- Multi-tenancy is a public part of the vision now. Each community gets its own space, but communities can connect; local never means isolated.
- The static `About` section is complete. Remaining follow-up is richer Journal/history structure and future public-facing institutional pages such as `Transparency`; a Super Admin-only placeholder `Support` section now exists in the navbar.

### Working

- **Core platform:** auth, seeded DB, Prisma models, permissions/trust/audit libraries, and main APIs are live.
- **Profile:** `/api/profile` and `/api/users/[id]` are live. Edit supports first/last name, DOB, bio, and profile photo. Identity-locked users cannot change name or DOB. The live `/profile/edit` page now uses the lighter auth-card treatment instead of the older dark card shell: `InternalPageHeader` supports optional description copy, optional left-side icon/avatar, and reusable header action buttons; the edit card mirrors the login email-card styling; the form is a two-column desktop layout with the profile-photo editor on the left and fields/actions on the right; locked fields use inline forbidden icons plus hover tooltips instead of repeated helper text. The public/owner `/profile/[id]` page is now a tabbed surface with `About`, `Marketplace`, `Experiences`, `Local Life`, `Help Wanted`, and owner-only `Account Settings`. `Edit Profile` is now a header action visible only to the owner, `Report User` is a header action for non-owners, and the About tab currently focuses on DOB/trust guidance plus the bio rather than repeating identity metadata already visible in the header. The four content tabs use the same layout pattern: non-owners see a single full-width public-facing content card showing the profile owner’s items, while owners now see only a single full-width management-oriented card for each tab rather than a separate public card plus management card. The earlier large count/counter blocks and the separate `Recent Activity` tab were removed; the current live direction favors the dedicated content tabs over aggregate activity summaries. Help Wanted entries on the profile use real `helpWantedPosts` data.
- **Trust flow:** public profile vouching and admin trust actions are live. Vouching requires DOB, promotes `REGISTERED -> TRUSTED`, sets `isIdentityLocked`, and writes trust audit entries. The profile header now exposes a `Vouch` action for trusted viewers looking at `REGISTERED` users. If the target user has not entered DOB, the voucher gets an in-app dialog instead of a JavaScript confirm, and the target user is sent an internal system-generated message explaining that someone tried to vouch for them but could not until DOB is added.
- **Help Us Grow trust bootstrap:** the first in-product trust-bootstrap loop is now live at `/help-us-grow`. Access is restricted to trusted-capable users (`TRUSTED` plus elevated roles like `CONTRIBUTOR`, `STAFF_WRITER`, `EDITOR`, `ADMIN`, and `SUPER_ADMIN`) via shared `src/lib/trust-access.ts`. The page resolves the active community, lists same-community `REGISTERED` users alphabetically with join dates, and uses the same row-level `Message` action pattern as `/directory` so trusted members can initiate or reuse a conversation before vouching. The current copy explicitly tells members to verify identity rather than rely only on matching names.
- **Messaging:** `/api/messages` and `/api/messages/[conversationId]` use the current schema (`ConversationParticipant`, `Message.body`, `senderUserId`, `lastReadAt`). Inbox/thread pages use real data, profile pages can open/reuse threads, the banner `Messages` pill shows unread count, and blocked pairs cannot create or continue conversations. `BannerActions.tsx` now only starts unread-count polling when the session is authenticated and `session.user.id` is present, which avoids repeated local/dev 401 noise when the client-side session state is out of sync with middleware token decoding.
- **Messaging trust escalation:** message-thread headers now expose `Vouch` when the other participant is still `REGISTERED`. The thread API now returns the participant DOB-presence flag needed for the existing confirm/missing-DOB dialog flow, so a trusted member can verify identity in conversation and complete the vouch without leaving Messages.
- **Blocking:** `UserBlock` is enforced across profile and messaging flows. `/api/users/[id]/block` supports lookup and block/unblock; actions are activity-logged.
- **Articles / Local Life:** listing, submit, drafts, detail, category filtering, moderation, and approval are wired to real data. Canonical route family is `/local-life/*`; `/articles/*` only redirects. The Local Life page-header CTA now uses a shared `ArticleCreateAction` component: anonymous users do not see it, signed-in `REGISTERED` users see it but get an in-app trusted-user requirement dialog when they click, and `TRUSTED` / staff / editor / admin / super-admin users go straight to `/local-life/submit`. Article detail now has server-generated `generateMetadata()` output for title/description/canonical/Open Graph/Twitter tags, so Facebook/Twitter/article-link previews use article-specific metadata instead of the old site-wide fallback. Hero-less published articles now get a dynamic per-article `/local-life/[id]/opengraph-image` for social sharing, while normal in-app article surfaces intentionally use the static branded `/opengraph-image` placeholder so browsing the site does not trigger per-request OG image generation. The root app also now exposes a real `src/app/icon.svg` favicon using the rounded-square `HT` mark, and the generic fallback/share image family uses that same icon treatment. On the public article detail page, the right-hand sidebar now shows the `Author` card above the `Tags` card.
- **Comments:** `/api/comments` and `/api/comments/[id]` use the live schema (`body`, `authorUserId`, `status`, `parentCommentId`). `/local-life/[id]` supports posting, replying, and deleting your own comments.
- **Events:** `/events`, `/events/[id]`, `/events/submit`, `/api/events`, and `/api/events/[id]` are live on the current schema. Submissions go to `PENDING_REVIEW`; staff can approve/reject them. Public events use real data and the submit page matches the current public shell. `/admin/events` now also includes a compact `+ Event` create tab for direct staff/admin creation. Event locations are modeled as first-class shared `Location` records: `Event` carries required `locationId` plus optional `venueLabel`, both admin/public event forms create or select reusable structured locations inline, and event read surfaces now render canonical location data rather than a raw `locationText` string. Events are now explicitly organization-backed: creation requires `organizationId`, submit/admin forms use search-first organization selectors, public submission can create a pending organization inline, and recurring class/event series can generate weekly, monthly-on-date, and monthly-on-weekday occurrences as separate one-day `Event` rows linked by `EventSeries`. Admin recurring editing now also supports scoped schedule regeneration: `SINGLE` edits affect just one occurrence, `SERIES` rewrites the full series from a new anchor, and `FUTURE` forks the selected and later occurrences into a new series so earlier history stays intact.
- **Shared internal page heroes:** `src/components/shared/InternalPageHeader.tsx` is now the standard compact red-gradient page hero/section-header component for the slimmer internal/public top-of-page treatment. It aligns with the design-system vocabulary in `DESIGN-SYSTEM-ARCHITECTURE.md`, using shared `page-header`, `page-header-inner`, `page-header-main`, `page-header-icon`, `page-header-content`, `page-label`, `page-title`, and `page-actions` classes from `src/app/globals.css`. The white uppercase page-title treatment from `Local Life` is now the default shared look, so the Support pages and other routes using `InternalPageHeader` inherit the same top-bar pattern more consistently. The component now also supports optional description copy below the title, an optional left-side icon/avatar ahead of the header copy, optional action area, optional label, per-page title color override, and per-surface class overrides so special headers like the live profile page can be tightened beyond the shared default without forking the component.
- **Editor and uploads:** TipTap is the active article editor. HTML is sanitized server-side. Uploads work for articles, inline editor images, profile photos, events, marketplace, and Help Wanted. The active widget now uses a real label/input activation path rather than programmatic `.click()` only. `ImageUpload.tsx` was also reworked for the profile-photo case so it no longer falls back to the generic drag/drop box on `/profile/edit`; circular/profile usage now always renders a stable centered card with a larger preview/avatar placeholder, stronger upload/remove actions, and cleaner empty-state copy.
- **Homepage:** `src/app/page.tsx` + `src/lib/homepage.ts` SSR-render the homepage using `HomepageSection` / `HomepagePinnedItem`. Homepage/community resolution now routes through the shared tenant-domain helper in `src/lib/tenant.ts`, still preserving localhost fallback plus a legacy `Community.domain` fallback for existing records. The live homepage uses the `Youth Local` visual direction and now starts with the same compact `InternalPageHeader` hero style used across the rest of the public site; the empty-state explanatory copy sits in a separate card below that shared hero. The standalone `Featured` and `Latest News` section headings above the homepage article buckets were intentionally removed so the page moves directly from the top header into the curated story surfaces. The homepage shell is now a two-column layout: the left column contains the single-item featured hero plus the tighter `Other News` card, while the right column currently uses square `Coming Soon` placeholder cards for Events and Marketplace so layout polish can continue before those real feeds are dropped in. Featured-story cards were also reworked so a single featured item spans the full left-column width, the whole card remains clickable without hover underlines, the article author now shows with the shared `UserAvatar`, and the category/date pills now live on the media panel regardless of whether the article has a real hero image or the branded fallback surface. Homepage article curation is still explicitly split into a single-item `Hero` bucket (`FEATURED_ARTICLES`) and an ordered five-item `Latest News` bucket (`LATEST_NEWS`), but the public copy now presents the latter as `Other News`; `src/lib/homepage.ts` still enforces `maxItems` 1 and 5 respectively, article candidates now carry structured homepage author data in addition to lowercase search text for admin filtering, and homepage article de-duplication still removes the hero story from latest-news display.
- **Search:** `/search`, `/api/search`, and `src/lib/search.ts` are aligned on the current schema and tenant model. Search is SSR, query/filter/page state lives in the URL, counts are returned per content type, and result cards use `next/image`.
- **Admin area:** users, trust, bans, audit log, and content moderation are live. User deletion is Super Admin only and logged before cascade delete. `/admin/articles` is now a dedicated compact article-management surface separate from the mixed `/admin/content` approval queue. It uses the shared admin card/tab/list vocabulary in `src/app/globals.css`: `admin-card`, `admin-card-header`, `admin-card-body`, `admin-card-footer`, `admin-card-tab`, `admin-card-tab-active`, `admin-card-tab-inactive`, `admin-card-tab-body`, and the `admin-list*` family for compact spreadsheet-style moderation tables. `/admin/events` now mirrors that compact admin-management pattern for the `Event` model, with lifecycle tabs for `Pending`, `Approved`, and `Archived`, list filtering, event detail pages, inline status changes via `PATCH /api/events/[id]`, and shared-location selection/creation within the event form. The admin sidebar is now rendered from shared nav-item structure/classes in `src/app/admin/layout.tsx` plus `src/app/globals.css` (`admin-sidebar*`), so future menu additions should reuse the same pattern instead of ad hoc link styling. `Events` is intentionally a top-level admin peer item, not a child of `Articles`.
- **Admin categories / content architecture:** `/admin/categories` is live against the DB rather than a mock, and `/admin/content-architecture` now exists as a read-only internal reference page explaining `Local Life` versus `Community`, current content models, category-to-model mapping, and planned-but-not-live domains. Categories now support explicit nullable `contentModel` values (`ARTICLE`, `EVENT`, `HELP_WANTED`, `MARKETPLACE`, `MIXED`, `PLANNED`) in the schema; subcategories are required to choose a model type when created/edited. Categories also now carry `minTrustLevel` (default `ANONYMOUS`) so nav visibility can remain DB-driven for trusted-only sections like `Help Us Grow`. Super Admins can create categories, edit name/slug/model type/min trust/sort order/archive state, reassign parents within the supported hierarchy, reorder siblings with dedicated move-up/move-down actions backed by a bulk reorder API, include archived categories in the admin list, and delete categories directly from admin for taxonomy cleanup. Category changes call `revalidateTag('categories')` so the cached navbar/Local Life/category-form reads stay in sync. A recent inline-editing regression where inputs lost focus after one keystroke was fixed by moving the row editor component out of the page render path so React keeps stable component identity while typing.
- **Marketplace / stores:** store-based marketplace schema is live (`Store`, `StoreMember`, store-owned `MarketplaceListing`, listing types for products/food/services). Real APIs and pages are live for marketplace and stores. Buyers can browse anonymously; trusted users can message sellers. `/marketplace` supports text search across listings and stores plus dedicated store discovery. Listing states `ACTIVE`, `PENDING`, and `SOLD` are visible. Approved stores have public storefronts at `/marketplace/stores/[id]`. Listing detail links into storefronts. Seller contact on storefront/detail views is gated to trusted users or store managers. Sellers can create and manage stores and store-owned listings from `/marketplace/stores`; admin store moderation lives at `/admin/stores` with approve/reject/suspend/reinstate flows. Shared `/admin/content` now focuses on articles/events. Public marketplace create/edit/detail pages use the `Youth Local` shell instead of the old white-panel treatment.
- **Directory foundation:** `DIRECTORY-PLAN.md` still captures the product direction, but the first implementation layer is now live. `User` now has `isDirectoryListed` for person-directory opt-in, exposed in the profile/account settings flow so people can choose inclusion while still relying on built-in messaging for contact. Prisma now also includes `Organization`, `OrganizationMembership`, `OrganizationLocation`, `OrganizationDepartment`, and `OrganizationContact`, plus the supporting enums for organization grouping/status/membership. The event/location rollout also introduced shared `Location` records as reusable physical-place primitives for maps/history-ready addressing, with local address normalization in `src/lib/location-normalization.ts` and shared display formatting in `src/lib/location-format.ts`. The Prisma client stale-check in `src/lib/db.ts` now also recreates the dev singleton when the cached client is missing `organization` or `location`, preventing hot-reload crashes after schema expansion. Admin organization management is now split cleanly between base creation on `/admin/organizations` and tabbed detail management on `/admin/organizations/[id]`, where admins can work through `Details`, `Locations`, `Departments`, `Contacts`, `Members`, and `Events`; the detail `Details` tab now supports banner-image upload for `bannerUrl`, and the `Events` tab exposes linked organization events with direct admin-event drill-through.
- **Local creator network planning:** `LOCAL-CREATOR-NETWORK-PLAN.md` now documents the direction for a local creator and shows network that behaves more like trusted programming/discovery infrastructure than a social-video feed. Current recommendation is to model `Creator`, `Show`, and `Episode` separately, emphasize Nielsen-style audience measurement rather than subjective quality ratings, start with external-host-backed web discovery and subscriptions, and treat creator monetization plus future Roku/connected-TV distribution as later phases.
- **Obituaries planning:** `OBITUARIES-PLAN.md` now documents the recommended obituary/memorial direction as a separate system rather than ordinary Local Life articles. Current recommendation is to split `Death Notice` from richer `Memorial Page` content, require stronger verification and declared relationship to the deceased, use family/steward controls for ongoing management, avoid open public comments at launch, and provide obituary-specific moderation actions such as freeze/unpublish/identity-dispute review.
- **Help Wanted:** `HelpWantedPost` and related enums are in the Prisma schema. `/api/help-wanted`, `/api/help-wanted/[id]`, and `/api/help-wanted/[id]/approve` support public browsing, trusted-user create/edit/delete, lifecycle transitions, moderation, and activity logging. Public pages are live at `/help-wanted`, `/help-wanted/[id]`, and `/help-wanted/submit`; trusted authors also have `/help-wanted/manage` and `/help-wanted/[id]/edit`. Responses use platform messaging. Uploads have a dedicated `help-wanted` context. Public Help Wanted surfaces share the darker refreshed public design system.
- **Help Wanted polish:** list/detail/submit/edit/manage pages now explain moderation, on-platform contact rules, response behavior, and lifecycle states more clearly.
- **Community roadmap:** `RoadmapIdea`, `RoadmapRankingBallot`, and `RoadmapRankingItem` are in the schema, with roadmap-specific permissions and activity-log resource types. `/api/roadmap`, `/api/roadmap/[id]`, `/api/roadmap/[id]/moderate`, and `/api/roadmap/ballot` still implement submission/edit/delete/resubmit, moderation/merge, ordered top-five ballot saving, and leaderboard aggregation, but the roadmap feature is now middleware-gated to `SUPER_ADMIN` only. Route families `/roadmap`, `/roadmap/[id]`, `/roadmap/submit`, `/roadmap/manage`, `/about/roadmap`, and `/admin/roadmap` are no longer exposed to non-super-admin users.
- **Roadmap weighting foundation:** `DomainInfluenceWeight` and `InfluenceDomain` are in the schema. The first live domain is `ROADMAP_FEATURE_PRIORITIZATION`. `/api/admin/roadmap/weights` lets Super Admins set bounded roadmap-only multipliers with required rationale; changes are logged as `DOMAIN_INFLUENCE_WEIGHT`.
- **Roadmap weighting transparency:** the old public `/roadmap` transparency card has been removed. The admin roadmap page still shows recent roadmap-weight changes from `ActivityLog`, and `/api/admin/activity-logs` recognizes `ROADMAP_IDEA`, `ROADMAP_RANKING_BALLOT`, and `DOMAIN_INFLUENCE_WEIGHT`.
- **Verification baseline:** ESLint is configured; `npm run lint` now passes cleanly without warnings; `npm run test:unit` is green on the current suite (`permissions`, `trust-cascade`, `marketplace-status`, `event-series`); `npm run typecheck` passes repo-wide again; `npm run build` succeeds; CI mirrors `lint`, `test:unit`, `typecheck`, and `build` on PRs and pushes to `main`.
- **Cleanup baseline:** stale helper/route surfaces (`src/lib/auth.ts`, `src/lib/audit.ts`, `src/lib/community.ts`, `src/lib/trust.ts`, `src/lib/upload.ts`, `/api/settings`, `/api/users/[id]/block`) were rewritten to the current schema/session model; stale schema-era tests were removed rather than kept behind exclusions.
- **Register flow:** the old standalone `/register` screen has been removed; credentials sign-up now lives in the combined `/login` tabbed auth UI and posts to the live `/api/auth/register` route. Successful credentials sign-up creates a `REGISTERED` user plus default community membership. `/api/auth/register` also accepts an optional `dateOfBirth` and stores it on the user record when provided, which lets the `/login` sign-up tab collect DOB up front while still treating it as optional at registration time. First-time Google sign-ins now pass through `/social-landing`; if the OAuth login created a brand-new user, that user is sent to `/profile/edit` so they can add DOB immediately, and their own profile page also shows the same DOB guidance message until they add it.
- **Homepage curation:** `/admin/homepage` and `/api/homepage/sections` are the active curation surface. Types are shared with `src/lib/homepage.ts`, and marketplace homepage cards now use store-based metadata. The article portion of `/admin/homepage` no longer uses the generic per-section available-content list: it is now a dedicated drag/drop board with a filterable `Approved Stories` source list, a single-story `Hero` bucket, and an ordered `Latest News` bucket capped at five items. The same article cannot be assigned to both buckets; the admin UI enforces that interaction locally, and `PUT /api/homepage/sections` now also rejects duplicate article IDs across `FEATURED_ARTICLES` and `LATEST_NEWS` server-side. Events and marketplace still use the older section-card pinning UI below the article board. A live production issue where `/admin/homepage` rendered only the static title/description/save button was traced to a blank production `communities.domain`; this was fixed by setting the production domain and is one of the reasons the new tenant-domain foundation now exists.
- **Navigation / design:** the public design system is live, nav dropdowns work, the roadmap links in the About dropdown/footer are now also Super Admin only, `/events` shows a `Submit Event` CTA for signed-in users, `/admin/stores` is labeled `Store Moderation`, and the shared public shell uses the `Youth Local` direction. The root layout in `src/app/layout.tsx` now uses a darker canvas, full-width gradient masthead, embedded nav pills, utility pills in the upper-right, a reduced-size wordmark, the uppercase `Community platform` eyebrow, and a tuned inline SVG `HT` shield mark. The app now also ships a real favicon at `src/app/icon.svg`, using a rounded-square `HT` mark derived from the same brand palette rather than relying on the browser’s default icon. The logged-out auth utility pill in the live header now says `Sign In/Up` while still linking to `/login`. Masthead spacing is tighter (`p-3`, reduced nav gap, removed explicit `margin-bottom: 10px` on the live public `<nav>`). The navbar dropdown regression was fixed by changing the masthead from `overflow-hidden` to `overflow-visible`, giving the header its own higher stacking context, removing the old horizontal scroll wrapper from `NavigationBar.tsx`, and letting the nav pills wrap so full submenu panels can render instead of clipping after the first rows. `NavigationBar.tsx` now builds the public top nav from DB-backed top-level categories and their child categories rather than from a mixed hardcoded section list; dropdown and non-dropdown pills now share the same text treatment, route overrides live in `src/lib/category-config.ts`, and the old static `Support` / `Arcade` menu pills were removed from the public nav. The live footer in `src/app/layout.tsx` is still the active footer surface, uses the same gradient family as the masthead so it reads as a distinct app-footer region, centers its two columns, labels them `Support` and `Highlander Today`, and pulls those link lists from shared `SUPPORT_NAV_ITEMS` and role-filtered About nav data so footer and navbar labels stay in sync. The older `src/components/layout/Footer.tsx` remains unused, but its obsolete `Quick Links` column was also removed so it no longer drifts from the active shell language. A slimmer shared page-hero/header treatment now exists through `src/components/shared/InternalPageHeader.tsx`, replacing several older underlined or oversized gradient headers with a compact section-label-plus-actions pattern and a slightly larger uppercase title label. The live `/login` page now matches the public-site visual language more closely: the old standalone auth card/header treatment was removed, Google auth sits in a left-hand social card, and the right-hand email-auth card uses tabbed `Sign In` / `Sign Up` states with inline registration, optional DOB guidance, and password visibility toggles. Large display-style section headings across the public site now also share a reusable `.section-display-title` class from `src/app/globals.css`, using a branded cyan-to-rose gradient treatment instead of plain black/white text for better contrast on mixed light and dark panels. `NavigationBar.tsx`, `BannerActions.tsx`, `layout.tsx`, and `ArticleCreateAction.tsx` are the active shared files for this surface. Old `Footer.tsx` and `Navigation.tsx` remain unused. The shared `.container` utility still includes `margin-top: 10px`.
- **Design system architecture:** `DESIGN-SYSTEM-ARCHITECTURE.md` is now the canonical naming/theming reference for shared UI work. Preferred hierarchy is `masthead -> page -> page-header -> page-body -> page-footer -> app-footer`, with parallel `section-*`, `card-*`, `form-*`, and `btn*` vocabulary. `header` means a structural region, while `label` means an eyebrow/kicker text element inside that region. For multi-tenancy, component structure should stay reusable while visual branding increasingly moves toward semantic classes plus theme tokens rather than hardcoded per-component styling. `src/app/globals.css` now contains shared `form-label`, `form-input`, and `form-textarea` primitives for consistent control sizing/spacing plus shared `.btn`, `.btn-primary`, `.btn-secondary`, and `.btn-danger` classes for standardized button shape/state styling with color still overridable per surface. Shared page-header structure now also includes optional icon/avatar support through `page-header-main`, `page-header-icon`, and `page-header-content` so pages can add an identity cue without inventing one-off header layouts.
- **Layout consistency:** the root layout provides a small global gap between the red navbar and page content, the custom `.container` rule in `src/app/globals.css` now centers horizontally without zeroing vertical margins, no longer applies a shared max-width cap, and uses `2rem` horizontal padding so public pages can span the viewport without touching the screen edge. Public pages that had extra outer `max-w-* mx-auto` wrappers were widened to use the shared content width more consistently.
- **Admin layout:** `src/app/admin/layout.tsx` intentionally breaks out of the shared public container and uses full viewport width. The admin area should be treated as a desktop/laptop-only surface for information consumption, moderation, and system maintenance rather than a mobile-first public experience. Design philosophy for admin screens should therefore be explicitly **compact**: tighter spacing, denser tables/lists, higher information-per-screen, restrained decorative treatment, and controls styled for efficient scanning and operational work instead of spacious marketing-style presentation. The main admin content area now uses a very tight `5px` outer padding, and the sidebar/menu ordering was tightened to match the current operational priority order, with `Homepage Curation` directly under `Dashboard` and `Users` directly under `Navigation`. The sidebar was softened from near-black to a lighter slate treatment. It now also includes a `Sites` link, and `/admin/sites` lists current communities plus their tenant-domain records so Super Admins can inspect the current site/domain mapping from inside the app.
- **Users admin:** `/admin/users` was rebuilt from an older spacious management page into the same compact `admin-card` / `admin-list` operational pattern used by `Articles`, `Events`, `Navigation`, and `Organizations`. The table now prioritizes `User`, `Email`, `Trust`, `Role`, `Last Seen`, and `Vouched By`; `Last Seen` comes from each user’s latest `LoginEvent.createdAt` rather than account creation; `Vouched By` now shows voucher names instead of only counts; the older post-count column and summary cards were removed; role editing now shows a blue caret affordance; and the manage row now uses color-coded actions plus Lucide icons for `View profile`, `Message`, trust actions, and deletion. The manage row also now supports opening a compact inline admin `Message User` dialog that sends via `POST /api/messages` and redirects into the resulting conversation thread.
- **Organizations admin:** `/admin/organizations` now exists as a compact operational surface parallel to `/admin/articles` and `/admin/events`. It includes status tabs, a filterable list, inline status editing, a detail page, and an `Organization` create tab. Admin creation writes the new organization under the currently resolved tenant/community, creates the initial owner membership automatically, uses the controlled taxonomy for group/type selection, and masks/validates phone input in the create form. Status changes currently use the same editor/admin permission gate as other moderation surfaces.
- **Public directory:** `/directory` is now a live read surface backed by real data rather than a placeholder shell. It resolves the active community, queries opted-in people from `User` and approved organizations from `Organization`, and keeps the default people view empty until a search is entered while top-level `Businesses`, `Government`, and `Organizations` category pills load full current-tenant results alphabetically. The pill label serves as the category navigation target and the chevron opens subtype menus; the old detail column was removed; and the contact header now reads `Phone`. The current UI is also materially more compact than the first live pass: search is submitted inline from the field itself, viewer-state guidance is plain text instead of boxed alerts, the extra helper/result-count copy is gone, and desktop sorting now happens from clickable result headings rather than a separate sort menu.
- **Directory messaging and viewer guidance:** people rows on `/directory` now expose a client-side `Message` action only for trusted-capable viewers. It still reuses the compact inline dialog pattern from `/admin/users`, submits through `POST /api/messages`, and redirects into the resulting conversation thread, but anonymous and merely `REGISTERED` viewers now receive trust/account requirement copy instead of the compose box. The current user still sees `Your listing` on their own row. `/directory` also now renders a persistent viewer-state banner above the search form: anonymous viewers are prompted toward sign-in/sign-up, registered viewers are told trust is required for directory messaging/listing, and trusted-but-not-listed viewers are pointed toward inline-linked `profile settings.` text to enable inclusion.
- **Deferred organization self-serve listing:** the directory currently should not promise a self-serve "list my organization" path. Admin/staff users can create organizations today, but ordinary-user organization submission/claim flows do not exist yet, so any public-facing organization-listing CTA/help copy should stay deferred until that product loop is real.
- **Directory deployment note:** when promoting the live directory foundation to an environment that has not yet received the new Prisma schema, `/directory` will fail at runtime with Prisma errors if `users.isDirectoryListed` and the `organizations` tables do not exist yet. The production fix used here was `npx prisma db push --schema prisma/schema.prisma` against the target database.
- **Trusted-nav deployment note:** the `Help Us Grow` / trusted-nav rollout also requires the target environment to have the updated Prisma schema. If `/api/categories` or `/api/admin/categories` throws a Prisma `P2022` error about missing `categories.minTrustLevel`, the environment has not received the schema yet; run `npx prisma db push --schema prisma/schema.prisma` against that database before loading the categories surfaces.
- **Build stabilization:** a later Vercel deployment failure was not caused by the new directory work; it came from an unused `stats` state declaration left in `src/app/admin/users/page.tsx`. Removing that dead state path restored `npm run typecheck` / `next build`. The remaining Next ESLint warnings were also cleaned up by fixing the `fetchPendingContent` effect dependency in `src/app/admin/content/page.tsx` and intentionally suppressing `@next/next/no-img-element` in the current raw-image preview/upload surfaces where the project is still deliberately using `<img>`.
- **Local Life article detail:** `src/app/local-life/[id]/page.tsx` now uses a dedicated two-column article-detail layout on large screens. The reading flow stays in the left primary column at roughly 75% width, while the right-hand sidebar at roughly 25% width now carries only tags and author information; the older `Article Details` card was removed. The main article surface was refactored around reusable `article-card`, `article-card-header`, `article-card-header-title`, `article-card-header-actions`, `article-card-date`, `article-card-body`, `article-card-content`, `article-card-footer`, and related hero-image/caption classes in `src/app/globals.css`, so the reader-facing article page now has a clearer named card structure. Hero images render only when present; when no image exists the article content now flows upward instead of reserving a placeholder block.
- **Comments on article detail:** the public Local Life comment surface in `src/components/articles/CommentThread.tsx` was compacted substantially: tighter card spacing, smaller text, inline reply/delete affordances, delete moved to the comment card’s upper-right corner, and the composer now behaves like a single-line comment bar with the submit button attached at the right while still auto-growing as the user types longer comments. A duplicate-reply rendering bug on article detail was fixed by filtering the article-detail API’s top-level comments to `parentCommentId: null` in `src/app/api/articles/[id]/route.ts`.
- **Trusted-only commenting:** Local Life article commenting is now effectively trusted-user-only. `POST /api/comments` in `src/app/api/comments/route.ts` now rejects non-`TRUSTED` users, and the article detail page passes the viewer trust state into `CommentThread`. Signed-in `REGISTERED` users now see `You must be a trusted user to comment.` plus a blue info trigger that opens a dialog explaining that someone in the community must vouch for them as a real member, and that this requirement exists to reduce bots, anonymous misuse, and misleading behavior. Anonymous visitors still see comments but only get the standard sign-in prompt.
- **About baseline:** `/about`, `/about/mission`, and `/about/journal` are public; `/about/roadmap` remains live but is now restricted to `SUPER_ADMIN`. Navigation now labels `/about/journal` as `Blog`. Mission copy is now warmer and more specific; pillar cards, nav descriptions, and journal entry summaries match that tone. Content still lives in `src/lib/about.ts` and page JSX; there is no CMS/data model yet. About pages use the active `Youth Local` language. Shared card vocabulary for these institutional pages now lives in `src/app/globals.css`: use `card` for the container, `card-label` for the eyebrow/section label, `card-title` for the main card headline, and `card-body` for the white body copy. `card-label` and `card-title` now render as separate block rows so the label stays visually distinct from the title. Standard title-size variants now also exist as `card-title-hero`, `card-title-lg`, `card-title-md`, and `card-title-sm`. The older `empty-state-title` class remains available and now shares the same headline treatment as `card-title`; `empty-slate-title` is also aliased for compatibility.
- **Content analytics planning:** `CONTENT-ANALYTICS-PLAN.md` now defines the intended first-party analytics/reaction-intelligence direction: shared event taxonomy, content-type-aware metrics, usefulness/reaction signals, privacy guardrails, raw-event plus rollup architecture, and phased rollout toward internal editorial/product reporting.
- **Support baseline:** `/support`, `/support/faq`, `/support/how-to`, `/support/report-a-problem`, and `/support/contact-us` now exist as placeholder pages. Their top-of-page headers now inherit the same shared `InternalPageHeader` treatment used by `Local Life` and the rest of the public shell instead of drifting visually from the standard page-header pattern. The earlier Super Admin-only `Support` top-nav entry has been removed; the routes themselves still exist and are not additionally access-restricted yet.
- **Security logging:** login events and immutable activity logs are live, including admin endpoints for investigation/export.
- **Repository / deployment baseline:** git is live, `main` is pushed to `https://github.com/dsjrego/highlander-today`, `README.md` reflects the current product surface, `.env.example` uses Docker Postgres on `127.0.0.1:5433`, and `src/app/api/health/route.ts` now exists for Docker `HEALTHCHECK`. The repo still has no checked-in `prisma/migrations/` directory; schema rollout is currently `prisma db push` style rather than migration-file driven.
- **Production environment:** production domain is `https://highlander.today`; registrar remains Namecheap; authoritative DNS is now Cloudflare; hosting is Vercel. Cloudflare R2 uploads are live on `https://cdn.highlander.today`. MaxMind login geolocation is live in production. Active launch auth providers are credentials plus Google OAuth. Facebook OAuth is intentionally deferred until Meta business verification is complete. `npm run deploy:check-env` now validates deploy-critical env vars. Locked-profile photo/bio updates were fixed by submitting only editable fields and comparing actual changes rather than field presence. Production `communities.domain` was blank during session 65 and caused `/admin/homepage` to render without section controls; setting it to `highlander.today` immediately fixed the issue. The article hero-image caption field should be deployed with `npx prisma db push --schema prisma/schema.prisma`; Prisma now maps the logical field `featuredImageCaption` to the physical Postgres column `articles.featured_image_caption`, which matches the current local database shape.
- **Production environment:** production domain is `https://highlander.today`; registrar remains Namecheap; authoritative DNS is now Cloudflare; hosting is Vercel. Cloudflare R2 uploads are live on `https://cdn.highlander.today`. MaxMind login geolocation is live in production. Active launch auth providers are credentials plus Google OAuth. Facebook OAuth is intentionally deferred until Meta business verification is complete. `npm run deploy:check-env` now validates deploy-critical env vars. Locked-profile photo/bio updates were fixed by submitting only editable fields and comparing actual changes rather than field presence. Production `communities.domain` was blank during session 65 and caused `/admin/homepage` to render without section controls; setting it to `highlander.today` immediately fixed the issue. The article hero-image caption field should be deployed with `npx prisma db push --schema prisma/schema.prisma`; Prisma now maps the logical field `featuredImageCaption` to the physical Postgres column `articles.featured_image_caption`, which matches the current local database shape. The directory rollout likewise required a production `npx prisma db push --schema prisma/schema.prisma` before `/directory` could run, because production was initially missing `users.isDirectoryListed` and the `organizations` tables.
- **Tenant-domain foundation (phase 1):** `TenantDomain` and `TenantDomainStatus` now exist in `prisma/schema.prisma`; `src/lib/tenant.ts` centralizes normalized host/domain resolution with `tenant_domains` first, `Community.domain` as a legacy fallback, and localhost fallback for development. `src/lib/community.ts` now creates/upserts a primary tenant-domain record when a community is created and also ensures baseline site settings. `prisma/seed.ts` accepts `PRIMARY_COMMUNITY_DOMAIN` to seed a primary domain record. `scripts/backfill-tenant-domains.ts` plus `npm run db:backfill-tenant-domains` exist to backfill `tenant_domains` rows from legacy `Community.domain` data after `npm run db:push`.

### Placeholder

- Admin dashboard
- Experiences landing page
- Arcade landing page

### Partial

- Messaging attachments UI/data model
- Help Wanted MVP is functionally complete; remaining work is launch validation with real usage plus targeted refinements
- Multi-tenant admin provisioning is only phase 1: tenant-domain resolution and inspection exist, but there is not yet a full Super Admin create/edit flow for provisioning new sites/domains from the UI
- Cross-site multi-tenant “sister site” pull-through is not implemented; homepage/content selection is currently per-domain/per-community only
- Directory is now partially live: schema foundations, profile opt-in, public browse/search, and admin organization create/moderation exist; public organization detail pages, richer organization editing, and self-claim/self-management flows are still pending
- Donations/transparency has a planning doc but no schema, routes, admin tooling, provider integration, or public pages yet
- Article sourcing/citations has a planning doc but no schema, create/edit UI, TipTap integration, or article-detail rendering yet
- About is live as a static public slice, but still needs richer Journal/history structure, possible CMS/data model, future institutional pages such as `Transparency`/`Support`, and the same voice refresh on the Roadmap and Journal pages

## Blue-Sky Brainstorming

These are explicitly future-facing ideas, not current commitments. Only pursue them if they strengthen the core local interaction loops and preserve focus on complete workflows.

- **Local Intent Router:** one resident-facing “I need something” flow that routes users into the correct system automatically
- **Community Capability Graph:** structured map of who in the community can do what, based on identity, vouches, trusted participation, completed interactions, and visible activity
- **Trust-Backed Local Reputation:** domain-specific reliability layers for selling, hiring, organizing, volunteering, civic contribution, etc., without becoming a generic rating platform
- **Local Operating Feed:** high-signal daily feed spanning events, stories, marketplace changes, help wanted activity, urgent requests, notices, and other meaningful local changes
- **Mutual Aid / Response Network:** trusted-neighbor coordination for rides, weather response, elder support, lost pets, errands, and similar needs where identity and accountability materially improve safety
- **Civic Action Layer:** tools for issue tracking, petitions, public comment mobilization, agendas, local advocacy, and visible problem-solving
- **Verified Local Memory:** durable community knowledge built from approved reporting and trusted contributions
- **Article Licensing Marketplace:** future editorial marketplace where approved local stories can be licensed to organizations for republication under explicit terms; only revisit after the core content and organization loops are clearly working
- **Marketplace-to-Fulfillment Bridge:** logistics tooling for delivery windows, pickup points, batching, or local runners
- **Institution Accounts:** first-class profiles and workflows for schools, churches, clubs, nonprofits, municipalities, and similar institutions
- **Community Pulse / Early Warning System:** aggregate local signals from searches, posts, responses, and interactions to identify emerging needs or shortages

### Brainstorming Priorities

If revisited later, the strongest candidates are:

1. **Local Intent Router**
2. **Community Capability Graph**
3. **Mutual Aid / Response Network**

These fit best because they deepen trust, messaging, content, marketplace, and Help Wanted into a more unified local coordination platform rather than adding disconnected surface area.

## Known Issues & Gotchas

1. **No PrismaAdapter:** it silently breaks JWT-based credential login. Never re-add it.
2. **Port 5433:** Docker Postgres runs on `127.0.0.1:5433`; Mac often already uses `5432`.
3. **DB import:** always `import { db } from '@/lib/db'`; never `prisma` or a default import.
4. **Middleware auth headers:** `src/middleware.ts` sets `x-user-id`, `x-user-role`, `x-user-trust-level`, and `x-client-ip` for `/api/*`. Most active APIs read headers, not `getServerSession()`.
5. **Auth config split:** the live config is `src/app/api/auth/[...nextauth]/route.ts`; `src/lib/auth.ts` is not the active config.
6. **User / membership model:** `User` has `firstName`, `lastName`, `profilePhotoUrl`, `dateOfBirth`, and `trustLevel`. Role comes from `UserCommunityMembership` and is attached to JWT/session.
7. **Schema path:** only use `prisma/schema.prisma`; scripts and Docker already pass it explicitly. Never create a root-level `schema.prisma`.
8. **Global CSS drift:** `src/app/globals.css` previously had an older lower-file `button, .btn { border: none; ... }` reset and duplicate legacy `.btn-*` rules that silently overrode the newer shared button system. Those stale `.btn` overrides were removed in session 72. If shared button borders/hover states seem to “do nothing” again, check for duplicate later selectors before debugging component markup.
9. **After schema changes:** run `npm run db:generate`, then `npm run db:push`, then restart the dev server. If Prisma client looks stale, clear `.next`.
10. **Event schema note:** the current event forms depend on `locations`, `events.locationId`, `events.organizationId`, `event_series`, and the new event-series fields. If admin/public event creation or event reads fail on any of those fields in any environment, the database is behind the schema; run `npm run db:push` / `npx prisma db push --schema prisma/schema.prisma` before debugging the UI.
11. **Profile flow:** view = `src/app/profile/[id]/page.tsx`; edit = `src/app/profile/edit/page.tsx`; active profile helpers/components now include `ProfileTabs.tsx`, `VouchSection.tsx`, `VouchProfileButton.tsx`, and the shared `PageHeaderAvatarDialog.tsx`.
12. **Identity lock:** once vouched, `isIdentityLocked = true` and name/DOB become permanently read-only. DOB must exist before vouching.
13. **Messaging canonical schema:** use `ConversationParticipant`, `Message.body`, `Message.senderUserId`, and `ConversationParticipant.lastReadAt`. Do not use old fields like `conversation.userId`, `recipientId`, `updatedAt`, `message.content`, `senderId`, or user `name`/`avatar`.
14. **Messaging limitations:** active messaging is text-only. Attachments exist in schema/legacy UI but are not wired in the live routes/pages. Blocking is enforced for create/list/detail/send, but there is no dedicated blocked-users management page yet.
15. **Messaging schema gotcha:** if Prisma throws `P2022` for `conversation_participants.lastReadAt`, the local DB is behind the schema. In this repo, `prisma db push` once failed with a generic schema-engine error; the fix was:

```sql
ALTER TABLE "conversation_participants"
ADD COLUMN "lastReadAt" TIMESTAMP NOT NULL DEFAULT NOW();
```

16. **Articles canonical path:** build article behavior under `/local-life/*`, not `/articles/*`.
17. **Categories source of truth:** the DB is the source of truth for categories. `seed.ts` now matches the intended Local Life taxonomy, and category-driven UI should fetch through `/api/categories` or `src/lib/categories.ts` rather than hardcoding category lists.
18. **Uploads:** `/api/upload` uses middleware auth headers. Development writes to local disk; production uses Cloudflare R2 when env vars are configured. `ImageUpload.tsx` is active; `ImageUploader.tsx` is legacy.
19. **Supported upload formats:** JPEG, PNG, WebP, and GIF only, up to 5MB. HEIC/HEIF is unsupported, so iPhone photos may need conversion.
20. **Article video support:** TipTap currently does not support video embeds or uploaded video files. Safe YouTube/Vimeo embeds are the next planned editor enhancement and should land before Milestone 9 / Delivery Jobs. Native video upload remains out of scope.
21. **TipTap versions:** keep any added TipTap extensions on v2.x.
22. **No `@@fulltext`:** Postgres full-text search is implemented manually in `src/lib/search.ts`.
23. **R2 status:** production upload storage is live on `cdn.highlander.today`; local dev still uses filesystem storage. For any new environment, you still need real bucket credentials, public URL config, and matching env vars.
24. **Removed sections:** Classifieds and Galleries were removed. Do not re-add them.
25. **Homepage tenant resolution:** use `host` / `x-community-domain` or `x-community-id`. `localhost` and `127.0.0.1` intentionally fall back to the first community because the seed does not set `Community.domain`.
26. **Homepage de-duplication:** `FEATURED_ARTICLES` must not repeat inside `LATEST_NEWS` on the same render.
27. **Verification caveat:** `lint`, `test:unit`, `typecheck`, and `build` passing means the checked-in surface is back under coverage; it does not mean every file is equally production-ready.
28. **Legacy cleanup rule:** do not reintroduce blanket TypeScript exclusions. If a stale scaffold file becomes active again, rewrite it to the live schema/session model or delete it.
29. **Marketplace direction:** marketplace is store-based, not direct user-owned classifieds. Users can own multiple stores. Stores require admin approval to become public. Listings belong to stores, even if temporary compatibility fields still exist.
30. **Marketplace MVP scope:** initial listing types are products, grocery/artisan food, and services. Experiences may join later.
31. **Marketplace buyer access:** browsing is public, but seller messaging requires `TRUSTED` status.
32. **Container override gotcha:** the repo defines a custom `.container` in `src/app/globals.css`. Do not use `margin: 0 auto;` unless you intentionally want to wipe vertical margins everywhere. The correct shared behavior is horizontal centering only, with `margin-top: 10px`, no shared max-width cap, and `2rem` horizontal padding.
33. **Marketplace boundaries:** do not turn the first marketplace build into full checkout. Payments, shipping, inventory, retailer integrations, and back-office tooling are later work, but schema/route design should leave room for them.
34. **Delivery direction:** delivery should be a shared platform capability, not marketplace-only. It should support standalone jobs with fee, pickup, destination, requested timing, and job details.
35. **Delivery assignment modes:** support open/public claimable jobs, invite-only jobs, and direct-dispatch jobs.
36. **Delivery architecture:** delivery should remain its own domain, with APIs that marketplace, restaurant ordering, or external merchant systems can hook into later. Do not bake delivery logic directly into marketplace listings.
35. **Food scope:** marketplace food support means grocery-style and artisan/craft food listings, not restaurant delivery. Restaurant ordering is a separate future system that may reuse the delivery network.
36. **Community roadmap direction:** the roadmap system still exists in the schema and app, but it is now an internal `SUPER_ADMIN`-only workflow rather than a public trusted-user input loop.
37. **Domain-specific weighting:** influence weighting must stay domain-specific and non-global, so a user can have higher signal in one domain and neutral/lower signal in another.
38. **Rollout philosophy:** introduce features at a pace the community can absorb. Build forward-compatible foundations when useful, but keep UI exposure hidden/gated/light until momentum justifies it.
39. **Scope-control rule:** prioritize complete user loops over abstract categories. Example: store creation -> admin approval -> listing creation -> public discovery -> trusted buyer messaging -> seller marks pending/sold.
40. **Platform sequencing:** intended order remains `(1) trust/content/community identity`, `(2) store-based listings/discovery`, `(3) Help Wanted`, `(4) community feature prioritization`, `(5) domain-specific weighting/reputation`, `(6) analytics/reaction intelligence`, `(7) organization/directory foundation`, `(8) delivery/jobs`, `(9) transaction infrastructure such as payments, inventory, shipping, merchant APIs`. Milestones 1-4 are complete for the current MVP loops, and the organization/directory foundation has now entered its first live implementation phase.
41. **Current execution priority:** deployment is complete enough that engineering focus should now be post-launch validation of live loops, the `About` track, and instrumentation that clarifies what people actually use and value, not speculative delivery/jobs work or more Help Wanted polish without user feedback.
42. **Post-launch question:** prove whether trusted local users and businesses will actually use the moderated Help Wanted board for jobs, service requests, and short-term tasks inside the trust + messaging system.
43. **Marketplace local DB gotcha:** while rolling out the store-based marketplace, `prisma db push` hit a generic schema-engine failure. Prisma client generation succeeded, but local Postgres had to be aligned manually for `stores`, `store_members`, `marketplace_listings.storeId`, `marketplace_listings.listingType`, and the expanded `MarketplaceStatus` enum. If marketplace tables drift again, inspect the live DB directly instead of trusting the opaque Prisma error.
44. **Local runtime dependency:** SSR routes require local Postgres at `127.0.0.1:5433`. If `db.community.findFirst()` throws locally, first ensure Docker Desktop is running, then `docker-compose up -d`, then restart/reload the dev server. In the observed failure, seed data already existed; the problem was service availability.
45. **Legacy cleanup status:** formerly excluded helper/route surfaces are back under TypeScript coverage. Do not let new scaffold-era drift accumulate outside the active Prisma/session model.

## Design System

- **Colors:** Blue `#46A8CC` (banner), Maroon `#A51E30` (nav, headings, pills, CTAs), Dark maroon `#7a1222` (footer)
- **Banner / live masthead:** `src/app/layout.tsx` now uses a full-width dark blue-to-maroon gradient shell with compact `p-3` spacing, left-aligned wordmark, uppercase `Community platform` eyebrow, inline SVG `HT` shield monogram, nav pills directly beneath the eyebrow, and utility pills in the same top row as the title. The old `text-7xl` stroked banner is no longer live.
- **Page pattern:** headings `text-2xl font-bold border-b-2 border-[#A51E30]`; cards `rounded-xl shadow-sm bg-white`; accents `border-l-4 border-[#A51E30]`; pills `bg-[#A51E30] text-white text-xs rounded-full`; CTAs `bg-[#A51E30] text-white rounded-full`

## Remaining Work

### Rollout Milestones

1. **Milestone 1 — Store marketplace MVP:** complete. User can create a store, admin can approve it, approved store can publish listings, public can browse/search, trusted buyers can message sellers, and sellers can mark listings pending/sold. Store creation/approval, browsing/search, trusted messaging, public pending/sold visibility, seller listing lifecycle controls, storefront pages, admin store moderation, direct store discovery on `/marketplace`, storefront presentation polish, and homepage/discovery refinement are in place.
2. **Milestone 2 — Help Wanted MVP:** complete. Trusted users/businesses can create job, service-help, and gig/task postings; the public can browse; trusted users can respond through messaging; posters can close/fill posts. Remaining work is launch validation and refinement, not missing core functionality.
3. **Milestone 3 — Community feature-prioritization MVP:** structurally complete, but the roadmap feature is now hidden from non-`SUPER_ADMIN` users rather than operating as a live public/community input surface.
4. **Milestone 4 — Domain-specific weighting/reputation MVP:** complete. The roadmap-first weighting foundation is live with bounded per-user multipliers, required rationale, auditable activity logs, active-community history, and shared policy constants for the current `90%-110%` range. The old public weighted-vs-raw transparency card has been removed.
5. **Milestone 5 — Content analytics and reaction-intelligence MVP:** implement the first-party analytics foundation described in `CONTENT-ANALYTICS-PLAN.md`: event taxonomy, anonymous/session identifiers, ingestion endpoint, raw-event storage plus daily rollups, and internal reporting for page/content performance across articles, events, marketplace, Help Wanted, and static pages. The first usefulness signal should include bounded reaction capture plus conversion tracking into comments, messaging starts, and other core-loop actions.
6. **Milestone 6 — Organization foundation + directory/org-site MVP:** partially complete. `Organization`, `OrganizationMembership`, structured organization child models, profile opt-in, `/admin/organizations`, and the first live `/directory` browse surface now exist. Remaining work is public organization detail pages, richer organization editing/management, self-claim/self-management flows, and the later org-site/subdomain layer such as `flavortown.highlander.today` without treating marketplace stores as the general organization abstraction.
7. **Milestone 7 — Article video embeds MVP:** safe YouTube/Vimeo embeds inside TipTap without expanding into native video upload/storage.
8. **Milestone 8 — Local creator network MVP:** creator/show/episode data model, external-host-first media embedding, structured discovery rails, category browsing, basic audience measurement, and creator profile pages linked to users or organizations. Church and faith content is the recommended early adoption anchor. Creator monetization tools (subscriptions, paid access, supporter memberships, platform fees) should follow in a later phase after the catalog has real depth and regular programming. See `LOCAL-CREATOR-NETWORK-PLAN.md`.
9. **Milestone 9 — Delivery jobs MVP:** requester posts a delivery job, eligible drivers can browse/receive it based on assignment mode, one driver can claim/accept it, and the job moves through basic completion states.
10. **Milestone 10 — Decide next bottleneck:** only after milestones 1-9 are stable should the next expansion lane be chosen among payments, restaurant ordering, merchant tooling, connected-TV distribution, or broader integrations.

### Phase 1: Listing Pages / Real Data

1. `Local Life` real data: done
2. `Experiences` real data and models: pending
3. `Events` real data: done
4. Marketplace/store foundation: done. Store-oriented schema, store-owned listings, products/food/services listing types, future-room for payments/inventory/shipping/APIs, and seller `PENDING` / `SOLD` controls are live.
5. `Market` list/detail on real store-based APIs: done
6. Help Wanted MVP: done for the core loop. Includes `EMPLOYMENT`, `SERVICE_REQUEST`, and `GIG_TASK`; public browsing; `TRUSTED` posting/responding; no public off-platform contact details; explicit safety/accountability framing; close/fill flow; poster management.
7. Community prioritization MVP: done. `TRUSTED` users submit/rank; staff moderate/merge; approved ideas enter a ranking pool; ordered priorities replace simple upvotes; statuses include `SUBMITTED`, `UNDER_REVIEW`, `APPROVED_FOR_RANKING`, `DECLINED`, `PLANNED`, `IN_PROGRESS`, `SHIPPED`, and `MERGED`.
8. Domain-specific weighting foundation: done. Weighting is non-global, roadmap is the first bounded/auditable use case, and future domains may include delivery reliability.
9. Article detail on real data: done at `/local-life/[id]`
10. Search on real data: done; later expand marketplace search over store-owned listings as commerce evolves
11. Homepage real data by section: done for the current per-community model
12. Sister-site content pull-through: not implemented
13. First-class organizations / directory foundation: partially complete. Use the dedicated `Organization` + `OrganizationMembership` model rather than widening `Store`; the current live layer already supports directory listings, membership/accountability, and admin creation/moderation, while public organization detail pages and future paid org subdomain routing are still pending.

### Phase 2: Admin Area

1. Dashboard aggregate stats: pending
2. Content moderation for articles/events/Help Wanted: done
3. Categories CRUD: `GET` done; `POST`, `PATCH`, and `DELETE` still needed
4. Users / Trust / Bans / Audit log: done
5. Homepage curator persistence: done
6. Settings persistence cleanup: still needed

### Phase 3: Interactive Features

1. Comments: core replies/delete flow done on `/local-life/[id]`; moderation UI can be expanded later
2. Private messaging core flow: done; attachments still missing
3. Vouching flow: done
4. User blocking: done for active profile and messaging flows; dedicated blocked-users management UI is optional future work
5. Marketplace browsing anonymous / seller contact `TRUSTED`-only / seller pending-sold controls: done
6. Store seller workflow: done for store creation, approval/rejection, rejected-store resubmission, listing edit/delete, public storefront baseline, richer store presentation, and direct store discovery on `/marketplace`
7. Community prioritization and weighting: live foundation, continue to evolve within the bounded/non-global model
8. Delivery/jobs platform: still future work. It should support marketplace, food, and private delivery uses; fee + pickup + destination; open/invite-only/direct-dispatch modes; claimable jobs; preferred/in-house/contracted drivers; separate requester/driver reliability signals; and room for negotiation, status tracking, deadlines, and later workflows.
9. Image upload: done across forms; production R2 path is now live, with broader smoke testing as the remaining practical follow-up
10. Article video embeds: prioritize before Delivery Jobs / Milestone 9

### Phase 4: Polish & Production

1. Error handling, loading states, mobile responsiveness, SEO metadata
2. Dark mode: define an intentional dark theme, support user-selectable preference, and verify readability across banner/nav/cards/forms/editor/admin
3. Rate limiting, email notifications, tests, and ongoing production hardening
4. OAuth is live in production as credentials + Google; Facebook remains deferred
5. Future commerce expansion: payments/checkout, inventory and shipping, merchant APIs, larger retailer integrations, richer shared delivery dispatch/claim/fulfillment, organization-level dispatch and contracted-driver workflows, and separate restaurant menu/ordering/delivery

## Verification Notes

- **Events:** traced end-to-end through creation, moderation, public listing, detail view, and navigation surfacing. The old scaffold-era event API route was replaced first with the current schema fields (`submittedByUserId`, `startDatetime`, `endDatetime`, `locationText`, `photoUrl`, `costText`, `contactInfo`), and now the active event layer includes shared `Location` records, required `Event.organizationId`, and recurring-series generation through `EventSeries` while still keeping each occurrence as its own one-day `Event` row.
- **Uploads:** `ImageUpload` was strengthened after event testing, and supported file types were clarified. If uploads fail, first confirm JPEG/PNG/WebP/GIF under 5MB.
- **Homepage:** verified domain-aware community resolution, featured-story de-duplication, `next/image`, and removal of old homepage widgets.
- **Search:** verified SSR rendering, URL-preserved `q` / `type` / `page`, host/community resolution, per-type counts, and pagination from `/api/search`.
- **Marketplace:** verified store-based schema, real APIs, public list/detail rewiring, `PENDING` / `SOLD` visibility, seller store creation/edit/resubmission, listing lifecycle controls, listing edit/delete, and admin store approval. During rollout, local marketplace DB changes had to be applied manually after direct Postgres inspection because `prisma db push` hit a generic schema-engine failure.
- **Storefronts:** verified public storefronts at `/marketplace/stores/[id]`, listing-detail links into storefronts, trusted-or-manager-only contact details, stronger store identity, listing-mix/category context, clearer contact expectations, and stronger navigation back into the broader marketplace.
- **Admin store moderation:** verified `/admin/stores`, `/api/admin/stores`, and `/api/admin/stores/[id]/status` for search/filter, separate review, approve/reject, suspend, and reinstate-to-approved behavior.
- **Article preview flow:** verified the new shared `ArticlePreview` surface on `/local-life/submit` and `/admin/content`; authors can switch between writing and preview, and editors now review article submissions against a closer-to-published Local Life layout including hero, featured image, body, and tags.
- **Marketplace discovery:** verified direct text search across listings/store names/seller names, store-count summary cards, dedicated storefront browsing, stronger store-level summaries, and homepage marketplace metadata/storefront links.
- **Blocking:** verified `/api/users/[id]/block`, profile controls, `/api/messages`, and `/api/messages/[conversationId]`. Blocked conversations are hidden, new conversations are prevented, and thread load/send is rejected when either participant blocked the other.
- **Help Wanted polish:** verified list/detail/submit/manage/edit after the moderation-copy and status-clarity pass. These were UI/content-level improvements only.
- **Roadmap ranking:** verified ordered-ballot behavior through repo-wide type checking and the internal roadmap/ballot surface now restricted to `SUPER_ADMIN`.
- **Roadmap weighting:** verified Prisma client regeneration, repo-wide type checking, internal roadmap code paths, removal of the old public transparency card, and the native recent-change view in admin. Local DB schema application still depends on the same manual-Postgres fallback if Prisma’s schema engine fails.
- **Tooling:** canonical verification sequence is now `npm run lint`, `npm run test:unit`, `npm run typecheck`, then `npm run build`.
- **TypeScript cleanup:** `npx tsc --noEmit` now passes without prior file-level exclusions, including the rewritten auth/community/trust/audit/upload helpers and repaired settings/blocking routes.
- **Test cleanup:** stale schema-era integration/e2e/unit tests and the old `tests/helpers.ts` factory were removed rather than preserved with dead field names and mock shapes.
- **Implication:** `npx tsc --noEmit` is a repo-wide gate again. Do not reintroduce blanket exclusions to hide drift.
- **Repository bootstrap:** verified git bootstrap, GitHub remote, `README.md` rewrite, `.env.example` correction, and `src/app/api/health/route.ts`.
- **Deployment verification:** `npm run lint`, `npm run test:unit`, `npm run typecheck`, and `npm run build` all pass sequentially. CI mirrors that gate on GitHub. Production deployment is live on Vercel with Neon, Cloudflare DNS, Cloudflare R2 on `cdn.highlander.today`, MaxMind geolocation, `NEXTAUTH_URL=https://highlander.today`, and credentials + Google OAuth as the active launch auth surface. Treat deployment as complete unless new production issues surface.
- **Deployment runbook:** `README.md` now includes explicit R2 bucket/custom-domain/API-credential/Vercel-env instructions.
- **Cloudflare R2 custom-domain constraint:** if `highlander.today` is not present in the same Cloudflare account and managed through Cloudflare DNS, Cloudflare will reject an R2 public custom domain with: `That domain was not found on your account. Public bucket access supports only domains on your account and managed through Cloudflare DNS.`
- **Bootstrap admin DOB:** `scripts/set-user-dob.ts` exists to backfill DOB for a locked bootstrap admin account created before a normal profile flow. The current production super admin has already been backfilled.
- **Production DNS cutover:** `highlander.today` is now on Cloudflare-managed DNS, Vercel serves valid HTTPS on the apex domain, and `www` is configured as a secondary hostname.
- **Production uploads:** the R2 public custom domain path is live on `cdn.highlander.today`; profile-photo uploads were tested successfully. Remaining work is broader smoke testing, not core storage setup.
- **Production geolocation:** MaxMind GeoIP over HTTPS replaced the old `ip-api.com` placeholder. MaxMind credentials are in Vercel, and a production login from a Comcast IP resolved to `Patton, United States`, producing an `ANOMALY_LOGIN` audit entry.
- **Production auth runbook:** docs now reflect that production uses R2 uploads and credentials + Google OAuth on `https://highlander.today`. Facebook is treated as deferred, not launch-blocking.
- **Deployment env checker:** `scripts/check-deployment-env.ts` powers `npm run deploy:check-env`, validates `NEXTAUTH_*` and Google OAuth vars, warns on missing Facebook vars when Facebook is intentionally deferred, and warns on missing MaxMind/R2 config without printing secret values. The earlier `NEXTAUTH_URL=http://localhost:3000` issue was resolved before deployment was marked complete.
- **Google OAuth:** production Google OAuth is finalized for `https://highlander.today` with redirect URI `https://highlander.today/api/auth/callback/google`.
- **Facebook OAuth:** removed from the live auth route and public login/register UI pending Meta business verification. Missing Facebook vars are now non-blocking in docs and the deploy env checker.
- **Locked-profile update bugfix:** locked-profile photo/bio updates were repaired by submitting only editable fields and comparing actual changes rather than field presence.

## Deployment: Super Admin Seeding Plan

Production bootstrap cleanup is implemented. `prisma/seed.ts` creates structural data only. The first elevated account should be created with `scripts/create-super-admin.ts`.

### Repository Status

The project has a live GitHub remote at `https://github.com/dsjrego/highlander-today`, and `main` is pushed. GitHub is the source-control system of record for CI/CD and deployment wiring.

### Step 1: Structural Seed

`prisma/seed.ts` creates only structural data: community, categories, homepage sections, and site settings. It is safe to re-run idempotently.

### Step 2: `scripts/create-super-admin.ts`

The standalone bootstrap script:
- reads `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`
- validates both and rejects weak passwords
- hashes the password with bcrypt
- creates the user with `trustLevel: 'TRUSTED'` and `isIdentityLocked: true` when missing, or promotes an existing user while preserving name fields
- upserts `UserCommunityMembership` with `role: 'SUPER_ADMIN'`
- logs success and exits

### Step 3: Production Deployment Sequence

```bash
npm run db:push
npx prisma db seed
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

Run the bootstrap script once. After that, the Super Admin uses the admin UI to promote other users.

### Notes

- Alternative bootstrap: first user signs in via Google OAuth, then promote via script or direct DB update to avoid putting a password in env vars
- Local dev: if you want old seeded-admin convenience locally, run the explicit Super Admin script after `db seed` rather than putting credentials back into the seed
- Geolocation: keep `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY` in sync between local and hosted environments
- OAuth apps: Google is the only active third-party provider for launch; Facebook remains deferred until Meta business verification is complete
- OAuth secret status: previously exposed Google and Facebook client secrets have been rotated locally; treat current local `.env` values as newer than any previously copied values and verify hosted environments match before production auth testing

## Upload Snapshot

- Local storage: `public/uploads/{context}/`
- Active endpoint: `src/app/api/upload/route.ts`
- Active component: `src/components/shared/ImageUpload.tsx`
- Supported types: JPEG, PNG, WebP, GIF up to 5MB
- Wired flows: article featured image, TipTap inline images, profile photo, event image, marketplace images, Help Wanted images
- Legacy component: `src/components/shared/ImageUploader.tsx`
- Production storage: `/api/upload` uses `src/lib/upload.ts` for Cloudflare R2 in production and serves through `https://cdn.highlander.today`; production profile-photo uploads were verified there

## Recommended Production Infrastructure

This remains the recommended launch setup for the first public deployment. It fits the current codebase, stays within the approximate `$100/month` launch budget, and preserves portability for later multi-community expansion.

### Recommended Stack

- App hosting: Vercel
- Primary database: Neon Postgres
- Object storage / uploads: Cloudflare R2
- Domain registrar: Namecheap
- Authoritative DNS: Cloudflare DNS
- Current production domain: `highlander.today`
- Source control / CI trigger: GitHub + GitHub Actions

### Why This Is the Current Recommendation

- The app is a single Next.js 14 monolith with App Router, Prisma, and NextAuth; it does not justify container orchestration or a multi-service architecture.
- Early risk is product adoption and operational readiness, not raw infrastructure scale.
- Vercel is the most straightforward fit for the current Next.js surface.
- Neon keeps the data layer on standard PostgreSQL.
- Cloudflare R2 externalizes uploads early so hosting remains portable.
- Registrar remains Namecheap, but DNS now lives in Cloudflare; that preserves portability between domain/routing and app hosting.

### Target Launch Budget

- Aim for roughly `$35-$60/month` at low to moderate early usage, leaving room inside the `$100/month` target for domain, email, monitoring, and usage variance.
- Do not pre-buy scale. Start on the smallest production-capable paid tiers and scale only when usage justifies it.

### Upgrade-Path Principle

Optimize for portability, not premature complexity:

- keep the app as one deployable service until workload justifies splitting it
- stay on standard PostgreSQL features and avoid provider lock-in
- keep uploads externalized in R2
- keep tenant/community resolution in the app + DB rather than host-specific routing tricks
- keep CI/CD centered on GitHub Actions rather than provider-specific deployment logic

### Planned Scaling Path

1. Scale vertically first by increasing Vercel and Neon capacity.
2. Add operational hardening second: monitoring, error tracking, rate limiting, backups, transactional email, secret hygiene.
3. Add queue/worker infrastructure only when email, notifications, media processing, imports, digests, or search maintenance justify it.
4. Reassess hosting only when economics or workload demand it; the stack should remain portable to Render, Fly.io, or AWS.
5. Strengthen multi-tenant boundaries before aggressive geographic expansion; tenant isolation, moderation boundaries, search relevance, and operating process are more likely early scaling risks than raw traffic.

### Explicit Non-Goals for Launch Infrastructure

- No Kubernetes
- No microservices split
- No custom container platform unless forced by clear hosting constraints
- No premature event bus or distributed-systems architecture
- No full checkout/payments/shipping infrastructure before marketplace demand proves it

### Pre-Launch Infrastructure Checklist

- Provision production Postgres
- Configure production `DATABASE_URL`
- Configure production secrets in the hosting platform
- Before any external setup, provide explicit account-creation/setup instructions for any provider the owner has not already configured: at minimum Vercel, Neon, Cloudflare/R2, Google OAuth, Facebook OAuth, and any production geolocation provider
- Completion status: complete for the initial launch baseline
- Verified launch checks:
  1. production `NEXTAUTH_URL` and hosted auth env vars align with `https://highlander.today`
  2. credentials login plus Google OAuth are the verified active launch auth methods
  3. Facebook OAuth remains intentionally deferred until Meta business verification is complete

Production bootstrap flow:

```bash
npm run db:push
npx prisma db seed
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

### Current Recommendation Status

This is the active production recommendation unless requirements, usage, or budget materially change. Future sessions should treat it as the working deployment direction rather than reopening the hosting decision from scratch.

## Session Instructions

1. Read this file first.
2. Read only the source files relevant to the active slice.
3. Preserve current canonical paths and schema assumptions.
4. Update this file after meaningful progress so the next session can resume cleanly.
