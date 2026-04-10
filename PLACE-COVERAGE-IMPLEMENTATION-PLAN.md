# Place Coverage Implementation Plan

> **Last updated:** 2026-04-09
> **Status:** Implementation plan for the first build pass. Not yet built.
> **Depends on:** `PLACE-COVERAGE-PLAN.md`

## Purpose

This document turns the place/coverage strategy into an implementation sequence that can be built against the current Highlander Today codebase.

It is intentionally scoped to a first practical rollout, not the final statewide geography system in one pass.

The implementation goal is to ship a usable foundation for:

- canonical place storage
- tenant-to-place service mapping
- early user location capture
- observed geo aggregation from existing login-IP data
- `SUPER_ADMIN` geographic-density reporting

## Current-Code Fit

The implementation should align with the current repo structure rather than inventing a separate onboarding or admin system.

Current relevant anchors:

- users already belong to communities/tenants through `UserCommunityMembership`
- user profile reads/writes already exist in `src/app/api/profile/route.ts`
- date-of-birth completion already has an early trust-completion route at [src/app/(auth)/complete-trust/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/(auth)/complete-trust/page.tsx)
- login IP, city, region, and country are already captured in login-event logging
- admin surfaces already prefer compact list-first operational UIs

This means the place/coverage system should extend:

- Prisma schema
- profile API
- early account-completion flow
- `SUPER_ADMIN` admin surfaces

Not replace them.

## Implementation Decision Summary

### 1. Place data should be global, not tenant-owned

`Place` should be a shared canonical table, not a per-community table.

Reason:

- the same borough or county may matter to multiple current or future tenants
- statewide growth becomes much simpler
- observed-geo matching should target a shared place catalog

### 2. Tenant service areas should remain separate from place records

`TenantCoverageArea` should relate an existing tenant/community to one or more places.

Reason:

- a tenant serves places; it is not identical to a place

### 3. User location should be a relationship model, not a field bolted onto `User`

Use `UserPlaceRelationship` rather than adding only one `user.placeId`.

Reason:

- users may have a current place and also meaningful connected places
- future community tie reporting depends on this flexibility

### 4. Observed geo should be aggregated from login events, not stored as raw place rows

Use a separate `ObservedGeoLocation` aggregate model.

Reason:

- IP geo is lower confidence
- the current login-event table already stores raw event data
- expansion reporting needs aggregated distinct-user signals, not only per-login rows

### 5. Early location capture should piggyback on trust/profile completion

Use the existing DOB/trust-completion moment and profile APIs rather than building a separate onboarding wizard.

Reason:

- launch is near
- the platform already expects early completion of core identity fields
- this reduces implementation spread

## Phase 1: Prisma Foundation

### New models

Recommended first schema pass:

- `Place`
- `PlaceAlias`
- `TenantCoverageArea`
- `UserPlaceRelationship`
- `ObservedGeoLocation`

Recommended future, but not required for v1:

- `ObservedGeoLocationUser` if you later want pre-aggregated distinct-user membership rows

### Recommended enums

`PlaceType`

- `BOROUGH`
- `TOWNSHIP`
- `TOWN`
- `CITY`
- `COUNTY`
- `REGION`
- `STATE`
- `COUNTRY`

`TenantCoverageType`

- `PRIMARY`
- `SECONDARY`
- `EMERGING`
- `WATCHLIST`

`UserPlaceRelationshipType`

- `CURRENT_RESIDENT`
- `FORMER_RESIDENT`
- `FROM_HERE`
- `FAMILY_IN`
- `WORKS_IN`
- `OWNS_PROPERTY_IN`
- `CARES_ABOUT`

`UserPlaceSource`

- `USER_SELECTED`
- `ADMIN_SET`
- `MIGRATED`

`ObservedGeoReviewStatus`

- `UNMATCHED`
- `MATCHED_TO_PLACE`
- `IGNORE`
- `READY_FOR_CURATION`
- `PROMOTED`

### Minimal v1 schema guidance

#### `Place`

Core required fields:

- `id`
- `name`
- `displayName`
- `slug`
- `type`
- `countryCode`
- `admin1Code` nullable
- `admin1Name` nullable
- `admin2Name` nullable
- `parentPlaceId` nullable
- `isSelectable`
- `isActive`
- timestamps

Indexes:

- `slug`
- `type`
- `countryCode`
- `parentPlaceId`
- composite search helpers as needed later

#### `PlaceAlias`

Core fields:

- `id`
- `placeId`
- `alias`
- `aliasType` nullable
- `isSearchable`

Indexes:

- `placeId`
- `alias`

#### `TenantCoverageArea`

Core fields:

- `id`
- `communityId`
- `placeId`
- `coverageType`
- `isPrimary`
- `isActive`
- `notes` nullable
- timestamps

Indexes:

- `communityId`
- `placeId`
- unique on active duplicate prevention if desired

#### `UserPlaceRelationship`

Core fields:

- `id`
- `userId`
- `placeId` nullable
- `relationshipType`
- `isPrimary`
- `isCurrent`
- `fallbackLocationText` nullable
- `source`
- timestamps

Indexes:

- `userId`
- `placeId`
- `relationshipType`

#### `ObservedGeoLocation`

Core fields:

- `id`
- `normalizedLabel`
- `city` nullable
- `region` nullable
- `country` nullable
- `matchedPlaceId` nullable
- `reviewStatus`
- `firstSeenAt`
- `lastSeenAt`
- `loginCount`
- `distinctUserCount`
- timestamps

Indexes:

- `normalizedLabel`
- `matchedPlaceId`
- `reviewStatus`

### Migration guidance

This should be a normal Prisma migration rather than a large mixed refactor.

Recommended first migration scope:

- only the new place/coverage models and enums

Do not mix unrelated schema cleanup into this migration.

## Phase 2: Seed And Import

### Scope

Because statewide expansion is a real near-term goal, seed Pennsylvania civic places early.

Recommended seed contents for v1:

- all Pennsylvania counties
- all Pennsylvania boroughs
- all Pennsylvania townships
- all Pennsylvania cities

### Import direction

Use an authoritative civic-data source for initial import, then normalize into the repo's `Place` schema.

Recommended import output:

- canonical `Place` rows
- county parent relationships
- stable slugs
- known alias seeds where obvious

### Seed strategy

Recommended implementation:

- separate import script or seed module
- idempotent upsert behavior
- no hand-entering the Pennsylvania municipality catalog in code

## Phase 3: API Layer

### New APIs

Recommended v1 APIs:

- `GET /api/places`
- `GET /api/admin/places`
- `POST /api/admin/places`
- `PATCH /api/admin/places/[id]`
- `GET /api/admin/tenant-coverage`
- `POST /api/admin/tenant-coverage`
- `PATCH /api/admin/tenant-coverage/[id]`
- `GET /api/admin/observed-geo`
- `PATCH /api/admin/observed-geo/[id]`

### Extend existing profile API

Extend [src/app/api/profile/route.ts](/Users/dennisdestjeor/work/highlander-today/src/app/api/profile/route.ts) rather than creating a duplicate location-only user API.

Recommended additions:

- include current place relationship in `GET`
- allow current place selection in `PATCH`
- allow connected places in `PATCH`
- allow fallback text when no place is selected

Recommended validation rules:

- require either `placeId` or `fallbackLocationText` for current location
- do not allow both blank if location prompt is being completed
- allow connected places to remain optional

### Place search behavior

`GET /api/places` should support:

- query text
- optional type filter
- optional country/state filter
- result prioritization for current tenant coverage places later

Search should include:

- `Place.name`
- `Place.displayName`
- searchable aliases

## Phase 4: Early User Location Capture

### Recommended first-pass surface

Reuse the existing trust/profile completion path centered on DOB.

There are two reasonable implementation options:

1. Extend the current `/complete-trust` flow into a broader early completion form.
2. Trigger a separate lightweight profile-completion prompt after login when DOB or current place is missing.

Recommended v1 choice:

- keep `/complete-trust` focused on DOB if you want minimal risk
- add a lightweight post-login profile-completion gate or modal for current location immediately after

Recommended v1.5 choice:

- unify DOB and location into one early completion surface once the place APIs are stable

This keeps the trust flow safer while still capturing location early.

### Required data to capture

Required:

- current location as structured place or fallback text

Optional:

- up to 3 connected communities

### UX sequence

Recommended sequence:

1. User signs in.
2. If DOB is missing and required, current trust completion runs.
3. If current location is missing, show the location-completion prompt.
4. User can continue after setting current location.

### Location prompt fields

Required field:

- `Where do you live now?`

Behavior:

- typeahead place search
- if no match, reveal fallback text field

Optional field:

- `Which local communities matter most to you?`

Behavior:

- searchable multi-select
- up to 3 places

### Data-writing behavior

On submit:

- upsert one `UserPlaceRelationship` row with `CURRENT_RESIDENT`, `isPrimary = true`, `isCurrent = true`
- upsert optional connected-place rows with the chosen relationship type or a generic `CARES_ABOUT` in v1
- do not delete historical non-current ties unless explicitly replaced

## Phase 5: `SUPER_ADMIN` Place Management UI

### Route recommendation

Recommended routes:

- `/admin/places`
- `/admin/coverage`
- `/admin/observed-geo`

These should be `SUPER_ADMIN` only.

### UI pattern

Use the existing compact `admin-list` style, not spacious cards.

Recommended `Places` surface:

- `List`
- `+ Place`

Recommended `Coverage` surface:

- tenant filter at top
- list of current service places
- add-place typeahead inline

Recommended `Observed Geo` surface:

- default sort by distinct users desc
- one-row actions for match, ignore, promote

## Phase 6: Tenant Coverage Management

### Core rule

Tenants should map to many places, not to one flat geography string.

### UI behavior

For a selected tenant/community:

- show existing coverage rows
- let `SUPER_ADMIN` search and add canonical places
- assign coverage type
- mark active/inactive
- mark primary

### Reporting use

This coverage map becomes the basis for:

- "inside current served footprint"
- "adjacent to current served footprint"
- "outside current served footprint"

logic later.

## Phase 7: Observed Geo Aggregation

### Data source

Use the existing login event data:

- IP
- city
- region
- country

### Aggregation strategy

Do not query raw login rows directly for every dashboard page load.

Recommended v1:

- nightly or periodic aggregation job into `ObservedGeoLocation`

Alternative v1 if needed quickly:

- on-demand query for a first pass, then replace with aggregation

Recommended normalized key:

- `city|region|country`
or
- `region|country` when city is missing
or
- `country` when only country exists

### Distinct-user counting

Distinct-user count should be based on unique `userId`, not number of logins.

This is essential for the expansion dashboard.

## Phase 8: `SUPER_ADMIN` Geography Dashboard

### Route recommendation

Recommended route:

- `/admin/geography`

`SUPER_ADMIN` only.

### v1 dashboard sections

Recommended sections:

- declared current residents by place
- connected users by place
- observed reach by unmatched and matched geo
- emerging clusters
- coverage gaps

### Minimum viable metrics

For each place:

- distinct users
- 30-day active users
- trusted users
- contributors
- observed distinct users
- current tenant coverage status

### Ranking logic

Recommended default ranking priority:

1. distinct current residents
2. 30-day active users
3. trusted-user count
4. contributor count
5. observed distinct-user reinforcement

Raw logins and pageviews should be secondary drill-down data only.

### Suggested v1 output style

Start with list/table reporting, not maps.

Maps are visually attractive but often weaker operationally at this stage. A sortable list will be more actionable.

## Milestone Order

Recommended coding order:

1. Prisma models and migration
2. Pennsylvania place import/seed
3. `GET /api/places` search endpoint
4. profile API extension for location
5. user location prompt
6. `SUPER_ADMIN` places UI
7. `SUPER_ADMIN` tenant coverage UI
8. observed geo aggregation
9. `SUPER_ADMIN` observed geo UI
10. `SUPER_ADMIN` geography dashboard

## Testing Guidance

### Schema and seed

- verify place import idempotency
- verify parent-child relationships
- verify slug uniqueness behavior

### Profile and onboarding

- user can set current place by canonical place
- user can set fallback text when unmatched
- user can add connected communities
- location completion does not break existing DOB completion

### Admin

- only `SUPER_ADMIN` can access place/coverage/geography surfaces
- tenant coverage updates persist correctly
- observed geo matching does not auto-create user-selectable places without explicit admin action

### Reporting

- dashboard counts distinct users correctly
- one heavy user's repeated activity does not distort ranking
- matched vs unmatched observed geo stays separated

## Immediate Open Questions To Lock During Build

These do not block implementation start, but they should be decided early in the build:

1. Should the first location prompt be hard-blocking until complete, or skippable with reminder?

Recommended answer:

- required for current location, skippable only in narrow edge cases if needed

2. Should connected communities launch in the same release as current location?

Recommended answer:

- yes if low-cost; otherwise current location first, connected communities immediately after

3. Should `ObservedGeoLocation` be updated asynchronously or computed on dashboard load first?

Recommended answer:

- dashboard-load query first if faster to ship, then move to aggregated table if performance or complexity requires

4. Should out-of-state canonical places be seeded now?

Recommended answer:

- no; use fallback text first, then curate repeated external places later

## Canonical Build Conclusion

The team is ready to implement v1.

The correct first pass is:

- shared canonical Pennsylvania place data
- separate tenant coverage mapping
- early user current-location capture
- IP-derived observed geo as a lower-confidence signal
- `SUPER_ADMIN` density-based reporting

This is enough to make geography operational before launch without trying to build the entire future statewide system in one pass.
