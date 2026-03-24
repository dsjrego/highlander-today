# Highlander Today — Project Status

> **Last updated:** 2026-03-24 (session 45 — removed Facebook from the active launch auth surface because Meta business verification is still pending, kept credentials plus Google as the production-ready login methods, and updated the deployment runbook/status to treat Facebook as deferred work)
> **Purpose:** Full context for AI assistants to continue development. Read this file first each session.

---

## Overview

Multi-tenant community platform for Cambria Heights, PA — local content, events, a store-based market/ecommerce platform, help wanted (services/jobs postings), a reusable delivery/job marketplace, and private messaging with a trust-based membership model (members vouch for new members; revocation cascades via BFS).

Full spec: `highlander-today-spec.md` (~1143 lines). Key concepts: trust levels (ANONYMOUS → REGISTERED → TRUSTED → SUSPENDED), roles (Reader → Contributor → Staff Writer → Editor → Admin → Super Admin), identity lock (DOB entry permanently locks name+DOB after vouching), red badge (untrusted), orange badge (suspended), multi-tenant by domain/slug. Brand colors: Primary `#46A8CC`, Accent `#A51E30`.

Supporting planning docs:
- `DONATIONS-TRANSPARENCY-PLAN.md` — proposed funding/transparency feature plan, provider recommendation, data model, rollout phases, and launch recommendation
- `DIRECTORY-PLAN.md` — proposed directory model for individuals and organizations, including trusted-only messaging, user opt-in listing rules, organization roster visibility, and the recommended `Organization` / `OrganizationMembership` direction
- `QUALIFIED-INTEREST-MARKETPLACE-PLAN.md` — proposed buyer-initiated offer / lead marketplace model where residents control access to their attention, businesses pay for qualified engagement, compensation flows primarily to the resident, and the platform acts as accountable market infrastructure rather than a traditional ad surface

---

---

## Product Philosophy

This system is a local community communication and coordination platform. It is intended to replace fragmented tools such as local newspapers, Facebook groups, classifieds, and informal word of mouth.

The goal is to become the default place a resident checks to answer everyday questions:

- what is happening locally  
- where can I get something  
- who can help me  
- how can I participate  

The platform should feel like an extension of the community itself. It is not an external service layered on top of the town, but a shared system that reflects and supports it.

---

## Core Principles

1. Local First  
   Every feature must prioritize relevance to the local community. Cross community functionality is secondary to strong local engagement.

2. Identity and Accountability  
   All users are real, vouched for individuals. The system is built on persistent identity and visible accountability.

3. Activity Over Features  
   The success of the platform is measured by real user interactions, not feature count. Features that do not drive interaction should be deprioritized.

4. Daily Usefulness  
   The platform must provide clear reasons for users to return regularly. Content, events, and visible activity are required to create habit.

5. Complete Interaction Loops  
   Development should focus on completing full user loops end to end rather than partially implementing multiple systems.

6. Community Value Creation  
   The platform must contribute value back to the community. It should feel like shared infrastructure, not an extractive service.

---

## Primary User Loops

The platform should prioritize and validate the following loops:

1. Information Loop  
   User checks platform → sees local content or events → gains awareness → returns later

2. Interaction Loop  
   User discovers content or listing → interacts (comment or message) → receives response → continues engagement

3. Transaction Loop  
   User creates listing → listing is discovered → trusted user initiates contact → agreement is reached → listing is marked complete

4. Participation Loop  
   User participates in a local event or activity → sees related platform activity → engages with others → builds recognition and trust

No new major feature should be introduced unless it clearly strengthens at least one of these loops.

---

## Launch Strategy Constraints

1. Community Density Before Expansion  
   A new community should only be added after the current community demonstrates repeat engagement and successful interaction loops.

2. Visible Activity Requirement  
   The platform must show clear signs of real use (posts, listings, interactions) before broader promotion.

3. Seed With Real Users  
   Initial content and activity should prioritize real, identifiable local users over synthetic or anonymous seeding.

4. Local Identity Over Network Effects  
   Early stage success depends on strong local identity, not cross community scale.

5. Staged Feature Exposure  
   The platform may build and validate capabilities before exposing them broadly in the UI. Features can remain hidden or tightly gated until community momentum is strong enough that rollout is likely to produce real adoption instead of confusion or clutter.

---

## Trust System Intent

The trust system exists to:

- ensure all users are real and accountable  
- enable reputation to accumulate over time  
- reduce spam, fraud, and low quality interactions  

The trust system is foundational but not sufficient on its own. It must be reinforced by visible activity, repeated interactions, and local recognition.

---

## Non Goals (Early Stages)

- Building a full ecommerce platform with payments, shipping, and inventory management  
- Maximizing listing volume at the expense of quality and interaction  
- Expanding to multiple communities before validating engagement in the first  
- Competing directly on scale with large platforms  

The focus is depth of engagement in a single community before breadth.

---

## Tech Stack

Next.js 14 (App Router) + TypeScript, PostgreSQL 16 (Docker, port **5433**), Prisma ORM, NextAuth.js v4 (CredentialsProvider + GoogleProvider + JWT — **NO PrismaAdapter**), Tailwind CSS + @tailwindcss/typography, TipTap editor (wired — rich text for articles), isomorphic-dompurify (server-side HTML sanitization), Cloudflare R2 (production upload path configured via custom domain), Sharp, PostgreSQL tsvector search, Jest + RTL, D3.js.

---

## Local Dev Setup

```bash
docker-compose up -d && npm run db:push && npx prisma db seed && npm run dev
```

### .env
```
DATABASE_URL=postgresql://<db-user>:<db-password>@127.0.0.1:5433/highlander_today?connect_timeout=10&sslmode=disable
NEXTAUTH_SECRET="<set-in-.env>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<your-google-client-id>"
GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
FACEBOOK_CLIENT_ID="<your-facebook-app-id>"
FACEBOOK_CLIENT_SECRET="<your-facebook-app-secret>"
```

### Seed Data
Community "Highlander Today" (slug: `highlander-today`), 4 homepage sections, default site settings. Create the initial Super Admin explicitly with `SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin`. **Note:** `seed.ts` creates categories with parents "Local Life" and "Experiences", but the **actual database** has different parents: News, Community, Lifestyle, Opinion, Announcements (with ~22 subcategories). All category references in the app are now fetched dynamically from the DB — never hardcode category slugs or names.

---

## Site Sections & Navigation

Two main content sections with dropdown nav menus (`NavigationBar.tsx` client component):

**Local Life** (`/local-life`): Categories fetched dynamically from DB. Current DB parents: News, Community, Lifestyle, Opinion, Announcements — each with subcategories (e.g. News → Local Government, Public Safety, Schools & Education, Business, Health, Environment, Transportation & Infrastructure). The `/local-life` listing page fetches parent categories from `/api/categories?top=true` for filter pills. The submit page fetches all categories and groups subcategories by parent using `<optgroup>`.

**Experiences** (`/experiences`): `events`, `outdoor-recreation`, `sports-activities`, `classes-workshops`, `tours-attractions`, `rentals-getaways`, `entertainment-nightlife`, `seasonal` (placeholder — not yet wired)

**About** (planned top-level nav dropdown): intended institutional/platform section, separate from Local Life and Experiences. Current agreed subpages are `Mission`, `Roadmap`, and `Blog`/`Journal`. This area should explain who Highlander Today is, how the organization thinks about technology as essential infrastructure, what it is building, and how that thinking evolves over time. Future public pages such as `Transparency` and `Support` may eventually live under this umbrella as well.

Nav: Home, Local Life (dropdown), Experiences (dropdown), Market, Help Wanted, About (planned), Arcade (Super Admin only). Subcategory links use `?category=slug` query params matching `Category.slug` in DB. Nav data hardcoded in `NavigationBar.tsx` — swap to DB fetch when wiring real data. NavigationBar uses `useSession` to check role and conditionally render the Arcade link. Old `/articles` route exists for backwards compatibility.

---

## Project Structure

```
prisma/
  schema.prisma          # 25+ models
  seed.ts                # Structural seed: community, categories, homepage, site settings
src/app/
  api/                   # 40+ API route files (real Prisma queries + auth)
  admin/                 # 9 admin pages
  (auth)/                # login, register, complete-trust
  articles/              # list, detail, submit (legacy "News" route)
  local-life/            # listing, submit, drafts, [id] detail (wired to DB)
  experiences/           # section landing page (placeholder)
  events/                # list, submit
  marketplace/           # list, create, stores, [id] detail (store-based commerce)
  help-wanted/           # list, detail, submit, manage, edit (wired to DB)
  roadmap/               # list, detail, submit, manage, ballot ranking (wired to DB)
  arcade/                # placeholder (Super Admin only, linked from nav)
  messages/              # list, conversation detail
  search/                # search page
  profile/               # view ([id]/page.tsx), edit, VouchSection, EditProfileButton, redirect
  layout.tsx             # Root layout: masthead, NavigationBar, footer
  page.tsx               # Homepage
src/components/
  admin/                 # UserTable, AuditLogTable, ApprovalQueue, etc.
  articles/              # ArticleCard, ArticleEditor, CommentThread
  events/                # EventCard, EventForm, CalendarView
  layout/                # NavigationBar (active), BannerActions (active), Navigation.tsx & Footer.tsx (unused)
  marketplace/           # ListingCard, ListingForm
  messaging/             # ConversationList, MessageThread
  shared/                # Pagination, ImageUploader, SearchBar, DOBEntryModal
  trust/                 # TrustBadge, VouchButton, VouchConfirmModal, VouchingGraph
  Providers.tsx          # Client wrapper for SessionProvider
src/lib/
  db.ts                  # Prisma singleton — NAMED export: { db }
  auth.ts                # NextAuth helpers (NOT the active config — see gotcha #7)
  permissions.ts         # Role-based matrix + checkPermission shim + DELETE_USER action
  trust.ts               # Vouching chain logic, BFS cascade
  audit.ts, login-events.ts, activity-log.ts, upload.ts, search.ts, homepage.ts, community.ts, constants.ts
```

---

## Current Status

### Product Direction
- **Core thesis:** The product is intended to become trusted local coordination infrastructure for underserved communities and businesses, not a generic attempt to combine Amazon, DoorDash, Shopify, Craigslist, and social media into one undifferentiated app.
- **Modern local-newspaper framing:** The strategic model is closer to what a serious local newspaper or civic business hub should have evolved into online: local content, local trust, local discovery, local commerce, and eventually local fulfillment.
- **Primary moat:** The differentiated layer is not listings by themselves; it is the combination of community identity, trust, moderation, and local discoverability.
- **Execution risk:** The product vision is coherent, but the main danger is scope explosion and stale scaffold code in active slices. Future work must be sequenced into complete user loops, not spread horizontally across many half-built systems.
- **Founding community as home base:** The company is intended to remain rooted in the founding community, with the first community serving as both the initial operating focus and the long-term home base.
- **Expansion model:** Additional communities may eventually be added as tenants, but multi-community growth should reinforce the strength, credibility, and economic value of the home community rather than dilute focus from it.
- **Local infrastructure framing:** The platform should be treated as local digital infrastructure first: a daily-use utility for residents, organizations, and businesses, not just a bundle of features.
- **Community development intent:** Broad adoption in the first community matters not only for product validation, but because the company itself is intended to contribute durable local value and potentially meaningful employment over time.
- **Credibility requirement:** Broader economic and expansion claims only become credible if the product first proves dense local adoption, visible activity, and repeat interaction loops in the initial community.
- **Help Wanted framing:** Help Wanted should function as a trusted local opportunity board covering standard employment listings, service/help requests, and short-term gigs/tasks, while keeping all interaction inside the platform trust and messaging system.
- **Funding transparency direction:** If/when the platform solicits donations or later earns service revenue from other communities, the product should expose public aggregate funding/expenditure reporting so the platform can be understood as accountable local infrastructure rather than an opaque service.
- **Fund framing:** The current proposed public buckets are Community Support, Growth Fund, and Team Support, with allocations controlled by a policy record rather than hardcoded product copy so percentages can evolve without corrupting historical records.
- **Provider recommendation:** Stripe is the current recommended third-party provider for donations because it best supports first-party transparency pages, future webhook automation, and eventual non-donation revenue flows; Givebutter is the closest fallback if speed of donation-specific launch outweighs long-term architectural fit, while GoFundMe is not the preferred foundation for this product.
- **Launch posture for donations:** Donation support is considered strategically useful but is not a hard launch requirement; the current recommendation is to introduce fundraising only once the home community can already see clear value, visible activity, and a basic transparency surface.
- **Public institutional voice direction:** The platform should eventually expose a first-class `About` area with stable mission/philosophy content, a public roadmap, and an evolving blog/journal so Highlander Today can explain both what it is building and the organizational worldview behind it.
- **Technology-as-infrastructure philosophy:** A core emerging mission view is that important communication, coordination, discovery, and market-access technology increasingly functions like necessary infrastructure. The product should therefore aim for broad usefulness, accountable operation, transparent economics, and non-extractive stewardship rather than treating access alone as the thing to monetize.
- **Near-term feature direction:** After current deployment-readiness priorities are completed, the next new feature area should be the public `About` section rather than another marketplace/community workflow. That work should cover the main-nav `About` entry plus initial `Mission`, `Roadmap`, and `Blog`/`Journal` pages.

### WORKING
- **Core platform:** Auth, seeded DB, Prisma models, permissions/trust/audit libs, and the main API surface are live.
- **User profile:** `/api/profile` and `/api/users/[id]` are live. Profile edit supports first/last name, DOB, bio, and profile photo. Identity-locked users cannot change name or DOB after trust verification.
- **Trust flow:** Public profile vouching and admin trust actions are wired. Vouching requires DOB on file, promotes `REGISTERED -> TRUSTED`, sets `isIdentityLocked`, and writes trust audit entries.
- **Messaging:** `/api/messages` and `/api/messages/[conversationId]` are live on the current Prisma schema (`ConversationParticipant`, `Message.body`, `senderUserId`). Inbox/thread pages fetch real data, profile pages can open or reuse a conversation, the banner `Messages` link shows a live unread badge using `ConversationParticipant.lastReadAt`, and blocked user pairs can no longer create new conversations, view blocked conversation threads, or continue sending messages through old threads.
- **User blocking:** `UserBlock` is now enforced in the active app surface. `/api/users/[id]/block` supports status lookup plus block/unblock actions, profile pages expose block/unblock controls for non-staff users, block/unblock actions are activity-logged, and blocked relationships disable direct messaging in both profile and inbox/thread flows.
- **Articles / Local Life:** Local Life listing, submit, drafts, detail, category filtering, moderation, and approval flow are wired to real data. The canonical article route family is `/local-life/*`. Legacy `/articles/*` routes now redirect into the canonical flow instead of serving separate mock pages.
- **Comments:** `/api/comments` and `/api/comments/[id]` now use the live Prisma comment schema (`body`, `authorUserId`, `status`, nested replies via `parentCommentId`). The Local Life detail page now supports posting comments, replying, and deleting your own comments from the canonical article page.
- **Events:** `/events` listing, `/events/[id]` detail, `/events/submit`, `/api/events`, and `/api/events/[id]` are wired to the current Prisma schema. Event submissions go to `PENDING_REVIEW`, admins/editors can approve or reject them from the content queue, the public events page now fetches real published data instead of mock fixtures, and the submit page layout now matches the rest of the public site shell.
- **Editor and uploads:** TipTap is the active article editor. HTML is sanitized server-side. Image upload works for articles, profile photos, events, marketplace, and inline editor images using local storage under `public/uploads/`. The shared upload widget now uses a real label/input activation path instead of relying only on programmatic `.click()`, which fixed file-picker activation issues seen on the event submit page.
- **Homepage:** The public homepage is SSR-driven by `src/app/page.tsx` + `src/lib/homepage.ts`, backed by `HomepageSection` / `HomepagePinnedItem`. It resolves community by domain/host, uses a localhost fallback for local dev, excludes featured stories from Latest News, and uses `next/image`. The older homepage widget components were removed.
- **Search:** `/search`, `/api/search`, and `src/lib/search.ts` are now aligned on the current schema and tenant model. Search is server-rendered, filter and pagination state live in the URL, counts are returned per content type, and result cards now use `next/image`.
- **Admin area:** Users, trust, bans, audit log, and content moderation are live. User deletion is Super Admin only and logged before cascade delete.
- **Marketplace / stores:** The store-based marketplace schema is live (`Store`, `StoreMember`, store-owned `MarketplaceListing`, listing types for products/food/services). `/api/marketplace`, `/api/marketplace/[id]`, `/api/stores`, `/api/stores/[id]`, and `/api/stores/[id]/approve` are wired to the current schema. Public market list/detail pages now fetch real data, buyers can browse anonymously, trusted users can message sellers from listing detail, the `/marketplace` landing page now supports direct text search across listings and stores plus a dedicated store-browsing section with stronger store-level summaries, public marketplace pages show `ACTIVE`, `PENDING`, and `SOLD` listing states with clearer buyer messaging, approved stores now have public storefront pages at `/marketplace/stores/[id]` with richer store identity/presentation, homepage marketplace cards now expose direct storefront links in addition to listing links, listing detail now links into storefronts, seller contact on storefront/detail views is gated to trusted users or store managers, sellers can create stores, dedicated admin store management is now available at `/admin/stores` (including review, filtering, approve/reject, suspend, and reinstate-to-approved controls), the shared `/admin/content` queue now focuses on articles/events only, and sellers can now manage store-owned listings from `/marketplace/stores`, including marking listings pending/sold/active, editing listings, deleting listings, and creating listings with store preselection.
- **Directory planning:** A dedicated planning doc now exists at `DIRECTORY-PLAN.md`. Current agreed direction: people listings are opt-in, expose no phone/address, route contact only through internal messaging, restrict message initiation to `TRUSTED` users only, keep organization memberships off user directory entries, and allow organizations to choose whether to publish selected members on the organization page.
- **Help Wanted:** `HelpWantedPost` plus the posting/compensation/status enums now exist in the Prisma schema. `/api/help-wanted`, `/api/help-wanted/[id]`, and `/api/help-wanted/[id]/approve` are wired for public browsing of approved content, trusted-user creation/edit/delete, poster close/fill transitions, editor/admin moderation, and activity-log coverage. The public Help Wanted list/detail/submit pages are live on real data at `/help-wanted`, `/help-wanted/[id]`, and `/help-wanted/submit`, detail pages open the existing messaging flow for trusted responders, uploads support a dedicated `help-wanted` context, and trusted authors now have a management dashboard at `/help-wanted/manage` plus an edit screen at `/help-wanted/[id]/edit` for draft/rejected revisions and lifecycle actions (`submit`, `resubmit`, `move to draft`, `fill`, `close`, `reopen`, `delete` where allowed).
- **Help Wanted polish:** The active Help Wanted surfaces now do a better job explaining the moderation and messaging loop. The list page surfaces high-level counts plus stronger “how it works” framing, the detail page clarifies response rules and poster workflow, the submit/edit pages explain moderation expectations and on-platform contact rules more explicitly, and the manage dashboard now summarizes open/review/attention states with clearer lifecycle guidance for posters.
- **Community roadmap / prioritization:** `RoadmapIdea`, `RoadmapRankingBallot`, and `RoadmapRankingItem` now exist in the Prisma schema along with roadmap-specific permission and activity-log resource types. `/api/roadmap`, `/api/roadmap/[id]`, `/api/roadmap/[id]/moderate`, and `/api/roadmap/ballot` now support trusted-user submission/edit/delete/resubmit, ordered top-five ballot saving, author/manage views, staff moderation, merge-target references, leaderboard aggregation, and public browsing of approved/planned/in-progress/shipped ideas. The public/community surface is live at `/roadmap`, `/roadmap/[id]`, `/roadmap/submit`, and `/roadmap/manage`, while staff moderation lives at `/admin/roadmap`.
- **Roadmap weighting foundation:** `DomainInfluenceWeight` plus the `InfluenceDomain` enum now exist in the Prisma schema for domain-specific weighting. The first and only live domain is `ROADMAP_FEATURE_PRIORITIZATION`. `/api/admin/roadmap/weights` allows admins to search trusted users in the current community and set small roadmap-only multipliers with rationale, the admin roadmap page now exposes that management UI beside moderation, and the public roadmap leaderboard now applies those multipliers when rolling up ballot scores. Non-default weights now require a rationale in validation, and weight changes are logged to `ActivityLog` under `DOMAIN_INFLUENCE_WEIGHT`, preserving the requirement that admin influence adjustments remain auditable and non-global.
- **Roadmap weighting transparency:** The public `/roadmap` page now explicitly states the roadmap-only multiplier bounds and surfaces weighted vs raw leaderboard points so the influence layer is not hidden inside the score math. The admin roadmap screen now also shows recent roadmap-weight changes pulled from `ActivityLog`, scoped to the active roadmap domain/community and backed by shared policy constants instead of duplicated hardcoded bounds. The legacy `/api/admin/activity-logs` route now recognizes roadmap-specific resource types (`ROADMAP_IDEA`, `ROADMAP_RANKING_BALLOT`, `DOMAIN_INFLUENCE_WEIGHT`) so forensic/admin tooling no longer lags the active roadmap domain.
- **Developer verification baseline:** ESLint is configured via `.eslintrc.json`, `npm run lint` runs successfully again (currently with warnings but no blocking errors), and `npm run test:unit` is green on the current unit suite (`permissions`, `trust-cascade`, `marketplace-status`) after removing stale schema-era test files that no longer matched the live app.
- **TypeScript baseline:** `npm run typecheck` (`tsc --noEmit`) now passes for the full repo again when run sequentially as part of the normal verification flow. The earlier file-level exclusions were removed after rewriting the stale helper/route surface (`src/lib/auth.ts`, `src/lib/audit.ts`, `src/lib/community.ts`, `src/lib/trust.ts`, `src/lib/upload.ts`, `/api/settings`, `/api/users/[id]/block`) to the current Prisma/session model and deleting outdated test suites that were only preserving dead schema assumptions.
- **Build verification baseline:** `npm run build` now completes successfully for the current app surface. The deployment-readiness pass fixed App Router prerender failures on `/experiences`, `/local-life`, and `/marketplace/create` by wrapping their `useSearchParams()` usage in explicit `Suspense` boundaries so production prerendering no longer aborts on those routes.
- **CI baseline:** `.github/workflows/ci.yml` now runs `npm run lint`, `npm run test:unit`, `npm run typecheck`, and `npm run build` on pull requests and pushes to `main`, using placeholder auth/env values plus Prisma client generation so the repo has an automated launch-readiness gate instead of relying on manual local verification alone.
- **Credentials registration repair:** The `/register` page now has a live `/api/auth/register` route again, so email/password sign-up creates a `REGISTERED` user plus default community membership instead of failing with the generic client-side error caused by the previously missing API route.
- **Homepage curation:** `/admin/homepage` and `/api/homepage/sections` are the active curation surface for section order, visibility, and pinning. The page now shares its types with `src/lib/homepage.ts`, and marketplace homepage cards now use store-based metadata instead of legacy seller-name framing.
- **Navigation / design:** Public design system is applied, nav dropdowns work, Arcade is visible only to Super Admin, and the Experiences dropdown now links directly to `/events` for the Events entry. The `/events` page also exposes a visible `Submit Event` CTA for signed-in users. In the admin sidebar, the `/admin/stores` entry is now labeled `Store Moderation` to match the dedicated store-review workflow and the redirect notice shown in the shared content queue.
- **Security logging:** Login events and immutable activity logs are live, including admin endpoints for investigation/export.
- **Repository / deployment baseline:** The project is now under git and the initial `main` branch has been pushed to GitHub at `https://github.com/dsjrego/highlander-today`. Repo-facing docs/config were cleaned up for first public/private remote use: `README.md` now reflects the active product surface instead of stale scaffold routes, `.env.example` now documents the real local Docker Postgres connection on `127.0.0.1:5433`, and `src/app/api/health/route.ts` now exists so the Docker `HEALTHCHECK` hits a real endpoint.
- **Domain management status:** The production domain is `highlander.today`. Namecheap remains the registrar, but active DNS is now managed in Cloudflare and the live app routes through Vercel on `https://highlander.today`. Future DNS/domain instructions should assume registrar = Namecheap, authoritative DNS = Cloudflare unless intentionally changed again.

### PLACEHOLDER (UI exists, mock/hardcoded data)
- Admin: dashboard
- Experiences, Arcade landing pages

### PARTIAL
- Admin categories CRUD, settings
- Messaging attachments UI/data model
- Help Wanted MVP: core public list/detail/submit/respond/manage loop is live; current remaining work is validation with real usage plus any targeted refinements discovered from that usage rather than missing core workflow
- Multi-tenant cross-site content sharing ("sister site" pull-through) is **not** implemented yet; homepage/content selection is currently per-domain/per-community only
- Donations/transparency: product plan exists in `DONATIONS-TRANSPARENCY-PLAN.md`, but no schema, routes, admin tooling, provider integration, or public pages have been implemented yet
- About section: concept direction is now agreed (`About` top-level nav with `Mission`, `Roadmap`, and `Blog`/`Journal`), but no routes, content models, templates, or navigation wiring have been implemented yet. This is the next planned feature track after remaining deployment-readiness work.

## Blue-Sky Brainstorming

These are explicitly future-facing ideas for later exploration, not current commitments. They should only be pursued if they strengthen the core local interaction loops and preserve focus on complete end-to-end workflows.

- **Local Intent Router:** A single resident-facing flow for "I need something" that routes people into the right system automatically (local content, events, marketplace, help wanted, service requests, or trusted messaging) based on the actual need rather than requiring users to understand the site architecture first.
- **Community Capability Graph:** A structured map of who in the community can do what, derived from real identity, vouches, trusted participation, completed interactions, and visible local activity. This would emphasize known local competence rather than anonymous reviews.
- **Trust-Backed Local Reputation:** Domain-specific reputation layers built on top of the base trust model so members can accumulate visible reliability in narrow contexts such as selling, hiring, organizing events, volunteering, or civic contribution without turning the product into a generic rating platform.
- **Local Operating Feed:** A unified, high-signal daily feed of what is changing in the community across events, local stories, marketplace updates, help wanted activity, urgent requests, public notices, and other meaningful local developments.
- **Mutual Aid / Response Network:** A dedicated trusted-neighbor coordination layer for rides, short-term help, weather response, elder support, lost pets, errands, and other community support needs where identity and accountability materially improve safety and follow-through.
- **Civic Action Layer:** Structured tools for issue tracking, petitions, public comment mobilization, meeting agendas, local advocacy, and visible community problem-solving so the platform can support civic coordination as well as information distribution.
- **Verified Local Memory:** A persistent community knowledge layer built from approved reporting and trusted contributions that answers recurring local questions and preserves useful institutional memory over time.
- **Marketplace-to-Fulfillment Bridge:** Longer-term logistics tooling that lets trusted local sellers coordinate delivery windows, pickup points, neighborhood route batching, or local runners, extending the marketplace beyond listing-and-message behavior.
- **Institution Accounts:** First-class profiles and workflows for schools, churches, clubs, nonprofits, municipal bodies, and other local institutions so they can publish updates, run recurring events, recruit help, and maintain visible authority within the same trust-aware ecosystem.
- **Community Pulse / Early Warning System:** Aggregate local signals from searches, posts, response patterns, and interaction trends to identify emerging needs, shortages, or issues before they are formally organized into content or requests.

### Brainstorming Priorities

If these ideas are revisited later, the strongest strategic candidates based on the current product thesis are:

1. **Local Intent Router**
2. **Community Capability Graph**
3. **Mutual Aid / Response Network**

These fit the current vision best because they deepen the existing trust, messaging, content, marketplace, and help-wanted systems into a more unified local coordination platform rather than adding disconnected feature surface area.

---

## Known Issues & Gotchas

1. **NO PrismaAdapter** — silently breaks JWT-based credential login. Never re-add.
2. **Port 5433** — Docker Postgres (Mac has local PG on 5432). `.env` must use `127.0.0.1:5433`.
3. **DB import** — Always `import { db } from '@/lib/db'`. NOT `prisma`, NOT default import.
4. **Middleware auth headers** — `src/middleware.ts` sets `x-user-id`, `x-user-role`, `x-user-trust-level`, and `x-client-ip` for `/api/*`. Most active API routes read headers, not `getServerSession()`.
5. **Auth config split** — ACTIVE: `src/app/api/auth/[...nextauth]/route.ts`. INACTIVE helper: `src/lib/auth.ts`.
6. **User / membership model** — User fields are `firstName`, `lastName`, `profilePhotoUrl`, `dateOfBirth`, `trustLevel`. Role is not on `User`; it comes from `UserCommunityMembership` and is attached to JWT/session.
7. **Schema path** — Only use `prisma/schema.prisma`. Scripts and Docker explicitly pass `--schema prisma/schema.prisma`. Never create a root-level `schema.prisma`.
8. **After schema changes** — Run `npm run db:generate`, then `npm run db:push`, then restart the dev server. If Prisma client looks stale, clear `.next`.
9. **Profile flow** — Profile view is `src/app/profile/[id]/page.tsx`; edit is `src/app/profile/edit/page.tsx`. Client helpers on the profile page are `VouchSection.tsx`, `EditProfileButton.tsx`, and `SendMessageButton.tsx`.
10. **Identity lock** — Once a user is vouched and `isIdentityLocked` becomes `true`, name and DOB become permanently read-only. DOB must exist before vouching.
11. **Messaging canonical schema** — Use `ConversationParticipant`, `Message.body`, `Message.senderUserId`, and `ConversationParticipant.lastReadAt`. Do not use old scaffold fields like `conversation.userId`, `recipientId`, `updatedAt`, `message.content`, `senderId`, or user `name`/`avatar`.
12. **Messaging limitations** — Live messaging supports text only. Attachments exist in schema/legacy UI but are not yet wired in the active routes/pages. Blocking is enforced for conversation creation/list/detail/send, but no separate blocked-users management page exists yet.
13. **Messaging rollout gotcha** — If Prisma throws `P2022` for `conversation_participants.lastReadAt`, the local DB is behind the schema. In this environment `prisma db push` failed once with a generic schema engine error and the fix was `ALTER TABLE "conversation_participants" ADD COLUMN "lastReadAt" TIMESTAMP NOT NULL DEFAULT NOW();`.
14. **Articles canonical path** — Article flow is `/local-life/*`. Legacy `/articles/*` routes should only be used as redirects for backwards compatibility; do not build new behavior there.
15. **Categories source of truth** — The DB category tree does not match `seed.ts`. All category usage should be dynamic from `/api/categories`; never hardcode expected parent/category names.
16. **Uploads** — `/api/upload` uses middleware auth headers, writes to local disk in development, and now switches to Cloudflare R2 in production when the required env vars are configured. `ImageUpload.tsx` is the active component; `ImageUploader.tsx` is legacy.
16b. **Supported upload formats** — The active upload pipeline currently accepts only JPEG, PNG, WebP, and GIF, up to 5MB. HEIC/HEIF is not supported yet, so iPhone photos may need conversion before upload.
16c. **Article video support** — The active TipTap article flow does not currently support video embeds or uploaded video files. Safe YouTube/Vimeo embeds are the next planned content-editor enhancement and should be completed before Milestone 5 / Delivery Jobs. Native video upload remains out of scope for now because it would require broader storage and delivery work.
17. **TipTap versions** — Core TipTap packages are v2.x. Pin any added extensions to v2.x.
18. **No @@fulltext** — PostgreSQL full-text search is implemented manually in `src/lib/search.ts`.
19. **R2 operational status** — Production upload code is now wired for Cloudflare R2, but launch still requires real bucket/CDN credentials and public URL configuration. Local development continues to use filesystem storage.
20. **Removed sections** — Classifieds and Galleries were removed. Do not re-add them.
21. **Homepage tenant resolution** — Active homepage resolution is now domain-aware. Use `host` / `x-community-domain` (or `x-community-id` when explicit). `localhost` / `127.0.0.1` intentionally fall back to the first community for local dev because the seed does not set `Community.domain`.
22. **Homepage de-duplication rule** — `FEATURED_ARTICLES` should not repeat inside `LATEST_NEWS` on the same homepage render. Preserve that rule unless product requirements change.
23. **Verification caveat** — `npm run lint` works, `npm run test:unit` is green on the current suite, and `npx tsc --noEmit` now passes repo-wide again. This does **not** mean every file is equally production-ready; it means the current checked-in TypeScript surface is back under type coverage instead of being hidden behind broad exclusions.
24. **Legacy cleanup rule** — Do not reintroduce blanket TypeScript exclusions to hide drift. If a stale scaffold-era file becomes active again, either rewrite it to the current Prisma/session model or delete it.
25. **Marketplace product direction** — Marketplace is being repositioned from direct user-owned classifieds into a store-based commerce platform. Users can own multiple stores. Stores require admin approval before becoming public. Listings belong to stores, not directly to users, even if the initial migration temporarily keeps owner fields for compatibility.
26. **Marketplace MVP scope** — Initial listing types should cover physical products, grocery/artisan food items, and services. Experiences may join later, but they are not part of the first commerce implementation.
27. **Marketplace buyer access** — Buyers may browse marketplace content without logging in, but seller messaging requires the buyer to be a `TRUSTED` user. Messaging remains the active buyer/seller contact path for MVP.
28. **Marketplace roadmap boundaries** — Do not turn the first marketplace build into full checkout. Payments, shipping, inventory control, merchant APIs, retailer integrations, and broader back-office tooling are future work, but the schema and route design should leave room for them.
29. **Delivery network direction** — Delivery should be modeled as a shared platform capability, not a marketplace-only feature. A user can create a standalone delivery request/job with an offered fee, pickup location, delivery location, requested timing, and job details; another user can claim or be assigned that job and complete the delivery. This should work for marketplace purchases, grocery/artisan food deliveries, and private point-to-point delivery requests such as furniture moves, document delivery, or family handoffs.
30. **Delivery assignment modes** — The delivery system should support three assignment styles: open/public jobs any eligible driver can claim, invite-only jobs visible to selected drivers or groups, and direct-dispatch jobs assigned to a specific driver, employee, company, or contracted delivery partner.
31. **Delivery marketplace shape** — The delivery system is a standalone delivery-job domain first, with APIs that allow marketplace, restaurant ordering, or external merchant systems to create linked delivery jobs later. Do not bake delivery logic directly into marketplace listings.
32. **Food scope clarification** — Marketplace food support is for grocery-style and artisan/craft food listings, not restaurant delivery. Restaurant menu ordering and delivery is a separate future system, but it should be able to reuse the broader delivery network where appropriate, including preferred-driver and direct-dispatch workflows.
33. **Community roadmap input direction** — The platform should eventually include a curated feature-prioritization module where `TRUSTED` users can submit ideas, staff can normalize/merge/moderate them, and the community can rank approved ideas to inform roadmap priorities without replacing final editorial/product judgment.
34. **Domain-specific weighting direction** — Influence weighting should never be global. If used, it should be attached to a user within a specific domain (for example feature prioritization, recommendations, or later delivery reliability) so a user can be high-signal in one context and neutral or lower-signal in another.
35. **Rollout philosophy** — Features should be introduced at a pace the community can absorb. Each release should teach users one new behavior rather than exposing every future capability at once. Build forward-compatible foundations early when useful, but keep features hidden, gated, or lightly exposed in UI/navigation until there is enough community momentum to support real adoption.
36. **Scope-control rule** — Work should be prioritized around complete user loops, not abstract feature categories. Example loop: store creation -> admin approval -> listing creation -> public discovery/search -> trusted buyer messaging -> seller marks pending/sold.
37. **Platform sequencing** — The intended build order remains: `1)` trust/content/community identity, `2)` store-based listings and discovery, `3)` Help Wanted opportunity board, `4)` community feature-prioritization module, `5)` domain-specific weighting/reputation, `6)` delivery/jobs, `7)` transaction infrastructure such as payments, inventory, shipping, and merchant APIs. Milestones 1 through 4 are now complete for the current MVP loops.
38. **Current execution priority** — Because the app has not launched yet, the immediate engineering priority is deployment and launch readiness for the current product surface, not starting delivery/jobs or doing speculative extra Help Wanted polish without user feedback.
39. **Post-launch product question** — After launch, the next product question to prove is whether trusted local users and businesses will use the moderated Help Wanted board to post and respond to employment openings, service requests, and short-term tasks through the platform's trust and messaging system.
40. **Marketplace local DB gotcha** — In this environment `prisma db push` hit a generic schema-engine failure while applying the store-based marketplace changes. Prisma client generation succeeded, but the local Postgres schema had to be aligned manually for `stores`, `store_members`, `marketplace_listings.storeId`, `marketplace_listings.listingType`, and the expanded `MarketplaceStatus` enum. If local marketplace tables drift again, inspect the live DB directly instead of trusting the opaque Prisma error.
41. **Legacy cleanup status** — The formerly excluded legacy helper/route surface has now been reconciled with the live schema and reintroduced to TypeScript coverage. The remaining cleanup rule is to avoid letting new scaffold-era files accumulate outside the active Prisma/session model.

---

## Design System

**Colors:** Blue `#46A8CC` (banner), Maroon `#A51E30` (nav, headings, pills, CTAs), Dark maroon `#7a1222` (footer).

**Banner:** `text-7xl font-bold` white with black stroke/shadow. Subtitle: `text-xs italic text-black`. BannerActions absolutely positioned top-right.

**Page pattern:** Headings `text-2xl font-bold border-b-2 border-[#A51E30]`. Cards `rounded-xl shadow-sm bg-white`. Accents `border-l-4 border-[#A51E30]`. Pills `bg-[#A51E30] text-white text-xs rounded-full`. CTAs `bg-[#A51E30] text-white rounded-full`.

---

## Remaining Work

### Rollout Milestones
1. **Milestone 1 — Store marketplace MVP:** user can create a store, admin can approve it, approved store can publish listings, the public can browse/search listings, trusted buyers can message sellers, and sellers can mark listings pending/sold.
Status: complete for the current MVP loop. Store creation, approval, browsing, search integration, trusted-user messaging entry point, public pending/sold visibility, seller listing-state controls, seller edit/delete management, public storefront pages, dedicated admin store management, direct store discovery on `/marketplace`, storefront presentation polish, and homepage/discovery refinement on the store schema are now in place.
2. **Milestone 2 — Help Wanted MVP:** trusted users and businesses can create employment listings, service/help requests, and gig/task postings; the public can browse them; trusted users can respond through platform messaging; and posters can close/fill the opportunity.
Status: complete for the current MVP loop. Public browsing, trusted-author creation/editing, moderation, trusted responder messaging, poster lifecycle controls, and the management surface are live. Remaining work is launch validation with real usage rather than missing core functionality.
3. **Milestone 3 — Community feature-prioritization MVP:** trusted users can submit roadmap ideas, staff can moderate/merge/clarify them, approved ideas can enter a ranking pool, and trusted users can submit ordered priorities that roll up into a shared community-informed leaderboard.
Status: complete for the current MVP loop. Trusted submission, author management/edit/resubmit, staff moderation, approved ranking-pool visibility, ordered ballot saving, and public leaderboard aggregation are now live. Remaining follow-up is polish rather than MVP capability: improve duplicate-merge ergonomics, expose richer roadmap history/context if needed, and then move into Milestone 4 domain-specific weighting.
4. **Milestone 4 — Domain-specific weighting/reputation MVP:** the platform can apply small, auditable, domain-specific influence modifiers inside selected systems without introducing a global user weight; first use case is feature prioritization, with future reuse possible for delivery reliability and other trust-sensitive domains.
Status: complete for the current MVP loop. The roadmap-first weighting foundation is live with a dedicated roadmap weighting domain, bounded per-user multipliers, required rationale for non-default overrides, auditable activity-log entries, active-community admin history, shared policy constants for the current 90%-110% range, and public weighted-vs-raw transparency on the roadmap leaderboard. Future work in later domains should reuse this pattern rather than expand it into a global user score.
5. **Milestone 5 — Article video embeds MVP:** trusted authors and editors can embed safe YouTube and Vimeo videos inside the active TipTap article flow so Local Life stories can include hosted video without opening native video upload/storage scope.
6. **Milestone 6 — Delivery jobs MVP:** requester can post a delivery job, eligible drivers can browse or receive it based on assignment mode, one driver can claim or accept dispatch, and the job can move through basic completion states.
7. **Milestone 7 — Decide next bottleneck:** only after milestones 1 through 6 are stable should the platform choose among payments, restaurant ordering, merchant tooling, or broader integrations as the next expansion lane.

### Phase 1: Wire listing pages to real data
1. ~~Local Life → fetch from /api/articles (filtered by Local Life category children)~~ — done
2. Experiences → fetch from /api/events + new experience models
3. ~~Events list → /api/events~~ — done
4. ~~Marketplace/store foundation~~ — done:
   - store-oriented schema (`Store`, `StoreMember`, store approval state) is live
   - marketplace listings now belong to stores
   - listing types support products, food, and services
   - schema leaves room for future payments, inventory, shipping, and external merchant APIs
   - seller workflow now includes explicit UI/actions for `PENDING` / `SOLD`, plus seller edit/delete management from `/marketplace/stores`
5. ~~Market list/detail → real `/api/marketplace` on the new store-based schema~~ — done
4b. Help Wanted MVP → build posting/listing models, API, and UI:
   - ~~support three posting types: `EMPLOYMENT`, `SERVICE_REQUEST`, and `GIG_TASK`~~ — done
   - include normal local job listings from businesses (retail, office, food service, trades, seasonal, part-time, etc.)
   - include local requests for help/services plus short, bounded gig/task work
   - ~~allow all users to browse, but only `TRUSTED` users can post or respond~~ — done
   - ~~keep communication inside the platform messaging system; public postings must not expose phone numbers, email addresses, or other off-platform contact details~~ — done
   - ~~frame the no-public-contact rule as a safety and accountability requirement that preserves the trust system~~ — submit/detail UI now states that explicitly
   - if off-platform contact details are ever collected for later workflows, they must remain hidden from untrusted users by default
   - ~~support a simple close/fill flow so posters can mark opportunities resolved~~ — done, including author-facing management UI
4c. Community feature-prioritization MVP:
   - ~~only `TRUSTED` users can submit feature ideas or participate in ranking~~
   - ~~staff/admins moderate submissions~~, merge duplicates, clarify vague ideas, and reject bad-faith or off-mission proposals
   - ~~approved ideas move into a shared ranking pool rather than a raw public suggestion dump~~
   - ~~ranking should use ordered priorities rather than simple upvotes so users must make tradeoffs~~
   - ~~the community leaderboard should inform roadmap decisions without replacing staff curation or final product judgment~~
   - ~~support status flow such as `SUBMITTED`, `UNDER_REVIEW`, `APPROVED_FOR_RANKING`, `DECLINED`, `PLANNED`, `IN_PROGRESS`, and `SHIPPED`~~ — live, plus `MERGED`
4d. Domain-specific weighting/reputation foundation:
   - ~~no global user weight; weighting must be attached to a user within a specific domain~~
   - ~~first use case is small, auditable weighting inside feature prioritization~~
   - ~~weighting should refine community input, not overpower it~~ — current roadmap weights are intentionally bounded to small multipliers
   - future domains may include delivery reliability on both sides of the transaction (requester reliability and driver reliability)
   - ~~any manual/admin weight changes should be logged and reviewable~~
6. ~~Article detail → /api/articles/[id]~~ — done (at `/local-life/[id]`)
7. ~~Search → /api/search~~ — done; expand marketplace search over store-owned listings as part of commerce work
8. ~~Homepage → real data for each section~~ — done for current per-community model
8b. Homepage / content sharing → design and implement sister-site pull-through for articles and later broader content types

### Phase 2: Admin area
8. Dashboard (aggregate stats). Content moderation (approval queue) is now done for articles, events, and Help Wanted posts
9. Categories CRUD (/api/categories — GET done, need POST/PATCH/DELETE). ~~Users~~ ~~Trust~~ ~~Bans~~ ~~Audit log~~ — done
10. ~~Homepage curator (persist sections)~~ — done; Settings still need persistence cleanup

### Phase 3: Interactive features
11. ~~Comments (CommentThread + /api/comments)~~ — core article comments/replies/delete flow done on `/local-life/[id]`; moderation UI can be expanded later if needed
12. ~~Private messaging core flow~~ — done (`/api/messages`, inbox page, thread page, profile send-message entry point, unread badge on banner). Still remaining: attachments.
13. ~~Vouching flow~~ — done (admin vouch + public profile VouchSection both wired)
14. ~~User blocking~~ — done for the active profile and messaging flows; remaining expansion would be optional dedicated management UI (for example a “blocked users” settings page) rather than core enforcement
15. Marketplace buyer/seller messaging rules:
   - ~~marketplace browsing allowed anonymously~~ — done
   - ~~marketplace seller contact allowed only for `TRUSTED` users~~ — done
   - ~~sellers can mark listings pending or sold in a Facebook Marketplace-style workflow~~ — done
15b. Store seller workflow:
   - ~~seller can create a store~~ — done
   - ~~admin/editor can approve or reject store~~ — done (now via dedicated `/admin/stores`; shared queue no longer owns store moderation)
   - ~~seller can edit and resubmit a rejected store~~ — done
   - ~~seller can edit and delete listings from store management~~ — done
   - ~~seller-facing dedicated storefront page baseline~~ — done (`/marketplace/stores/[id]`)
   - ~~richer store presentation polish~~ — done
   - ~~marketplace landing page direct store discovery baseline~~ — done (`/marketplace`)
15c. Community prioritization and weighting:
   - ranked community roadmap input for approved feature ideas
   - domain-specific weighting/reputation with small bounded influence, starting in feature prioritization
   - keep weighting non-global so users can have different reliability/value profiles in different domains
16. Delivery/jobs platform:
   - shared delivery request model usable by marketplace, food, and private delivery use cases
   - requester can offer a fee plus pickup and delivery locations
   - support open/public, invite-only, and direct-dispatch assignment modes
   - other users can browse available delivery jobs and claim them when the job is open
   - support preferred drivers, in-house drivers, delivery companies, and contractor relationships
   - leave room for separate requester-side and driver-side reliability/reputation signals rather than a single delivery score
   - route design should leave room for defaults, negotiation, status tracking, deadlines, and future driver workflows
17. ~~Image upload~~ — done (all forms wired). Local storage working. Still need: R2 swap for production.
17b. Article video embeds (YouTube/Vimeo) in the active TipTap editor — prioritize this before Delivery Jobs / Milestone 6

### Phase 4: Polish & production
18. Error handling, loading states, mobile responsive, SEO metadata
18b. Dark mode:
   - define an intentional dark theme for the public design system, not just color inversion
   - support user-selectable theme preference with sane default behavior
   - verify readability/contrast across banner, nav, cards, forms, editor content, and admin surfaces
19. Rate limiting, email notifications, ~~OAuth~~ (done — dev mode), tests, deployment
20. Future commerce expansion:
   - payments and checkout
   - inventory and shipping management
   - merchant APIs for syncing inventory/orders
   - larger retailer integrations
   - shared delivery-job system with richer dispatch/claim/fulfillment workflows
   - organization-level dispatch and contracted driver/company integrations
   - separate restaurant menu/ordering/delivery system

---

## Verification Notes

- **What was verified for events:** The event flow was traced end-to-end through creation, moderation, public listing, detail view, and navigation surfacing. The old scaffold-era event API route was replaced with one using the current schema fields (`submittedByUserId`, `startDatetime`, `endDatetime`, `locationText`, `photoUrl`, `costText`, `contactInfo`).
- **Upload follow-up:** The shared `ImageUpload` component was updated after event testing to use stronger file-input activation and to document the actual supported file types more clearly. If upload problems persist, first confirm the file is JPEG/PNG/WebP/GIF and under 5MB.
- **Homepage follow-up:** The homepage slice now resolves community by domain, excludes featured articles from Latest News, uses `next/image`, and no longer carries the old homepage widget components. Targeted checks did not surface homepage-file errors.
- **Search follow-up:** The search page now renders on the server using the shared search library, preserves `q`/`type`/`page` in the URL, resolves community by `host` / `x-community-domain` / `x-community-id`, and returns per-type counts plus pagination from `/api/search`.
- **Marketplace follow-up:** The marketplace now uses the store-based schema and real APIs. Verified slices included Prisma schema validation, Prisma client regeneration, public marketplace list/detail rewiring, public `PENDING` / `SOLD` state visibility, seller store creation/edit/resubmission, seller listing lifecycle controls (`ACTIVE` / `PENDING` / `SOLD`), seller listing edit/delete flow, and admin store approval in the shared content queue. In local development `prisma db push` failed with a generic schema-engine error during the earlier store-schema rollout, so the marketplace DB changes were applied manually after direct Postgres inspection.
- **Storefront follow-up:** Approved stores now have a public storefront route at `/marketplace/stores/[id]` that loads the store profile plus its public listings, listing detail pages now link into the storefront, and store contact details returned by `/api/stores/[id]` are now hidden unless the viewer is trusted or can manage the store.
- **Admin store-management follow-up:** Dedicated store moderation now lives at `/admin/stores`, backed by `/api/admin/stores` plus `/api/admin/stores/[id]/status`. Staff can filter/search stores across statuses, review store details separately from article/event moderation, approve or reject pending stores, suspend approved stores, and manually return rejected/suspended stores to approved status when needed.
- **Marketplace discovery follow-up:** `/marketplace` now fetches both listings and approved stores, supports direct text search across listings/store names/seller names, surfaces store-count summary cards, and shows a dedicated storefront-browsing section so discovery is not limited to individual listing cards. Homepage marketplace metadata now references the store name instead of the listing author.
- **Storefront/discovery polish follow-up:** The public storefront page now presents stronger store identity, listing-mix/category context, clearer contact expectations, and stronger navigation back into the broader marketplace. The `/marketplace` store cards now surface stronger store-level summaries from live listing data, and homepage marketplace cards now include direct storefront links in addition to listing links.
- **Blocking follow-up:** Verified the new blocking slice across `/api/users/[id]/block`, profile interaction controls, `/api/messages`, and `/api/messages/[conversationId]`. The live behavior now hides blocked conversations from the inbox list, prevents starting new conversations with blocked users, and rejects thread load/send attempts when either participant has blocked the other.
- **Help Wanted polish follow-up:** Verified the list/detail/submit/manage/edit pages after the messaging-copy/status-clarity pass. The changes are UI/content level only: clearer moderation expectations, explicit on-platform response guidance, better status semantics for posters, and stronger dashboard summaries to support the current validation question without changing the underlying Help Wanted schema or API workflow.
- **Roadmap ranking follow-up:** Verified the ordered-ballot slice through repo-wide type checking plus the public roadmap/ballot surface. Trusted users can now save one ordered top-five ballot, approved ranking-pool ideas show live score/position metadata, and the roadmap page now exposes a visible community-priority leaderboard without changing the later Milestone 4 weighting assumptions.
- **Roadmap weighting follow-up:** Verified the roadmap-weighting slice through Prisma client regeneration, repo-wide type checking, and the new admin/public roadmap code paths. The current implementation keeps weighting domain-specific and bounded to the roadmap leaderboard, but local DB schema application still depends on the same manual-Postgres fallback when Prisma’s schema engine fails on `db push`.
- **Roadmap weighting transparency follow-up:** Verified the transparency pass through repo-wide type checking and the updated public/admin roadmap payloads. The leaderboard now exposes both weighted and raw point totals, and the admin weight-management screen now has a native recent-change view without requiring a separate audit page visit.
- **Tooling follow-up:** ESLint config and Jest unit-test config/scripts remain repaired. `npm run lint` still executes with warnings only. `npm run test:unit` was re-run after the legacy cleanup and is green on the remaining current suite. The canonical verification sequence is now `npm run lint`, `npm run test:unit`, `npm run typecheck`, then `npm run build`.
- **TypeScript cleanup follow-up:** The legacy cleanup lane landed. `npx tsc --noEmit` now passes without the prior file-level exclusions, including the rewritten auth/community/trust/audit/upload helpers, the repaired settings/blocking routes, and the remaining tests.
- **Test cleanup follow-up:** Stale schema-era integration/e2e/unit tests plus the old shared `tests/helpers.ts` factory were removed rather than carried forward with dead field names and mock shapes. The remaining tests are intentionally the ones that still describe live behavior.
- **Important implication:** Future work can use `npx tsc --noEmit` as a repo-wide gate again. Do not reintroduce blanket test/file exclusions to hide drift; either keep a slice current or delete it.
- **Repository bootstrap follow-up:** The repo now has an initial git commit and a live GitHub remote at `https://github.com/dsjrego/highlander-today`. Alongside that bootstrap, `README.md` was rewritten to match the current app surface and setup assumptions, `.env.example` was corrected to use Docker Postgres on `127.0.0.1:5433`, and `src/app/api/health/route.ts` was added so the existing Docker health check no longer points at a missing route. These changes were repo/deployment-readiness cleanup only; no app behavior beyond the new health endpoint was changed, and no test/build verification was re-run for this documentation/bootstrap pass.
- **Deployment verification follow-up:** The previously unverified bootstrap/deployment cleanup has now been checked with a full local verification pass. `npm run lint`, `npm run test:unit`, `npm run typecheck`, and `npm run build` all pass sequentially, and CI now mirrors that same gate on GitHub. Production deployment is now live on Vercel with Neon bootstrapped, and the remaining launch blockers are operational rather than code-level. The completed completion order so far is: production-safe upload storage, production geolocation vendor swap to MaxMind, and production DNS/domain routing. The remaining deployment/auth work is `NEXTAUTH_URL` / hosted auth-env verification plus OAuth app publication against the final production domain.
- **Deployment runbook follow-up:** The repo now includes explicit operator instructions for the first remaining deployment step in `README.md`: Cloudflare R2 bucket creation, scoped API credentials, public custom-domain wiring, the five Vercel env vars required by the live upload helper, and the expected verification outcome. This clarifies that the next action is provider-side configuration, not more upload-path coding.
- **Cloudflare R2 custom-domain blocker:** Attempting to attach an R2 public custom domain before `highlander.today` is present in the same Cloudflare account and managed through Cloudflare DNS produced the dashboard error: `That domain was not found on your account. Public bucket access supports only domains on your account and managed through Cloudflare DNS.` Future sessions should treat this as a confirmed platform constraint, not a transient setup mistake.
- **Bootstrap admin DOB follow-up:** The initial production super-admin bootstrap can still create a locked account without a DOB if the script is used before any normal profile flow. `scripts/set-user-dob.ts` now exists as a direct remediation tool for already-bootstrapped accounts, and the current production super-admin has already been backfilled successfully. The broader identity-bootstrap policy remains under review.
- **Production DNS cutover follow-up:** `highlander.today` has now been moved to Cloudflare-managed DNS, the Vercel project domain is connected and serving valid HTTPS on the apex domain, and `www` is configured as the secondary hostname. The earlier legacy DNS/provider confusion is resolved: registrar stays at Namecheap, DNS is now authoritative in Cloudflare, and Vercel is the active app-routing target.
- **Production uploads follow-up:** The R2 public custom domain path is now live on `cdn.highlander.today`, production profile-photo upload testing succeeded, and the remaining upload verification work is just broader surface-area smoke testing rather than core storage setup. Future sessions should treat production-safe upload storage as operationally complete unless new upload bugs surface.
- **Production geolocation follow-up:** The login-event geolocation path now uses MaxMind GeoIP over HTTPS instead of the earlier `ip-api.com` placeholder. MaxMind account/license credentials have been added to Vercel, a production login from a public Comcast IP resolved successfully to `Patton, United States`, and the resulting `ANOMALY_LOGIN` audit entry confirmed that live production login enrichment and new-location detection are working on the deployed app. The remaining auth-related launch work is now OAuth publication and hosted auth-env verification rather than geolocation setup.
- **Production auth runbook follow-up:** `README.md` now reflects that Cloudflare R2 uploads are already live for production and that the current launch auth surface is credentials plus Google on `https://highlander.today`. The repo-side deployment instructions now treat Facebook as deferred until Meta business verification is complete rather than as an immediate launch blocker.
- **Deployment env checker follow-up:** `scripts/check-deployment-env.ts` now provides a repo-side preflight for the remaining deployment/auth work and is exposed as `npm run deploy:check-env`. It validates the presence/format of `NEXTAUTH_*` and Google OAuth vars, warns on missing Facebook vars when Facebook login is intentionally deferred, and warns on missing MaxMind/R2 config without echoing secret values. A local verification run against `.env` correctly failed only on the expected production-domain mismatch (`http://localhost:3000` vs `https://highlander.today`), confirming the script is usable for hosted-env checks before production auth testing.
- **Google OAuth production follow-up:** Google OAuth has now been finalized against the live production domain. The production client is configured with the `https://highlander.today` origin and `https://highlander.today/api/auth/callback/google` redirect URI, and Google sign-in is part of the active launch auth surface.
- **Facebook OAuth deferral follow-up:** Facebook login has been removed from the active auth route and the public login/register UI because Meta business verification is still pending. Future sessions should treat Facebook OAuth as explicitly deferred post-launch or until verification is complete, not as a current production blocker.
- **Locked-profile update bugfix:** Profile-photo updates for identity-locked users were failing because the edit page still submitted locked name/DOB fields and `/api/profile` rejected any locked-profile payload that merely included them. The fix now submits only editable fields for locked users and the API compares actual changes rather than field presence, so photo/bio updates no longer trip the identity-lock guard.

---

## Deployment: Super Admin Seeding Plan

The production bootstrap cleanup is now implemented. `prisma/seed.ts` creates structural data only, and the initial elevated account should be created with `scripts/create-super-admin.ts`.

### Repository status

The project now has a live GitHub remote at `https://github.com/dsjrego/highlander-today` with the initial `main` branch pushed. Future deployment work should assume GitHub is the source-control system of record for CI/CD and infrastructure wiring.

### Step 1: Structural seed
`prisma/seed.ts` now creates only **structural data**: community, categories, homepage sections, and site settings. This makes it safe to re-run idempotently in any environment.

### Step 2: `scripts/create-super-admin.ts`
The standalone bootstrap script:
- Reads `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from environment variables
- Validates both are present and rejects weak passwords
- Hashes the password with bcrypt
- Creates the User with `trustLevel: 'TRUSTED'`, `isIdentityLocked: true` when missing, or promotes the existing user while preserving their name fields
- Upserts the `UserCommunityMembership` with `role: 'SUPER_ADMIN'`
- Logs success and exits

### Step 3: Production deployment sequence
```bash
npm run db:push              # schema → production DB (explicitly uses prisma/schema.prisma)
npx prisma db seed            # structural data only (community, categories, etc.)
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```
Run the super admin script once. After that, the Super Admin uses the admin UI to promote other users.

### Notes
- **Alternative (OAuth bootstrap):** First user signs in via Google OAuth, then promote to Super Admin via the script or a direct DB update. Avoids putting a password in env vars entirely.
- **Local dev:** if you want the old seeded-admin convenience locally, run the explicit Super Admin script after `db seed` rather than re-embedding credentials in the seed.
- **Geolocation:** The production login geolocation path now uses MaxMind GeoIP and is verified live in Vercel-backed production. Keep `MAXMIND_ACCOUNT_ID` and `MAXMIND_LICENSE_KEY` in sync between any hosted environment and the currently active MaxMind account/license pair.
- **OAuth apps:** Google OAuth is now the only active third-party login provider for launch and should remain in sync between local `.env` and Vercel when tested against production. Facebook OAuth is deferred until Meta business verification is complete.
- **OAuth secret status:** The previously exposed Google and Facebook OAuth client secrets have now been rotated locally. Future deployment work should assume the current local `.env` values are newer than any previously copied values and should verify that Vercel or any other hosted environment is updated to match before testing production auth.

---

## Upload Snapshot

- **Current local storage:** filesystem under `public/uploads/{context}/`
- **Active endpoint:** `src/app/api/upload/route.ts`
- **Active component:** `src/components/shared/ImageUpload.tsx`
- **Supported types:** JPEG, PNG, WebP, GIF up to 5MB
- **Wired flows:** article featured image, TipTap inline images, profile photo, event image, marketplace images
- **Legacy component:** `src/components/shared/ImageUploader.tsx`
- **Production storage path:** `/api/upload` now uses `src/lib/upload.ts` for Cloudflare R2 in production, backed by the live custom domain `https://cdn.highlander.today`. Production profile-photo uploads have been verified against that path.

---

## Recommended Production Infrastructure

This is the current recommended launch setup for the first public deployment. It is chosen to fit the current codebase, stay within the approximate `$100/month` launch budget, and preserve a clean path to larger multi-community expansion if the product gains traction.

### Recommended stack

- **App hosting:** Vercel
- **Primary database:** Neon Postgres
- **Object storage / uploads:** Cloudflare R2
- **Domain registrar / current DNS starting point:** Namecheap
- **Authoritative DNS provider:** Cloudflare DNS
- **Current production domain:** `highlander.today`
- **Source control / CI trigger:** GitHub + GitHub Actions

### Why this is the current recommendation

- The app is a single Next.js 14 monolith with App Router, Prisma, and NextAuth; it does not currently justify a multi-service or container-orchestration deployment model.
- The initial service area is small enough that launch risk is product adoption and operational readiness, not raw infrastructure scale.
- Vercel is the most straightforward fit for the active Next.js surface and minimizes deployment friction while the product is still validating its first market/community.
- Neon keeps the data layer on standard PostgreSQL rather than a proprietary database model and can scale upward before any re-architecture is needed.
- Cloudflare R2 externalizes uploads early so production is not tied to local filesystem storage and media remains portable if app hosting changes later.
- Namecheap is now the current domain-management starting point, so the launch path can either keep DNS there initially or later move nameservers to Cloudflare if the added DNS/edge tooling is worth the extra operational step.
- If DNS is moved to Cloudflare later, that still preserves the same long-term portability goal of keeping domain/routing concerns separate from the app host.

### Target launch budget

- **Expected launch posture:** keep total recurring infrastructure spend roughly in the `$35-$60/month` range at low to moderate early usage, leaving room inside the `$100/month` target for domain, email, monitoring, and modest usage variance.
- **Do not pre-buy scale:** launch on the smallest production-capable paid tiers that avoid hobby-plan limitations, then increase capacity only when usage justifies it.

### Upgrade-path principle

The platform must launch cheaply without creating migration traps. The core rule is: **optimize for portability, not premature complexity**.

That means:

- keep the app as one deployable service until actual workload justifies splitting responsibilities
- keep the database on standard PostgreSQL features and avoid deep provider lock-in
- move uploads to R2 so file storage is already externalized from the app runtime
- keep tenant/community resolution in the app + database model rather than in host-specific routing tricks
- keep CI/CD centered on GitHub Actions rather than provider-specific deployment logic

### Planned scaling path

1. **Scale vertically first**  
   Increase Vercel and Neon capacity before introducing new services or architectural splits.

2. **Add operational hardening second**  
   Prioritize monitoring, error tracking, rate limiting, backups, transactional email, and secret hygiene before redesigning the hosting topology.

3. **Add background-job infrastructure only when justified**  
   Introduce queues/workers for email, notifications, media processing, imports, digests, or search maintenance only after those jobs become operationally meaningful.

4. **Reassess app hosting only when economics or workload demand it**  
   If Vercel becomes too expensive or too operationally constraining, the app should still be portable to Render, Fly.io, or AWS because the stack remains standard Next.js + PostgreSQL + S3-compatible object storage.

5. **Strengthen multi-tenant boundaries before aggressive geographic expansion**  
   The main scaling risk from rapid expansion is likely to be tenant isolation, moderation boundaries, search relevance, and operational process across communities before it is raw traffic volume.

### Explicit non-goals for launch infrastructure

- No Kubernetes
- No microservice split
- No custom container platform unless forced by clear hosting constraints
- No premature event bus / distributed-systems architecture
- No full checkout/payments/shipping infrastructure before marketplace demand proves it is warranted

### Pre-launch infrastructure checklist

- Provision production Postgres
- Configure production `DATABASE_URL`
- Configure production secrets in the hosting platform
- Before executing any of the above, provide explicit account-creation and setup instructions for any external service the owner has not already configured (at minimum: Vercel, Neon, Cloudflare/R2 if used, Google OAuth, Facebook OAuth, and any production geolocation provider). Future sessions should not assume those accounts, buckets, API credentials, or dashboard projects already exist.
- Complete the remaining operational launch steps in this order:
  1. Verify production `NEXTAUTH_URL` and all hosted auth env vars are aligned with the final production domain (`https://highlander.today`)
  2. Verify credentials login plus Google OAuth on `https://highlander.today` and defer Facebook OAuth until Meta business verification is complete
- Run the production bootstrap flow:

```bash
npm run db:push
npx prisma db seed
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

### Current recommendation status

This is the active infrastructure recommendation unless future product requirements, usage patterns, or budget constraints materially change. Future sessions should treat this as the working production direction rather than re-opening the hosting decision from scratch.

---

## Session Instructions

1. Read this file first.
2. Read only the source files relevant to the active slice.
3. Preserve current canonical paths and schema assumptions.
4. Update this file after meaningful progress so the next session can resume cleanly.
