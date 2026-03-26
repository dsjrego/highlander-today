# Highlander Today — Project Status

> **Last updated:** 2026-03-26 (session 69 — redesigned `/login` to match the live public-site styling, converted the email auth card into a tabbed `Sign In` / `Sign Up` surface, added optional DOB capture to registration, and split Google auth into its own side-by-side social card)
> **Purpose:** Full context for AI assistants to continue development. Read this file first each session.

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
- `CONTENT-ANALYTICS-PLAN.md` — first-party site/content analytics plan covering purpose, event taxonomy, reaction/usefulness signals, architecture direction, privacy guardrails, and phased rollout for understanding what content people use and value
- `DONATIONS-TRANSPARENCY-PLAN.md` — donations/transparency plan, provider recommendation, data model, rollout phases, launch recommendation
- `DIRECTORY-PLAN.md` — directory model for people and organizations, trusted-only messaging, opt-in listing rules, organization roster visibility, recommended `Organization` / `OrganizationMembership` direction
- `DESIGN-SYSTEM-ARCHITECTURE.md` — shared UI terminology, page/section/card hierarchy, component-vs-theme separation, and tenant-aware theming direction
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

Important seed note: `seed.ts` creates parent categories `Local Life` and `Experiences`, but the **actual database** currently uses `News`, `Community`, `Lifestyle`, `Opinion`, and `Announcements` with roughly 22 subcategories. All category usage in the app should be fetched dynamically from the DB; never hardcode slugs or names.

## Site Sections & Navigation

- **Local Life** (`/local-life`): article listing, detail, submit, and drafts are live. The shared navbar dropdown and the `/local-life` pill row are currently driven by the same hardcoded submenu list in `NavigationBar.tsx` rather than the old top-level DB parent categories. Current visible options/order are `Local Stores` (direct link to `/marketplace/stores`), `Our People`, `Recipes & Food`, `Gardening & Nature`, `Arts & Music`, `History & Heritage`, `Guides & How-Tos`, and `Opinion`. The `/local-life` pill row no longer shows `All`, uses the darker transparent/cyan treatment instead of the older light-gray pills, and filters article results by specific category slug when a content pill is selected. The submit page still fetches all categories and groups subcategories with `<optgroup>`.
- **Experiences** (`/experiences`): `events`, `outdoor-recreation`, `sports-activities`, `classes-workshops`, `tours-attractions`, `rentals-getaways`, `entertainment-nightlife`, `seasonal`. The landing page now uses the active `Youth Local` shell with the shared compact section header, modern filter pills, category cards, and a bridge to the live `/events` experience surface. Non-event experience categories remain directional placeholders rather than DB-backed content.
- **About**: top-level nav dropdown separate from Local Life and Experiences. Public subpages are `Mission` and `Blog` (the current route remains `/about/journal`); `/about/roadmap` now exists but is restricted to `SUPER_ADMIN`. Mission copy uses a warm first-person-plural voice grounded in Cambria Heights and the highlands of Cambria County, positioning the platform as community infrastructure and expansion as “get it right here first.”

Nav:
- `Home`
- `Local Life` (dropdown)
- `Experiences` (dropdown)
- `Market`
- `Help Wanted`
- `About`
- `Support` (Super Admin only for now)
- `Arcade` (Super Admin only)

Subcategory links use `?category=slug` query params matching `Category.slug`. Nav data is still hardcoded in `NavigationBar.tsx` and should later move to a DB-backed source. `NavigationBar` uses `useSession` to gate the `Support` dropdown and `Arcade` link for Super Admins only. Legacy `/articles` still exists for backward compatibility.

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
- **Profile:** `/api/profile` and `/api/users/[id]` are live. Edit supports first/last name, DOB, bio, and profile photo. Identity-locked users cannot change name or DOB.
- **Trust flow:** public profile vouching and admin trust actions are live. Vouching requires DOB, promotes `REGISTERED -> TRUSTED`, sets `isIdentityLocked`, and writes trust audit entries.
- **Messaging:** `/api/messages` and `/api/messages/[conversationId]` use the current schema (`ConversationParticipant`, `Message.body`, `senderUserId`, `lastReadAt`). Inbox/thread pages use real data, profile pages can open/reuse threads, the banner `Messages` pill shows unread count, and blocked pairs cannot create or continue conversations. `BannerActions.tsx` now only starts unread-count polling when the session is authenticated and `session.user.id` is present, which avoids repeated local/dev 401 noise when the client-side session state is out of sync with middleware token decoding.
- **Blocking:** `UserBlock` is enforced across profile and messaging flows. `/api/users/[id]/block` supports lookup and block/unblock; actions are activity-logged.
- **Articles / Local Life:** listing, submit, drafts, detail, category filtering, moderation, and approval are wired to real data. Canonical route family is `/local-life/*`; `/articles/*` only redirects. The Local Life page-header CTA now uses a shared `ArticleCreateAction` component: anonymous users do not see it, signed-in `REGISTERED` users see it but get an in-app trusted-user requirement dialog when they click, and `TRUSTED` / staff / editor / admin / super-admin users go straight to `/local-life/submit`.
- **Comments:** `/api/comments` and `/api/comments/[id]` use the live schema (`body`, `authorUserId`, `status`, `parentCommentId`). `/local-life/[id]` supports posting, replying, and deleting your own comments.
- **Events:** `/events`, `/events/[id]`, `/events/submit`, `/api/events`, and `/api/events/[id]` are live on the current schema. Submissions go to `PENDING_REVIEW`; staff can approve/reject them. Public events use real data and the submit page matches the current public shell.
- **Shared internal page heroes:** `src/components/shared/InternalPageHeader.tsx` is now the standard compact red-gradient page hero/section-header component for the slimmer internal/public top-of-page treatment. It now aligns with the design-system vocabulary in `DESIGN-SYSTEM-ARCHITECTURE.md`, using shared `page-header`, `page-header-inner`, `page-label`, `page-title`, and `page-actions` classes from `src/app/globals.css`. The white uppercase page-title treatment from `Local Life` is now the default shared look, so the Support pages and other routes using `InternalPageHeader` inherit the same top-bar pattern more consistently. The component still supports an optional action area, optional label, and per-page title color override. `Home`, `Local Life`, `Messages`, `My Articles`, `Roadmap` manage/submit, `Help Wanted` manage/submit, `My Stores`, `Create a Store`, `Events`, `Marketplace`, `Profile` edit, `Experiences`, and the Support routes now use this pattern.
- **Editor and uploads:** TipTap is the active article editor. HTML is sanitized server-side. Uploads work for articles, inline editor images, profile photos, events, marketplace, and Help Wanted. The active widget now uses a real label/input activation path rather than programmatic `.click()` only.
- **Homepage:** `src/app/page.tsx` + `src/lib/homepage.ts` SSR-render the homepage using `HomepageSection` / `HomepagePinnedItem`. Homepage/community resolution now routes through the shared tenant-domain helper in `src/lib/tenant.ts`, still preserving localhost fallback plus a legacy `Community.domain` fallback for existing records. The live homepage uses the `Youth Local` visual direction and now starts with the same compact `InternalPageHeader` hero style used across the rest of the public site; the empty-state explanatory copy sits in a separate card below that shared hero. Large homepage section titles such as `Featured` now use the shared `.section-display-title` class from `src/app/globals.css` so they remain visible and stylistically consistent against the darker background treatment.
- **Search:** `/search`, `/api/search`, and `src/lib/search.ts` are aligned on the current schema and tenant model. Search is SSR, query/filter/page state lives in the URL, counts are returned per content type, and result cards use `next/image`.
- **Admin area:** users, trust, bans, audit log, and content moderation are live. User deletion is Super Admin only and logged before cascade delete.
- **Marketplace / stores:** store-based marketplace schema is live (`Store`, `StoreMember`, store-owned `MarketplaceListing`, listing types for products/food/services). Real APIs and pages are live for marketplace and stores. Buyers can browse anonymously; trusted users can message sellers. `/marketplace` supports text search across listings and stores plus dedicated store discovery. Listing states `ACTIVE`, `PENDING`, and `SOLD` are visible. Approved stores have public storefronts at `/marketplace/stores/[id]`. Listing detail links into storefronts. Seller contact on storefront/detail views is gated to trusted users or store managers. Sellers can create and manage stores and store-owned listings from `/marketplace/stores`; admin store moderation lives at `/admin/stores` with approve/reject/suspend/reinstate flows. Shared `/admin/content` now focuses on articles/events. Public marketplace create/edit/detail pages use the `Youth Local` shell instead of the old white-panel treatment.
- **Directory planning:** `DIRECTORY-PLAN.md` exists. Current direction: people listings are opt-in, expose no phone/address, route contact through internal messaging only, restrict message initiation to `TRUSTED` users, omit organization memberships from user directory entries, and let organizations choose whether to publish selected members. The intended long-term model is a first-class `Organization` + `OrganizationMembership` foundation, separate from `Store`, so the same organization record can power directory presence, accountability, public roster controls, and potential paid subdomain/microsite routing.
- **Help Wanted:** `HelpWantedPost` and related enums are in the Prisma schema. `/api/help-wanted`, `/api/help-wanted/[id]`, and `/api/help-wanted/[id]/approve` support public browsing, trusted-user create/edit/delete, lifecycle transitions, moderation, and activity logging. Public pages are live at `/help-wanted`, `/help-wanted/[id]`, and `/help-wanted/submit`; trusted authors also have `/help-wanted/manage` and `/help-wanted/[id]/edit`. Responses use platform messaging. Uploads have a dedicated `help-wanted` context. Public Help Wanted surfaces share the darker refreshed public design system.
- **Help Wanted polish:** list/detail/submit/edit/manage pages now explain moderation, on-platform contact rules, response behavior, and lifecycle states more clearly.
- **Community roadmap:** `RoadmapIdea`, `RoadmapRankingBallot`, and `RoadmapRankingItem` are in the schema, with roadmap-specific permissions and activity-log resource types. `/api/roadmap`, `/api/roadmap/[id]`, `/api/roadmap/[id]/moderate`, and `/api/roadmap/ballot` still implement submission/edit/delete/resubmit, moderation/merge, ordered top-five ballot saving, and leaderboard aggregation, but the roadmap feature is now middleware-gated to `SUPER_ADMIN` only. Route families `/roadmap`, `/roadmap/[id]`, `/roadmap/submit`, `/roadmap/manage`, `/about/roadmap`, and `/admin/roadmap` are no longer exposed to non-super-admin users.
- **Roadmap weighting foundation:** `DomainInfluenceWeight` and `InfluenceDomain` are in the schema. The first live domain is `ROADMAP_FEATURE_PRIORITIZATION`. `/api/admin/roadmap/weights` lets Super Admins set bounded roadmap-only multipliers with required rationale; changes are logged as `DOMAIN_INFLUENCE_WEIGHT`.
- **Roadmap weighting transparency:** the old public `/roadmap` transparency card has been removed. The admin roadmap page still shows recent roadmap-weight changes from `ActivityLog`, and `/api/admin/activity-logs` recognizes `ROADMAP_IDEA`, `ROADMAP_RANKING_BALLOT`, and `DOMAIN_INFLUENCE_WEIGHT`.
- **Verification baseline:** ESLint is configured; `npm run lint` passes with warnings; `npm run test:unit` is green on the current suite (`permissions`, `trust-cascade`, `marketplace-status`); `npm run typecheck` passes repo-wide again; `npm run build` succeeds; CI mirrors `lint`, `test:unit`, `typecheck`, and `build` on PRs and pushes to `main`.
- **Cleanup baseline:** stale helper/route surfaces (`src/lib/auth.ts`, `src/lib/audit.ts`, `src/lib/community.ts`, `src/lib/trust.ts`, `src/lib/upload.ts`, `/api/settings`, `/api/users/[id]/block`) were rewritten to the current schema/session model; stale schema-era tests were removed rather than kept behind exclusions.
- **Register flow:** `/register` again has a live `/api/auth/register` route; credentials sign-up now creates a `REGISTERED` user plus default community membership. `/api/auth/register` now also accepts an optional `dateOfBirth` and stores it on the user record when provided, which lets the combined `/login` sign-up tab collect DOB up front while still treating it as optional at registration time.
- **Homepage curation:** `/admin/homepage` and `/api/homepage/sections` are the active curation surface. Types are shared with `src/lib/homepage.ts`, and marketplace homepage cards now use store-based metadata. A live production issue where `/admin/homepage` rendered only the static title/description/save button was traced to a blank production `communities.domain`; this was fixed by setting the production domain and is one of the reasons the new tenant-domain foundation now exists.
- **Navigation / design:** the public design system is live, nav dropdowns work, `Arcade` is Super Admin only, the new `Support` dropdown is also Super Admin only for now, the roadmap links in the About dropdown/footer are now also Super Admin only, the Experiences dropdown links directly to `/events`, `/events` shows a `Submit Event` CTA for signed-in users, `/admin/stores` is labeled `Store Moderation`, the `About` dropdown is live, and the shared public shell uses the `Youth Local` direction. The root layout in `src/app/layout.tsx` now uses a darker canvas, full-width gradient masthead, embedded nav pills, utility pills in the upper-right, a reduced-size wordmark, the uppercase `Community platform` eyebrow, and a tuned inline SVG `HT` shield mark. The logged-out auth utility pill in the live header now says `Sign In/Up` while still linking to `/login`. Masthead spacing is tighter (`p-3`, reduced nav gap, removed explicit `margin-bottom: 10px` on the live public `<nav>`). The navbar dropdown regression was fixed by changing the masthead from `overflow-hidden` to `overflow-visible`, giving the header its own higher stacking context, removing the old horizontal scroll wrapper from `NavigationBar.tsx`, and letting the nav pills wrap so full submenu panels can render instead of clipping after the first rows. The dropdown title pills for `Local Life`, `Experiences`, `About`, and `Support` now also act as direct links to their landing pages; the separate `View All ...` submenu row was removed, and the chevron button remains the explicit click target for opening and closing each submenu. The `Local Life` dropdown itself has now been manually reordered/reworded to `Local Stores`, `Our People`, `Recipes & Food`, `Gardening & Nature`, `Arts & Music`, `History & Heritage`, `Guides & How-Tos`, and `Opinion`; `Local Stores` is a direct link to `/marketplace/stores` while the remaining items still use `?category=slug`. The live footer in `src/app/layout.tsx` is now the active footer surface, uses the same gradient family as the masthead so it reads as a distinct app-footer region, centers its three columns, labels them `Support`, `Quick Links`, and `Highlander Today`, and pulls the `Support` and `Highlander Today` link lists from shared `SUPPORT_NAV_ITEMS` and role-filtered About nav data so footer and navbar labels stay in sync. A slimmer shared page-hero/header treatment now exists through `src/components/shared/InternalPageHeader.tsx`, replacing several older underlined or oversized gradient headers with a compact section-label-plus-actions pattern and a slightly larger uppercase title label. The live `/login` page now matches the public-site visual language more closely: the old standalone auth card/header treatment was removed, Google auth sits in a left-hand social card, and the right-hand email-auth card uses tabbed `Sign In` / `Sign Up` states with inline registration, optional DOB guidance, and password visibility toggles. Large display-style section headings across the public site now also share a reusable `.section-display-title` class from `src/app/globals.css`, using a branded cyan-to-rose gradient treatment instead of plain black/white text for better contrast on mixed light and dark panels. `NavigationBar.tsx`, `BannerActions.tsx`, `layout.tsx`, and `ArticleCreateAction.tsx` are the active shared files for this surface. Old `Footer.tsx` and `Navigation.tsx` remain unused. The shared `.container` utility still includes `margin-top: 10px`.
- **Design system architecture:** `DESIGN-SYSTEM-ARCHITECTURE.md` is now the canonical naming/theming reference for shared UI work. Preferred hierarchy is `masthead -> page -> page-header -> page-body -> page-footer -> app-footer`, with parallel `section-*` and `card-*` vocabulary. `header` means a structural region, while `label` means an eyebrow/kicker text element inside that region. For multi-tenancy, component structure should stay reusable while visual branding increasingly moves toward semantic classes plus theme tokens rather than hardcoded per-component styling.
- **Layout consistency:** the root layout provides a small global gap between the red navbar and page content, the custom `.container` rule in `src/app/globals.css` now centers horizontally without zeroing vertical margins, no longer applies a shared max-width cap, and uses `2rem` horizontal padding so public pages can span the viewport without touching the screen edge. Public pages that had extra outer `max-w-* mx-auto` wrappers were widened to use the shared content width more consistently.
- **Admin layout:** `src/app/admin/layout.tsx` intentionally breaks out of the shared public container and uses full viewport width. The sidebar was softened from near-black to a lighter slate treatment. It now also includes a `Sites` link, and `/admin/sites` lists current communities plus their tenant-domain records so Super Admins can inspect the current site/domain mapping from inside the app.
- **About baseline:** `/about`, `/about/mission`, and `/about/journal` are public; `/about/roadmap` remains live but is now restricted to `SUPER_ADMIN`. Navigation now labels `/about/journal` as `Blog`. Mission copy is now warmer and more specific; pillar cards, nav descriptions, and journal entry summaries match that tone. Content still lives in `src/lib/about.ts` and page JSX; there is no CMS/data model yet. About pages use the active `Youth Local` language. Shared card vocabulary for these institutional pages now lives in `src/app/globals.css`: use `card` for the container, `card-label` for the eyebrow/section label, `card-title` for the main card headline, and `card-body` for the white body copy. `card-label` and `card-title` now render as separate block rows so the label stays visually distinct from the title. Standard title-size variants now also exist as `card-title-hero`, `card-title-lg`, `card-title-md`, and `card-title-sm`. The older `empty-state-title` class remains available and now shares the same headline treatment as `card-title`; `empty-slate-title` is also aliased for compatibility.
- **Content analytics planning:** `CONTENT-ANALYTICS-PLAN.md` now defines the intended first-party analytics/reaction-intelligence direction: shared event taxonomy, content-type-aware metrics, usefulness/reaction signals, privacy guardrails, raw-event plus rollup architecture, and phased rollout toward internal editorial/product reporting.
- **Support baseline:** `/support`, `/support/faq`, `/support/how-to`, `/support/report-a-problem`, and `/support/contact-us` now exist as placeholder pages. Their top-of-page headers now inherit the same shared `InternalPageHeader` treatment used by `Local Life` and the rest of the public shell instead of drifting visually from the standard page-header pattern. The `Support` navbar dropdown is visible only to Super Admins for now via nav-level gating in `NavigationBar.tsx`; the routes themselves are not additionally access-restricted yet.
- **Security logging:** login events and immutable activity logs are live, including admin endpoints for investigation/export.
- **Repository / deployment baseline:** git is live, `main` is pushed to `https://github.com/dsjrego/highlander-today`, `README.md` reflects the current product surface, `.env.example` uses Docker Postgres on `127.0.0.1:5433`, and `src/app/api/health/route.ts` now exists for Docker `HEALTHCHECK`. The repo still has no checked-in `prisma/migrations/` directory; schema rollout is currently `prisma db push` style rather than migration-file driven.
- **Production environment:** production domain is `https://highlander.today`; registrar remains Namecheap; authoritative DNS is now Cloudflare; hosting is Vercel. Cloudflare R2 uploads are live on `https://cdn.highlander.today`. MaxMind login geolocation is live in production. Active launch auth providers are credentials plus Google OAuth. Facebook OAuth is intentionally deferred until Meta business verification is complete. `npm run deploy:check-env` now validates deploy-critical env vars. Locked-profile photo/bio updates were fixed by submitting only editable fields and comparing actual changes rather than field presence. Production `communities.domain` was blank during session 65 and caused `/admin/homepage` to render without section controls; setting it to `highlander.today` immediately fixed the issue.
- **Tenant-domain foundation (phase 1):** `TenantDomain` and `TenantDomainStatus` now exist in `prisma/schema.prisma`; `src/lib/tenant.ts` centralizes normalized host/domain resolution with `tenant_domains` first, `Community.domain` as a legacy fallback, and localhost fallback for development. `src/lib/community.ts` now creates/upserts a primary tenant-domain record when a community is created and also ensures baseline site settings. `prisma/seed.ts` accepts `PRIMARY_COMMUNITY_DOMAIN` to seed a primary domain record. `scripts/backfill-tenant-domains.ts` plus `npm run db:backfill-tenant-domains` exist to backfill `tenant_domains` rows from legacy `Community.domain` data after `npm run db:push`.

### Placeholder

- Admin dashboard
- Experiences landing page
- Arcade landing page

### Partial

- Admin categories CRUD and settings persistence cleanup
- Messaging attachments UI/data model
- Help Wanted MVP is functionally complete; remaining work is launch validation with real usage plus targeted refinements
- Multi-tenant admin provisioning is only phase 1: tenant-domain resolution and inspection exist, but there is not yet a full Super Admin create/edit flow for provisioning new sites/domains from the UI
- Cross-site multi-tenant “sister site” pull-through is not implemented; homepage/content selection is currently per-domain/per-community only
- Donations/transparency has a planning doc but no schema, routes, admin tooling, provider integration, or public pages yet
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
8. **After schema changes:** run `npm run db:generate`, then `npm run db:push`, then restart the dev server. If Prisma client looks stale, clear `.next`.
9. **Profile flow:** view = `src/app/profile/[id]/page.tsx`; edit = `src/app/profile/edit/page.tsx`; profile helpers include `VouchSection.tsx`, `EditProfileButton.tsx`, and `SendMessageButton.tsx`.
10. **Identity lock:** once vouched, `isIdentityLocked = true` and name/DOB become permanently read-only. DOB must exist before vouching.
11. **Messaging canonical schema:** use `ConversationParticipant`, `Message.body`, `Message.senderUserId`, and `ConversationParticipant.lastReadAt`. Do not use old fields like `conversation.userId`, `recipientId`, `updatedAt`, `message.content`, `senderId`, or user `name`/`avatar`.
12. **Messaging limitations:** active messaging is text-only. Attachments exist in schema/legacy UI but are not wired in the live routes/pages. Blocking is enforced for create/list/detail/send, but there is no dedicated blocked-users management page yet.
13. **Messaging schema gotcha:** if Prisma throws `P2022` for `conversation_participants.lastReadAt`, the local DB is behind the schema. In this repo, `prisma db push` once failed with a generic schema-engine error; the fix was:

```sql
ALTER TABLE "conversation_participants"
ADD COLUMN "lastReadAt" TIMESTAMP NOT NULL DEFAULT NOW();
```

14. **Articles canonical path:** build article behavior under `/local-life/*`, not `/articles/*`.
15. **Categories source of truth:** the live DB category tree does not match `seed.ts`. Always fetch categories dynamically from `/api/categories`.
16. **Uploads:** `/api/upload` uses middleware auth headers. Development writes to local disk; production uses Cloudflare R2 when env vars are configured. `ImageUpload.tsx` is active; `ImageUploader.tsx` is legacy.
17. **Supported upload formats:** JPEG, PNG, WebP, and GIF only, up to 5MB. HEIC/HEIF is unsupported, so iPhone photos may need conversion.
18. **Article video support:** TipTap currently does not support video embeds or uploaded video files. Safe YouTube/Vimeo embeds are the next planned editor enhancement and should land before Milestone 5 / Delivery Jobs. Native video upload remains out of scope.
19. **TipTap versions:** keep any added TipTap extensions on v2.x.
20. **No `@@fulltext`:** Postgres full-text search is implemented manually in `src/lib/search.ts`.
21. **R2 status:** production upload storage is live on `cdn.highlander.today`; local dev still uses filesystem storage. For any new environment, you still need real bucket credentials, public URL config, and matching env vars.
22. **Removed sections:** Classifieds and Galleries were removed. Do not re-add them.
23. **Homepage tenant resolution:** use `host` / `x-community-domain` or `x-community-id`. `localhost` and `127.0.0.1` intentionally fall back to the first community because the seed does not set `Community.domain`.
24. **Homepage de-duplication:** `FEATURED_ARTICLES` must not repeat inside `LATEST_NEWS` on the same render.
25. **Verification caveat:** `lint`, `test:unit`, `typecheck`, and `build` passing means the checked-in surface is back under coverage; it does not mean every file is equally production-ready.
26. **Legacy cleanup rule:** do not reintroduce blanket TypeScript exclusions. If a stale scaffold file becomes active again, rewrite it to the live schema/session model or delete it.
27. **Marketplace direction:** marketplace is store-based, not direct user-owned classifieds. Users can own multiple stores. Stores require admin approval to become public. Listings belong to stores, even if temporary compatibility fields still exist.
28. **Marketplace MVP scope:** initial listing types are products, grocery/artisan food, and services. Experiences may join later.
29. **Marketplace buyer access:** browsing is public, but seller messaging requires `TRUSTED` status.
30. **Container override gotcha:** the repo defines a custom `.container` in `src/app/globals.css`. Do not use `margin: 0 auto;` unless you intentionally want to wipe vertical margins everywhere. The correct shared behavior is horizontal centering only, with `margin-top: 10px`, no shared max-width cap, and `2rem` horizontal padding.
31. **Marketplace boundaries:** do not turn the first marketplace build into full checkout. Payments, shipping, inventory, retailer integrations, and back-office tooling are later work, but schema/route design should leave room for them.
32. **Delivery direction:** delivery should be a shared platform capability, not marketplace-only. It should support standalone jobs with fee, pickup, destination, requested timing, and job details.
33. **Delivery assignment modes:** support open/public claimable jobs, invite-only jobs, and direct-dispatch jobs.
34. **Delivery architecture:** delivery should remain its own domain, with APIs that marketplace, restaurant ordering, or external merchant systems can hook into later. Do not bake delivery logic directly into marketplace listings.
35. **Food scope:** marketplace food support means grocery-style and artisan/craft food listings, not restaurant delivery. Restaurant ordering is a separate future system that may reuse the delivery network.
36. **Community roadmap direction:** the roadmap system still exists in the schema and app, but it is now an internal `SUPER_ADMIN`-only workflow rather than a public trusted-user input loop.
37. **Domain-specific weighting:** influence weighting must stay domain-specific and non-global, so a user can have higher signal in one domain and neutral/lower signal in another.
38. **Rollout philosophy:** introduce features at a pace the community can absorb. Build forward-compatible foundations when useful, but keep UI exposure hidden/gated/light until momentum justifies it.
39. **Scope-control rule:** prioritize complete user loops over abstract categories. Example: store creation -> admin approval -> listing creation -> public discovery -> trusted buyer messaging -> seller marks pending/sold.
40. **Platform sequencing:** intended order remains `(1) trust/content/community identity`, `(2) store-based listings/discovery`, `(3) Help Wanted`, `(4) community feature prioritization`, `(5) domain-specific weighting/reputation`, `(6) analytics/reaction intelligence`, `(7) organization/directory foundation`, `(8) delivery/jobs`, `(9) transaction infrastructure such as payments, inventory, shipping, merchant APIs`. Milestones 1-4 are complete for the current MVP loops.
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
6. **Milestone 6 — Organization foundation + directory/org-site MVP:** add a first-class `Organization` model and `OrganizationMembership` join model, explicitly separate from `Store`. This foundation should power the organizations side of the planned white-pages/yellow-pages-style directory, support accountable trusted ownership/management, organization-level public roster controls, and leave room for paid host/subdomain routing such as `flavortown.highlander.today` without treating marketplace stores as the general organization abstraction.
7. **Milestone 7 — Article video embeds MVP:** safe YouTube/Vimeo embeds inside TipTap without expanding into native video upload/storage.
8. **Milestone 8 — Delivery jobs MVP:** requester posts a delivery job, eligible drivers can browse/receive it based on assignment mode, one driver can claim/accept it, and the job moves through basic completion states.
9. **Milestone 9 — Decide next bottleneck:** only after milestones 1-8 are stable should the next expansion lane be chosen among payments, restaurant ordering, merchant tooling, or broader integrations.

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
13. First-class organizations / directory foundation: pending. Use a dedicated `Organization` + `OrganizationMembership` model rather than widening `Store`; this same foundation should serve directory listings, membership/accountability, and future paid org subdomain routing.

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
10. Article video embeds: prioritize before Delivery Jobs / Milestone 6

### Phase 4: Polish & Production

1. Error handling, loading states, mobile responsiveness, SEO metadata
2. Dark mode: define an intentional dark theme, support user-selectable preference, and verify readability across banner/nav/cards/forms/editor/admin
3. Rate limiting, email notifications, tests, and ongoing production hardening
4. OAuth is live in production as credentials + Google; Facebook remains deferred
5. Future commerce expansion: payments/checkout, inventory and shipping, merchant APIs, larger retailer integrations, richer shared delivery dispatch/claim/fulfillment, organization-level dispatch and contracted-driver workflows, and separate restaurant menu/ordering/delivery

## Verification Notes

- **Events:** traced end-to-end through creation, moderation, public listing, detail view, and navigation surfacing. The old scaffold-era event API route was replaced with the current schema fields (`submittedByUserId`, `startDatetime`, `endDatetime`, `locationText`, `photoUrl`, `costText`, `contactInfo`).
- **Uploads:** `ImageUpload` was strengthened after event testing, and supported file types were clarified. If uploads fail, first confirm JPEG/PNG/WebP/GIF under 5MB.
- **Homepage:** verified domain-aware community resolution, featured-story de-duplication, `next/image`, and removal of old homepage widgets.
- **Search:** verified SSR rendering, URL-preserved `q` / `type` / `page`, host/community resolution, per-type counts, and pagination from `/api/search`.
- **Marketplace:** verified store-based schema, real APIs, public list/detail rewiring, `PENDING` / `SOLD` visibility, seller store creation/edit/resubmission, listing lifecycle controls, listing edit/delete, and admin store approval. During rollout, local marketplace DB changes had to be applied manually after direct Postgres inspection because `prisma db push` hit a generic schema-engine failure.
- **Storefronts:** verified public storefronts at `/marketplace/stores/[id]`, listing-detail links into storefronts, trusted-or-manager-only contact details, stronger store identity, listing-mix/category context, clearer contact expectations, and stronger navigation back into the broader marketplace.
- **Admin store moderation:** verified `/admin/stores`, `/api/admin/stores`, and `/api/admin/stores/[id]/status` for search/filter, separate review, approve/reject, suspend, and reinstate-to-approved behavior.
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
