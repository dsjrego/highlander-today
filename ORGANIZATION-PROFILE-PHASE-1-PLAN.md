# Highlander Today — Organization Profile Phase 1 Plan

> **Status:** Implementation planning only. Not implemented.
> **Purpose:** Define the first shippable public organization profile page for the current repo, while preserving the longer-term organization-site and custom-domain direction.

---

## Phase 1 Goal

Ship a canonical public organization page at `/organizations/[slug]` for approved organizations.

Phase 1 should:

- give directory listings a real destination
- make approved organizations publicly legible beyond a single row in `/directory`
- reuse existing structured organization data already present in Prisma
- preserve the future path to manager editing, custom domains, and standalone org-site shells

Phase 1 should not try to solve self-management, custom-domain routing, or a visual site-builder.

---

## Current Repo Reality

Relevant existing foundations:

- `Organization`, `OrganizationMembership`, `OrganizationLocation`, `OrganizationDepartment`, and `OrganizationContact` already exist in [prisma/schema.prisma](/Users/dennisdestjeor/work/highlander-today/prisma/schema.prisma#L243)
- admin organization list and detail surfaces already exist under [src/app/admin/organizations/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/organizations/page.tsx) and [src/app/admin/organizations/[id]/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/organizations/[id]/page.tsx)
- `/directory` already queries approved organizations and scopes them to the current community in [src/app/directory/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/directory/page.tsx)
- current community/domain resolution already runs through [src/lib/community.ts](/Users/dennisdestjeor/work/highlander-today/src/lib/community.ts) and [src/lib/tenant.ts](/Users/dennisdestjeor/work/highlander-today/src/lib/tenant.ts)
- `Event` already supports `organizationId`, so public organization pages can surface linked events without a schema change

Implication:

- Phase 1 can be shipped without introducing `OrganizationDomain`
- Phase 1 can likely ship without any Prisma changes at all if the public page sticks to currently stored fields

---

## Scope

### In scope

- new public route: `/organizations/[slug]`
- approved-only public visibility
- page scoped to the active community
- public detail page driven by current organization models
- directory organization rows linking into the page
- event aggregation via existing `Event.organizationId`
- page structure designed so it can later render in both `platform` and `standalone` shell modes

### Out of scope

- organization self-claim
- organization manager editing
- org-domain mapping
- standalone host/domain rendering
- visual theming controls
- page builder / arbitrary block editing
- article, marketplace, or help-wanted org aggregation beyond what already exists naturally

---

## Route And Resolution

### Canonical route

Add:

- `src/app/organizations/[slug]/page.tsx`

Recommended behavior:

- resolve the current community via the existing `getCurrentCommunity()` path
- look up the organization by `communityId + slug`
- require `status = APPROVED`
- return `notFound()` when:
  - there is no current community
  - the slug does not exist in that community
  - the organization is not approved

This keeps the public route aligned with existing community scoping and avoids leaking pending/rejected records.

### Metadata

Add route metadata based on organization content:

- title: `${organization.name} | Highlander Today`
- description: organization description when present, otherwise a concise fallback

This is enough for Phase 1 and can later evolve for standalone-domain SEO behavior.

---

## Data Loader Shape

The page query should include only records that are public and useful to the visitor.

Recommended organization query:

- base organization fields:
  - `id`
  - `name`
  - `slug`
  - `description`
  - `logoUrl`
  - `bannerUrl`
  - `websiteUrl`
  - `contactEmail`
  - `contactPhone`
  - `directoryGroup`
  - `organizationType`
  - `isPublicMemberRoster`
  - `communityId`

- public locations:
  - where `isPublic = true`
  - ordered by `isPrimary desc`, then `sortOrder asc`, then `createdAt asc`

- public departments:
  - where `isPublic = true`
  - ordered by `sortOrder asc`, then `name asc`

- public contacts:
  - where `isPublic = true`
  - ordered by `sortOrder asc`, then `name asc`

- public roster:
  - only if `isPublicMemberRoster = true`
  - include memberships where:
    - `status = ACTIVE`
    - `isPublic = true`
  - select member name, membership role, title, and primary-contact flag

- linked events:
  - where `organizationId = organization.id`
  - public statuses only
  - upcoming first
  - keep the initial query small, for example 5 to 8 events

Recommended implementation shape:

- create a dedicated server-side loader/helper rather than burying all logic directly in the route file
- likely home for that helper: `src/lib/organizations.ts`

That helper can later be reused by:

- the platform route
- future standalone-domain route resolution
- future org edit previews

---

## UI Structure

Phase 1 should feel like a serious public presence page, not an admin detail dump.

Recommended top-level structure:

1. Header / hero
   Show logo/banner when available, organization name, type label, and a concise description.

2. About
   Use `description` as the core narrative block.

3. Contact
   Show website, email, phone when present.

4. Locations
   Show the primary location first, then additional public locations.

5. Departments
   Show public departments only if they exist.

6. Contacts
   Show public contacts only if they exist.

7. Upcoming Events
   Show a compact list of linked public events when present.

8. People
   Show only when `isPublicMemberRoster = true` and there are public active memberships.

Recommended UI constraints:

- use the existing public-page vocabulary, not admin-card density
- keep the page compatible with the shared Highlander shell
- avoid adding shell assumptions that would block future standalone-mode rendering

Good existing visual references:

- public internal pages using `InternalPageHeader`
- public event/detail and profile/detail surfaces for tone and shell behavior

---

## Directory Integration

Update `/directory` organization rows so they link to the new canonical public page.

Current gap:

- people rows already have `href`
- organization rows currently do not

Recommended change:

- include `slug` in the organization select in [src/app/directory/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/directory/page.tsx)
- set organization row `href` to `/organizations/${organization.slug}`

This is one of the main user-facing wins of Phase 1.

---

## Permission And Visibility Rules

Public route rules:

- anonymous users may view approved organization pages
- only `APPROVED` organizations render publicly
- only public child records render:
  - `OrganizationLocation.isPublic`
  - `OrganizationDepartment.isPublic`
  - `OrganizationContact.isPublic`
  - `OrganizationMembership.isPublic`

Roster rules:

- roster appears only when `Organization.isPublicMemberRoster = true`
- even then, only `ACTIVE` and `isPublic = true` memberships should be shown

No owner/admin bypass is needed in the Phase 1 public route.

Admin and future manager previews can be handled separately later.

---

## Suggested File Plan

Likely files to add:

- `src/app/organizations/[slug]/page.tsx`
- `src/lib/organizations.ts`

Likely files to update:

- `src/app/directory/page.tsx`
- optionally [PROJECT-STATUS.md](/Users/dennisdestjeor/work/highlander-today/PROJECT-STATUS.md) after implementation lands

Optional shared component extraction if the page grows:

- `src/components/organizations/OrganizationProfilePage.tsx`

Phase 1 does not require a component extraction up front if the page remains compact and readable.

---

## Prisma Changes

Recommended default:

- no Prisma/schema change for Phase 1

Reason:

- the current schema already has enough data shape for a useful first public page

Optional additions only if the implementation clearly needs them:

- `tagline`
- `primaryCtaLabel`
- `primaryCtaUrl`

These should be considered only after the first page structure is working and only if they materially improve the first release.

---

## Verification Checklist

Minimum verification after implementation:

- `npm run lint`
- `npm run typecheck`
- manual route checks for:
  - approved organization renders on `/organizations/[slug]`
  - pending/rejected organization returns 404
  - organization page is community-scoped
  - `/directory` organization rows link correctly
  - roster hides when disabled
  - non-public locations/departments/contacts/memberships do not render
  - linked events render only when public and relevant

Useful manual content cases:

- business with one location and no departments
- government entity with multiple departments and contacts
- organization with public roster enabled
- organization with no logo/banner/contact fields

---

## Phase 1 Risks

### Risk: page drifts into admin detail styling

Mitigation:

- treat this as a public destination page from the start
- use public design patterns, not `admin-card` composition

### Risk: overbuilding for custom domains too early

Mitigation:

- keep the page renderer shell-aware in concept, but do not add domain infrastructure in this phase

### Risk: leaking non-public child records

Mitigation:

- enforce `isPublic` and membership-status filtering directly in the server query

### Risk: route identity confusion later

Mitigation:

- make `/organizations/[slug]` canonical now
- keep the future custom-domain system as an alternate host that resolves to the same page

---

## Explicit Defers For The Next Phase

After Phase 1, the next most natural follow-on work is:

1. richer organization editing and moderation controls
2. self-claim / self-management workflow
3. `OrganizationDomain` schema and host resolution
4. standalone shell mode

This order preserves trust and moderation before infrastructure complexity.

---

## Current Decision Summary

- Phase 1 should ship a public canonical organization page at `/organizations/[slug]`.
- The page should use the existing organization schema and require no domain infrastructure yet.
- The route should be community-scoped and approved-only.
- The page should render only public child records and optional public roster data.
- `/directory` should link organization rows into this page.
- A shared organization-page loader should be introduced now so future standalone-domain rendering reuses the same data path.
- Phase 1 should stay narrow and deliberately defer self-management, domain mapping, and site-builder behavior.
