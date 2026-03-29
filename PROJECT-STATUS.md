# Highlander Today — Project Status

> **Last updated:** 2026-03-29 (session 96)
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
- Events: submit, moderation, public browse/detail
- Marketplace: store-based listings, storefronts, admin store moderation, trusted buyer messaging
- Help Wanted: public browse, trusted posting/responding, moderation, manage/edit flows
- Homepage curation, search, uploads, admin moderation surfaces
- Directory foundations: opted-in people, organization schema, organizations admin moderation/create, and public directory browse
- Roadmap and roadmap weighting exist but are now `SUPER_ADMIN`-only internal tooling

Current public/admin direction highlights:

- Public navbar now reads top-level categories and child dropdowns dynamically from the DB; `Home` remains fixed.
- `/admin/content-architecture` exists as a read-only internal reference page.
- `/admin/organizations` now exists as a compact admin management surface aligned with the same dense operational paradigm as `/admin/articles` and `/admin/events`.
- `/admin/categories` has effectively become the **Navigation Menu** admin surface, with compact table-style editing, expand/collapse for nested items, reorder controls, and an `Add Area` tab.
- `/admin/users` now matches that same compact admin pattern: dense table layout, email column, real last-seen timestamps from login activity, voucher names, colored/iconized manage actions, and inline admin messaging.
- The admin sidebar now uses shared nav-item classes/structure to keep menu entries visually consistent, and `Events` is a top-level admin item alongside `Articles`, `Navigation`, and the other operational surfaces.
- The shared public shell uses the active `Youth Local` direction and the shared `InternalPageHeader` pattern.
- `/profile/[id]` now uses an owner-first account-settings flow: no separate edit page, owner-only `Account Settings` first, owner-hidden `About`, simplified `Articles` / `Events` tabs, privacy disclaimers on non-public fields, and `Last seen` header metadata sourced from latest `LoginEvent`.
- `/directory` is now a real read surface rather than a placeholder shell: it queries opted-in people plus approved organizations scoped to the active community, renders a unified sortable list, supports pagination, and treats `Businesses` / `Organizations` as yellow-pages-style type dropdown pills.
- Directory people rows now support direct messaging from the listing itself for authenticated viewers via the inline message dialog pattern already used in admin users.
- The repo is back to a clean verification baseline: `npm run lint` and `npm run typecheck` now pass again after removing the dead `/admin/users` state and cleaning the current warning set.

## Highest-Signal Active Priorities

- Tighten the live `/profile/[id]` header spacing around the avatar/content grouping.
- Validate real-world usage of the live marketplace and Help Wanted loops instead of expanding scope prematurely.
- Implement first-party analytics/reaction instrumentation from `CONTENT-ANALYTICS-PLAN.md`.
- Continue the About/institutional-content track where it improves public trust and clarity.
- Preserve compact, dense operational design in admin rather than drifting toward spacious public-page layouts.
- Continue the directory build with public organization detail pages, richer organization editing, and later self-claim/self-management flows.

## What Is Still Partial Or Pending

- Messaging attachments are not live.
- Experiences is still only partially real; non-event experience categories remain directional placeholders.
- Multi-tenant provisioning is only phase 1; there is no full Super Admin create/edit site/domain workflow yet.
- Cross-site sister-site pull-through is not implemented.
- Donations/transparency, sourcing/citations, creator network, and delivery/jobs remain planned follow-on work.
- Directory exists as an early live foundation now, but public organization detail pages, richer organization editing, and self-claim/self-management flows are still pending.
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

For the full gotcha list, verification notes, and deployment constraints, read `PROJECT-STATUS-REFERENCE.md`.

## Supporting Docs

Use these instead of growing this file again:

- `PROJECT-STATUS-REFERENCE.md` — detailed implementation ledger, verification notes, deployment/bootstrap runbook, upload snapshot, and production infrastructure rationale
- `DESIGN-SYSTEM-ARCHITECTURE.md` — canonical shared UI vocabulary and layout/theming guidance
- `ADMIN-CONTENT-REFERENCE-PLAN.md` — admin content-model/reference system plan
- `COMMUNITY-SECTION-PLAN.md` — planned `Community` top-level section
- `CONTENT-ANALYTICS-PLAN.md` — first-party analytics/reaction plan
- `DIRECTORY-PLAN.md` — organization/directory direction
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
