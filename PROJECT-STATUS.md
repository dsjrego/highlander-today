# Highlander Today — Project Status

> **Last updated:** 2026-03-31 (session 108)
> **Purpose:** Fast-start context for the next session. Read this file first, then open only the supporting docs relevant to the active slice.
> **Detailed reference:** `PROJECT-STATUS-REFERENCE.md` preserves the fuller implementation ledger, rollout history, verification notes, deployment runbook, and infrastructure rationale that used to live here.

> **Open polish note:** the live `/profile/[id]` header still needs one more pass on avatar click-target density. The clickable avatar boundary was tightened already, but the user still wants the avatar/content grouping to feel more compressed on that page specifically.

> **Session 91 note:** directory foundations are now live. `User` now supports opt-in directory inclusion, Prisma now includes `Organization` / `OrganizationMembership` plus structured organization child models, `/admin/organizations` now exists as a compact admin moderation/create surface, and `/directory` now reads real opted-in people plus approved organizations with unified results, yellow-pages-style type dropdown pills for businesses/organizations, sorting, and pagination.
>
> **Session 92 note:** after the directory rollout hit production, the live `/directory` runtime error was traced to the production database not yet having the new schema. The fix was a production `npx prisma db push --schema prisma/schema.prisma`, which added `users.isDirectoryListed` and the new `organizations` table set. Treat that schema push as required whenever deploying the new directory models to an environment that has not been updated yet.
>
> **Session 93 note:** the admin navigation order was tightened again so `Homepage Curation` now sits directly under `Dashboard` and `Users` sits directly under `Navigation`. `/admin/users` was also rebuilt into the same compact `admin-card` / `admin-list` paradigm used by `Articles`, `Events`, `Navigation`, and `Organizations`, now showing `Email`, real `Last Seen` from latest `LoginEvent`, `Vouched By` names, color-coded inline actions with icons, and an inline `Message` dialog that sends through `/api/messages`.
>
> **Session 94 note:** `/directory` people rows now expose a client-side `Message` action in the contact column for authenticated viewers, opening the same inline direct-message dialog pattern used on `/admin/users` and sending through `/api/messages` before routing into the conversation thread.
>
> **Session 95 note:** a Vercel deployment failure was traced to an unused `stats` state declaration in `/admin/users`; that dead state path was removed so `npm run typecheck` and `next build` pass again. Repo warning cleanup also tightened the `/admin/content` fetch effect dependency and intentionally suppressed `@next/next/no-img-element` in the current raw-image preview/upload surfaces so `npm run lint` is clean again.
>
> **Session 96 note:** the dedicated `/profile/edit` route was removed and its contents were folded into the owner-only `Account Settings` tab on `/profile/[id]`. That tab now appears first for the profile owner, the owner no longer sees the `About` tab, the public-facing content tabs were simplified to `Articles` and `Events`, locked identity fields now open a no-JS dialog-style popover instead of showing the old warning pill, the directory-listing control now sits at the top of the settings form, and the profile header metadata now reads `[community name] • Last seen: <date>` using the latest `LoginEvent`.
>
> **Session 97 note:** the public navigation bar now treats top-level categories with children as dropdown triggers only rather than clickable destinations, so users must choose a child category instead of landing on filler parent pages. The admin sidebar also now alternates row background tones to reduce visual monotony while preserving the compact operational layout.
>
> **Session 98 note:** invitation and outbound email planning is now documented in `INVITATION-EMAIL-PLAN.md`, covering the proposed trusted-member email invite flow, quota-aware outbound send queue, provider direction, and post-registration in-system vouch prompts.
>
> **Session 99 note:** outbound email foundations are now wired for Brevo via env-driven config, a reusable `src/lib/email.ts` transactional sender, `.env.example` / deployment-env validation coverage, and a protected admin test route at `/api/admin/email/test` for controlled verification before building invitations on top.
>
> **Session 100 note:** live Brevo testing confirmed the app can send transactional email, but first-send inbox placement hit Gmail spam. Treat outbound email as supporting infrastructure rather than the primary trust bootstrap. The current product conclusion is to prioritize in-product trust mechanisms like visible new-member presence and direct vouch-request flows over email-dependent onboarding.
>
> **Session 101 note:** trust bootstrap now has a first in-product implementation. `Category` supports `minTrustLevel` (default `ANONYMOUS`) so trusted-only nav items can stay DB-driven, and the new `/help-us-grow` route is now a trusted/staff-only stewardship surface showing same-community `REGISTERED` members with join dates plus per-row `Message` actions in the same table language as `/directory`. The message-thread header now also exposes `Vouch` when the other participant is still `REGISTERED`, and the vouch flow now treats elevated roles (`CONTRIBUTOR` and above) as trust-capable rather than requiring literal `TRUSTED`. Any environment receiving this change must run `npx prisma db push --schema prisma/schema.prisma` so `categories.minTrustLevel` exists before the categories APIs load.
>
> **Session 102 note:** the live app footer was simplified by removing the `Quick Links` column from `src/app/layout.tsx`, leaving the active footer on a tighter two-column layout with `Support` and `Highlander Today` only. The older unused `src/components/layout/Footer.tsx` was updated in parallel so its structure no longer drifts from the live footer language if that component is revisited later.
>
> **Session 103 note:** `/admin/events` now has a `+ Event` create tab matching the compact admin pattern used by organizations, including direct admin event creation, initial status selection, image upload, and an optional organization link with inline organization-name filtering. `Event` now carries optional `organizationId`, so any environment receiving this update must run `npx prisma db push --schema prisma/schema.prisma` before the new admin event flow can persist linked organizations.
>
> **Session 104 note:** event locations are now first-class shared records rather than freeform strings. Prisma now includes `Location`, `Event.locationId`, and optional `Event.venueLabel`; both `/admin/events` and `/events/submit` now create/select reusable structured locations inline, public/admin event surfaces now render canonical location data, and event search/homepage metadata now read from the shared location model. Any environment receiving this update must run `npx prisma db push --schema prisma/schema.prisma` so the new `locations` table and `events.locationId` column exist before the event flows load.
>
> **Session 105 note:** the first public organization detail slice is now live. Approved organizations now resolve at `/organizations/[slug]`, `/directory` organization rows now link into that canonical public page, and the new server-side organization loader centralizes approved/public filtering for organization details, locations, departments, contacts, roster visibility, and linked upcoming events. Organization custom domains and standalone shell behavior remain planned follow-on work documented in `ORGANIZATION-SITE-PLAN.md`.
>
> **Session 106 note:** `/admin/organizations/[id]` is now a real management surface rather than a read-only summary. Admins can now edit core organization profile fields plus locations, departments, contacts, and membership roster visibility/title state from one page, backed by new focused admin organization APIs under `/api/admin/organizations/[id]/*`. This is the first practical input layer for keeping the new public `/organizations/[slug]` page current; self-claim/self-management and custom-domain flows are still pending.
>
> **Session 107 note:** the unrelated JSX regression in `/events/submit` was corrected, restoring a clean verification baseline. `npm run lint` and `npm run typecheck` now pass again with the new public organization page and admin organization management surfaces in place.
>
> **Session 108 note:** `/admin/organizations/[id]` now uses the same compact admin-card tab language as the other major admin surfaces. The page header now reads `Organization > {name}` with the organization icon, the old summary stat cards were removed, the management UI is split into `Details`, `Locations`, `Departments`, `Contacts`, `Members`, and `Events`, the `Details` tab now supports banner-image upload for `bannerUrl`, and linked organization events are visible from the new `Events` tab with direct links into `/admin/events/[id]`. The `+ Organization` create tab on `/admin/organizations` was intentionally kept as a base-details-only creation form rather than inheriting the full detail-management tabs.

## Product Snapshot

Highlander Today is a multi-tenant local community platform focused first on **Cambria Heights / Cambria County, Pennsylvania**. It combines trusted local content, events, marketplace/storefronts, help wanted, messaging, moderation, and community identity.

The long-term goal is not “more features.” It is local digital infrastructure that residents actually use to answer:

- what is happening locally
- where can I get something
- who can help me
- how can I participate

Core platform assumptions:

- Trust levels: `ANONYMOUS -> REGISTERED -> TRUSTED -> SUSPENDED`
- Roles: `Reader -> Contributor -> Staff Writer -> Editor -> Admin -> Super Admin`
- Identity lock: once vouched, name + DOB become permanently read-only
- Multi-tenancy is by domain/slug
- Brand colors: Primary `#46A8CC`, Accent `#A51E30`

## Operating Principles

1. Prioritize complete user loops over horizontal feature spread.
2. Treat the home community as the proving ground; expansion only matters after real local adoption.
3. Preserve accountability and trust requirements in public interaction surfaces.
4. Keep the product legible as community infrastructure, not an extractive platform.
5. When in doubt, prefer fewer better-finished systems over more partially built ones.

## Current Product State

Major live foundations:

- Auth, permissions, trust, audit/activity logging, tenant-aware community resolution
- Profiles, vouching, blocking, private messaging
- Local Life articles: listing, submit, drafts, detail, moderation, comments, article preview
- Events: submit, moderation, public browse/detail, and shared structured locations
- Marketplace: store-based listings, storefronts, admin store moderation, trusted buyer messaging
- Help Wanted: public browse, trusted posting/responding, moderation, manage/edit flows
- Homepage curation, search, uploads, admin moderation surfaces
- Directory foundations: opted-in people, organization schema, organizations admin moderation/create, and public directory browse
- Roadmap and roadmap weighting exist but are now `SUPER_ADMIN`-only internal tooling

Current public/admin direction highlights:

- Public navbar now reads top-level categories and child dropdowns dynamically from the DB; `Home` remains fixed.
- Top-level public nav items that have children are now non-clickable dropdown triggers; users select a child category instead of navigating to a parent placeholder page.
- `/admin/content-architecture` exists as a read-only internal reference page.
- `/admin/organizations` now exists as a compact admin management surface aligned with the same dense operational paradigm as `/admin/articles` and `/admin/events`, and `/admin/organizations/[id]` now follows that same admin-card tab vocabulary for full organization management.
- `/admin/events` now supports both moderation and direct admin creation through the compact `+ Event` tab, and admin-created events can optionally link to an organization in the same community plus select or create a reusable structured location record.
- `/admin/categories` has effectively become the **Navigation Menu** admin surface, with compact table-style editing, expand/collapse for nested items, reorder controls, and an `Add Area` tab.
- `/admin/users` now matches that same compact admin pattern: dense table layout, email column, real last-seen timestamps from login activity, voucher names, colored/iconized manage actions, and inline admin messaging.
- The admin sidebar now uses shared nav-item classes/structure plus alternating row backgrounds to keep menu entries visually consistent, and `Events` is a top-level admin item alongside `Articles`, `Navigation`, and the other operational surfaces.
- The shared public shell uses the active `Youth Local` direction and the shared `InternalPageHeader` pattern.
- `/profile/[id]` now uses an owner-first account-settings flow: no separate edit page, owner-only `Account Settings` first, owner-hidden `About`, simplified `Articles` / `Events` tabs, privacy disclaimers on non-public fields, and `Last seen` header metadata sourced from latest `LoginEvent`.
- `/directory` is now a real read surface rather than a placeholder shell: it queries opted-in people plus approved organizations scoped to the active community, renders a unified sortable list, supports pagination, and treats `Businesses` / `Organizations` as yellow-pages-style type dropdown pills.
- Directory people rows now support direct messaging from the listing itself for authenticated viewers via the inline message dialog pattern already used in admin users.
- Trusted/staff-only trust-bootstrap is now live through `/help-us-grow`: same-community `REGISTERED` members are listed alphabetically with join dates and row-level messaging so existing trusted members can recognize people they know and start verification conversations inside the product.
- Message threads now expose a direct `Vouch` entry point in the header when the other participant is still `REGISTERED`, reducing the need to leave the conversation to complete trust escalation.
- The repo is back to a clean verification baseline: `npm run lint` and `npm run typecheck` now pass again after removing the dead `/admin/users` state and cleaning the current warning set.

## Highest-Signal Active Priorities

- Tighten the live `/profile/[id]` header spacing around the avatar/content grouping.
- Validate real-world usage of the live marketplace and Help Wanted loops instead of expanding scope prematurely.
- Implement first-party analytics/reaction instrumentation from `CONTENT-ANALYTICS-PLAN.md`.
- Continue the About/institutional-content track where it improves public trust and clarity.
- Preserve compact, dense operational design in admin rather than drifting toward spacious public-page layouts.
- Continue the directory build with public organization detail pages, richer organization editing, and later self-claim/self-management flows.
- Continue the organization presence build from the new `/organizations/[slug]` foundation toward richer organization editing, self-claim/self-management, and later custom-domain support.
- Validate whether `/help-us-grow` actually reduces manual admin vouching and where the next trust-bootstrap gaps remain.

## What Is Still Partial Or Pending

- Messaging attachments are not live.
- Experiences is still only partially real; non-event experience categories remain directional placeholders.
- Multi-tenant provisioning is only phase 1; there is no full Super Admin create/edit site/domain workflow yet.
- Cross-site sister-site pull-through is not implemented.
- Donations/transparency, sourcing/citations, creator network, and delivery/jobs remain planned follow-on work.
- Directory exists as an early live foundation now, with canonical public organization detail pages at `/organizations/[slug]` and richer admin organization editing at `/admin/organizations/[id]`, but self-claim/self-management flows are still pending.
- `Help Us Grow` is live as the first in-product trust-bootstrap loop, but it still lacks dismiss/not-known actions, stronger recognition hints, and an explicit admin exception path for genuine newcomers no one recognizes.
- Article video embeds are still pending and should land before any delivery/jobs push.

For the detailed milestone ladder and phase-by-phase remaining work, read `PROJECT-STATUS-REFERENCE.md`.

## Tech Stack And Local Setup

Stack:

- Next.js 14 App Router + TypeScript
- PostgreSQL 16 + Prisma
- NextAuth.js v4 with JWT sessions and **no PrismaAdapter**
- Tailwind CSS, TipTap, Sharp, Cloudflare R2, Jest/RTL, D3

Local bootstrap:

```bash
docker-compose up -d && npm run db:push && npx prisma db seed && npm run dev
```

Create the initial Super Admin explicitly with:

```bash
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

Important environment reminders:

- Local Postgres runs on `127.0.0.1:5433`
- Use `prisma/schema.prisma` only
- The DB is the source of truth for categories/navigation reads

For deployment/bootstrap/infrastructure detail, read `PROJECT-STATUS-REFERENCE.md`.

## Navigation And Information Architecture

Public navigation:

- `Home` is fixed
- Other top-level nav items come from `Category` rows where `parentCategoryId = null`
- Categories also now carry `minTrustLevel`, defaulting to `ANONYMOUS`, so top-level or child nav items can be hidden until the viewer reaches the required trust level.
- Top-level items with children render as dropdowns
- Child links use `?category=<slug>` unless there is an explicit route override
- `NavigationBar` now reads from the DB-backed categories API rather than a mixed hardcoded section list

Current content-section state:

- `Local Life` is live and DB-backed
- `Experiences` exists, but most non-event subcategories are still placeholders
- `About` is live with `Mission` and `Blog`; `/about/roadmap` is now Super Admin only
- `Community` can exist structurally in navigation if created in admin, but the full public `/community` section is still planned

## Key Repo Landmarks

```text
prisma/
  schema.prisma
  seed.ts
src/app/
  admin/
  api/
  directory/
  local-life/
  events/
  marketplace/
  help-wanted/
  messages/
  profile/
  search/
  layout.tsx
  page.tsx
src/components/
  admin/
  articles/
  layout/
  marketplace/
  messaging/
  shared/
src/lib/
  db.ts
  organization-taxonomy.ts
  permissions.ts
  search.ts
  homepage.ts
  community.ts
  tenant.ts
  category-config.ts
```

## High-Value Gotchas

1. Never re-add `PrismaAdapter`; it breaks the active JWT credential flow.
2. Most active APIs depend on middleware headers (`x-user-id`, `x-user-role`, `x-user-trust-level`, `x-client-ip`) rather than calling `getServerSession()`.
3. Import the database as `import { db } from '@/lib/db'`.
4. The live NextAuth config is `src/app/api/auth/[...nextauth]/route.ts`.
5. Canonical article behavior belongs under `/local-life/*`, not `/articles/*`.
6. Categories/navigation are DB-driven; do not hardcode top-level or Local Life category lists.
7. TipTap additions must stay on v2.x.
8. Uploads are JPEG/PNG/WebP/GIF only, up to 5MB.
9. Production uses Cloudflare R2 at `https://cdn.highlander.today`.
10. The repo still uses `prisma db push` style rollout rather than checked-in migrations.
11. The admin area is intentionally desktop-first and compact.
12. Production launch auth is credentials + Google OAuth; Facebook remains intentionally deferred.
13. The directory rollout requires the target environment to have the new Prisma schema applied. If `/directory` throws runtime Prisma errors about missing `organizations` or `users.isDirectoryListed`, run `npx prisma db push --schema prisma/schema.prisma` against that environment's database.
14. The trusted-nav / `Help Us Grow` rollout also requires the current Prisma schema to be applied. If category reads fail with missing `categories.minTrustLevel`, run `npx prisma db push --schema prisma/schema.prisma` against that environment before loading `/api/categories` or `/api/admin/categories`.
15. The admin event location/organization rollout also requires the current Prisma schema to be applied. If admin or public event creation fails because `locations` / `events.locationId` / `events.organizationId` are missing, run `npx prisma db push --schema prisma/schema.prisma` against that environment before using the new location selector or organization link flow.

For the full gotcha list, verification notes, and deployment constraints, read `PROJECT-STATUS-REFERENCE.md`.

## Supporting Docs

Use these instead of growing this file again:

- `PROJECT-STATUS-REFERENCE.md` — detailed implementation ledger, verification notes, deployment/bootstrap runbook, upload snapshot, and production infrastructure rationale
- `DESIGN-SYSTEM-ARCHITECTURE.md` — canonical shared UI vocabulary and layout/theming guidance
- `ADMIN-CONTENT-REFERENCE-PLAN.md` — admin content-model/reference system plan
- `COMMUNITY-SECTION-PLAN.md` — planned `Community` top-level section
- `CONTENT-ANALYTICS-PLAN.md` — first-party analytics/reaction plan
- `DIRECTORY-PLAN.md` — organization/directory direction
- `ORGANIZATION-SITE-PLAN.md` — public organization profile to organization-site and custom-domain direction
- `ORGANIZATION-PROFILE-PHASE-1-PLAN.md` — first implementation slice for the public organization profile page
- `INVITATION-EMAIL-PLAN.md` — invitation system and outbound transactional email direction
- `LOCAL-CREATOR-NETWORK-PLAN.md` — creator/show/episode direction
- `OBITUARIES-PLAN.md` — obituary/memorial system direction
- `MONETIZATION-PLAN.md` — funding/revenue sequencing
- `DONATIONS-TRANSPARENCY-PLAN.md` — donations/transparency direction
- `ARTICLE-SOURCING-PLAN.md` — citations/sourcing direction
- `highlander-today-spec.md` — deep product spec

## Session Instructions

1. Read this file first.
2. Open `PROJECT-STATUS-REFERENCE.md` only if you need the fuller implementation ledger, deployment notes, verification history, or infra rationale.
3. Read only the source files relevant to the active slice.
4. Preserve current canonical paths, schema assumptions, and DB-driven category/navigation behavior.
5. Update this file and/or the reference file after meaningful progress so the next session can resume cleanly.
