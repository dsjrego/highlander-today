# Place Coverage and Geographic Reach Plan

> **Last updated:** 2026-04-09
> **Status:** Strategic and data-model planning document. Not yet built.

## Purpose

This document defines the recommended geography, service-area, and expansion-intelligence model for Highlander Today.

The goal is not only to know which tenant a user currently touches. The platform also needs to understand:

- where people actually live now
- which places they care about
- which places a tenant intentionally serves
- where usage density is emerging even before a new tenant exists
- how to expand without confusing tenant membership with real-world geography

The founding `Highlander Today` concept was anchored in the Cambria Heights area and borrowed identity from the Cambria Heights school-district framing. That naming choice was useful for the initial concept, but school districts should not become the primary geography model for long-term statewide expansion.

The long-term geography model should be civic/place-based first:

- borough
- township
- town
- city
- county
- region when needed

## Why This Is Needed

The current tenant/community model does not fully answer the geographic questions the product needs over time.

A tenant can tell the platform:

- what site or brand someone is using

But it cannot by itself tell the platform:

- where a user actually lives
- whether a user is in or outside the current service area
- whether an out-of-area user is part of a meaningful cluster
- whether a future tenant should be considered for a nearby place
- whether traffic from a place reflects one heavy user or many distinct users

Those must be modeled separately.

## Core Principles

### Tenant Is Not Geography

A tenant is a site/publication boundary, not a substitute for real-world place identity.

### Place Is Canonical

Place data should be curated and structured, not primarily free text.

### Friction Should Stay Low

Users should be able to identify where they are without feeling excluded or confronted with a rigid local-only gate.

### Outside-Area Users Still Matter

A person living in Pittsburgh, Florida, or Montana may still be deeply connected to Patton, Carrolltown, or Cambria County. The system should capture that without pretending they are current local residents.

### Observed Geo Is A Signal, Not Truth

IP-derived geography is useful for expansion intelligence and security, but should not become the canonical user location and should not auto-create user-selectable places.

### Expansion Should Follow Density, Not Noise

One highly active user in a distant place should not outweigh many moderately active users clustered in a more relevant place.

## Canonical Model Direction

The recommended model uses four related concepts:

- `Place`
- `TenantCoverageArea`
- `UserPlaceRelationship`
- `ObservedGeoLocation`

These are distinct and should remain distinct.

## `Place`

`Place` is the canonical structured geography model.

It should be designed so it can support Pennsylvania now and broader U.S. or international growth later, even if the initial practical rollout is Pennsylvania-first.

Recommended fields:

- `id`
- `name`
- `displayName`
- `slug`
- `type`
- `countryCode`
- `admin1Code`
- `admin1Name`
- `admin2Name`
- `parentPlaceId`
- `isSelectable`
- `isActive`
- `latitude` nullable
- `longitude` nullable
- `createdAt`
- `updatedAt`

Recommended `type` examples:

- `BOROUGH`
- `TOWNSHIP`
- `TOWN`
- `CITY`
- `COUNTY`
- `REGION`
- `STATE`
- `COUNTRY`

The system should not hardcode Pennsylvania-specific assumptions into the underlying place model. Pennsylvania civic place types can be a strong early seeded taxonomy without becoming the only worldview the schema can express.

## `PlaceAlias`

Some locations will need alternate names, historical names, and shorthand support.

Recommended examples:

- Northern Cambria / Spangler
- local abbreviations
- historical naming differences

Recommended fields:

- `placeId`
- `alias`
- `aliasType`
- `isSearchable`

This should be added early enough that search can be forgiving without sacrificing clean canonical place identity.

## `TenantCoverageArea`

This model defines which places a tenant intentionally serves.

Recommended fields:

- `tenantId` or `communityId`
- `placeId`
- `coverageType`
- `isPrimary`
- `isActive`
- `notes`

Recommended `coverageType` examples:

- `PRIMARY`
- `SECONDARY`
- `EMERGING`
- `WATCHLIST`

Examples:

- Highlander Today may have `PRIMARY` coverage for a Cambria Heights-area cluster of boroughs and townships.
- Northern Cambria may begin as `WATCHLIST` or `EMERGING` if usage grows before a dedicated tenant exists.

This lets the platform represent service intent cleanly without pretending every user in the system is already in the tenant's primary footprint.

## `UserPlaceRelationship`

This model captures the user's declared location and declared ties to places.

Recommended fields:

- `userId`
- `placeId` nullable
- `relationshipType`
- `isPrimary`
- `isCurrent`
- `fallbackLocationText` nullable
- `source`
- `createdAt`
- `updatedAt`

Recommended `relationshipType` examples:

- `CURRENT_RESIDENT`
- `FORMER_RESIDENT`
- `FROM_HERE`
- `FAMILY_IN`
- `WORKS_IN`
- `OWNS_PROPERTY_IN`
- `CARES_ABOUT`

Recommended `source` examples:

- `USER_SELECTED`
- `ADMIN_SET`
- `MIGRATED`

Important rule:

- user-declared place should be the highest-confidence product signal for where a user says they are or what communities matter to them

## Fallback Text For Outside Or Unmatched Location

The product should not force every user into a structured place selection when that would create friction or exclusion.

Recommended flow:

- if the user finds a matching canonical place, store the `placeId`
- if the user is outside the current coverage area or cannot find a match, allow lightweight text entry

Examples:

- `Middleburg, FL`
- `Montana`
- `Southwest`

Important rule:

- fallback text should not automatically become a canonical place

It should remain attached to the user relationship as low-structure data until an admin decides it is worth normalizing.

This keeps onboarding easy without polluting the place model.

## `ObservedGeoLocation`

This model captures place-like signals inferred from login IP geolocation and similar system-observed data.

This should be a separate signal layer, not the canonical geography table.

Recommended fields:

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

Recommended `reviewStatus` examples:

- `UNMATCHED`
- `MATCHED_TO_PLACE`
- `IGNORE`
- `READY_FOR_CURATION`
- `PROMOTED`

Recommended rule:

- observed geo should never directly create a new selectable `Place`
- observed geo should never overwrite a user-declared place
- observed geo should be available to admins as a discovery and expansion signal

## Relationship To Existing Login IP Data

The platform already records login IP and best-effort geolocation data for security and anomaly detection.

That data should also inform geographic reach analysis, but in a lower-confidence lane.

Recommended use:

- aggregate repeated geo observations by normalized city/region/country
- identify recurring unmatched places
- identify distinct-user clusters outside current service areas
- help Super Admin understand travel, reach, and emerging audience pockets

Recommended non-use:

- do not treat login IP geo as a canonical residence field
- do not create user-selectable places automatically from IP data
- do not assume all observed places reflect stable user residence

## Initial Data Scope

Because the statewide goal is real within 12-18 months, the system should be designed for statewide structured place coverage early rather than remaining hyper-local only.

Recommended early seed scope:

- all Pennsylvania counties
- all Pennsylvania boroughs
- all Pennsylvania townships
- all Pennsylvania cities

Possible later additions:

- towns or CDPs where useful
- regions
- out-of-state canonical places for repeated neighboring or diaspora relevance

Recommended product stance:

- statewide-capable data model now
- region-first UX priority now

That means search results and relevance can prioritize current service-area places without limiting the underlying data model to them.

## User Experience Direction

### Onboarding

Keep the flow lightweight.

Recommended required question:

- `Where do you live now?`

Recommended behavior:

- search/select from canonical `Place`
- if unmatched or outside service area, allow text fallback

Recommended optional question:

- `Which local communities matter most to you?`

This should allow 1-3 optional structured place selections for ties such as:

- from here
- family here
- works here
- owns property here
- cares about this place

### Profile Settings

Users should be able to edit:

- current place
- connected places
- out-of-area fallback text where relevant

This keeps the data current without making signup overly heavy.

### Tone

The wording should not imply exclusion.

Good examples:

- `Where do you live now?`
- `Which local communities are you connected to?`
- `If you live outside the current coverage area, you can just type your location.`

Avoid wording that makes users think:

- `This site is not for me`
- `I should leave because I do not match the service area exactly`

## Launch-Critical Product Surfaces

Because launch is near and future expansion depends on clean place intelligence, the first implementation should focus on three concrete surfaces:

- `SUPER_ADMIN` tenant/place management
- early user location capture
- `SUPER_ADMIN` geographic-density reporting

These are the minimum operational surfaces needed to make the place model useful before broader statewide rollout.

### 1. `SUPER_ADMIN` Tenant And Place Management

The system needs a dedicated `SUPER_ADMIN` interface for managing canonical places and relating tenants/sites to those places.

This should not be hidden inside a generic settings panel. It is foundational platform infrastructure and should be visible as its own management area.

Recommended responsibilities:

- create, edit, archive, and search `Place` records
- manage `PlaceAlias` records
- mark places as selectable or non-selectable
- relate tenants to served places through `TenantCoverageArea`
- define which places are `PRIMARY`, `SECONDARY`, `EMERGING`, or `WATCHLIST`
- view recurring unmatched observed geos and decide whether to map, ignore, or promote them

Recommended top-level admin areas:

- `Places`
- `Tenant Coverage`
- `Observed Geo`

#### `Places` screen

Recommended list-first behavior:

- filter by name, alias, county, state, country, and type
- filter by `isSelectable` and `isActive`
- show parent place and type in the list row
- allow inline navigation to a detail/edit page

Recommended row columns:

- `Name`
- `Type`
- `Parent / County`
- `Selectable`
- `Active`
- `Aliases`
- `Action`

Recommended create/edit fields:

- name
- display name
- type
- country
- admin1
- admin2
- parent place
- selectable toggle
- active toggle
- aliases

#### `Tenant Coverage` screen

Recommended purpose:

- attach places to a tenant/site and define actual service intent

Recommended behavior:

- choose a tenant
- view all attached coverage places
- add place relations through typeahead search
- assign `coverageType`
- mark one or more places as primary
- archive or downgrade coverage without deleting the place itself

Recommended row columns:

- `Place`
- `Type`
- `Coverage`
- `Primary`
- `Active`
- `Action`

This screen should make it easy for `SUPER_ADMIN` to represent that a tenant serves a cluster of municipalities without equating the tenant itself with any one municipality.

#### `Observed Geo` screen

Recommended purpose:

- turn IP-derived geography into a curated review queue instead of a silent log

Recommended list behavior:

- sort by distinct users descending by default
- filter by review status
- filter by country/region
- show whether the candidate is already matched to a canonical place

Recommended row columns:

- `Observed Label`
- `City`
- `Region`
- `Country`
- `Distinct Users`
- `Logins`
- `Matched Place`
- `Status`
- `Action`

Recommended row actions:

- `Match to Place`
- `Create Place`
- `Ignore`

Important rule:

- `Create Place` from observed geo should still be a curated action, not an automatic system side effect

### 2. Early User Location Capture

The user location prompt should be introduced early, but not in a way that feels like a long onboarding funnel.

The best current fit is the same early account-completion phase where the product already pushes users to provide date of birth for trust progression and later vouching.

This does not need to happen on the literal first page load after registration. It should happen in the early post-signup completion flow before the account feels settled.

Recommended product goal:

- capture a usable current place signal before the user disappears

Recommended required field:

- `Where do you live now?`

Recommended behavior:

- typeahead search against canonical places
- if no match or outside current service area, reveal fallback text entry
- save as `CURRENT_RESIDENT` with either `placeId` or `fallbackLocationText`

Recommended optional field:

- `Which local communities matter most to you?`

Recommended behavior:

- allow up to 3 place selections
- relationship labels can be simplified in UI even if stored structurally later

Examples:

- `I grew up here`
- `My family is here`
- `I work here`
- `I care about this area`

#### Why pair this with DOB/profile completion

The current platform already has a meaningful early-account-completion expectation around date of birth because it matters for identity lock and vouching.

Adding location here is appropriate because:

- it is important for trust, service relevance, and future growth
- users are already in a mindset of completing core account data
- the prompt can be framed as helping the platform serve them better rather than as surveillance or exclusion

#### Tone guidance

Recommended framing:

- `Help us understand what community you're in and what places matter to you.`

Avoid framing that implies:

- location must be inside the current footprint
- out-of-area users are second-class
- the user should leave if they do not match the current brand geography

#### Early profile-completion UX recommendation

Recommended early completion checklist:

- date of birth
- current location
- optional connected communities
- optional profile photo and short bio later

Location should be early enough to be useful, but should not become a multi-step geography survey.

### 3. `SUPER_ADMIN` Geographic Usage Dashboard

The system needs a dedicated `SUPER_ADMIN` reporting interface for geographic traction and expansion intelligence.

This is not just an audit page. It is an operational planning surface for deciding where future coverage or tenants may make sense.

Recommended top-level sections:

- `Declared Users`
- `Observed Reach`
- `Emerging Clusters`
- `Coverage Gaps`

#### `Declared Users`

Purpose:

- show where users say they live and what places they are tied to

Recommended columns:

- `Place`
- `Current Residents`
- `Connected Users`
- `Trusted Users`
- `Contributors`
- `30-Day Active Users`
- `Trend`

#### `Observed Reach`

Purpose:

- show repeated IP-derived geography patterns without pretending they are canonical user residence

Recommended columns:

- `Observed Location`
- `Distinct Users`
- `30-Day Active Users`
- `Logins`
- `Matched Place`
- `Confidence`
- `Trend`

#### `Emerging Clusters`

Purpose:

- identify likely next service opportunities

Recommended scoring inputs:

- distinct users
- repeat active users
- trusted-user density
- contributor density
- proximity or strategic relevance
- observed-geo reinforcement

Recommended output:

- ranked cluster list
- signal explanation per place
- labels like `Adjacent`, `Diaspora`, `Expansion Candidate`, `Watchlist`

#### `Coverage Gaps`

Purpose:

- show where user density is material but tenant coverage is absent or weak

Examples:

- many users in Northern Cambria but no structured service-area relationship yet
- sustained Altoona readership but no emerging-coverage entry yet

Recommended columns:

- `Place`
- `Distinct Users`
- `Coverage Status`
- `Nearest Serving Tenant`
- `Suggested Action`

#### Dashboard rules

Recommended rules:

- default sort should emphasize distinct users, not total events
- one heavy user's activity should not dominate a place score
- observed geo should not outrank declared current-resident clusters
- adjacent local density should be easier to spot than far-off one-off traffic

#### Recommended charting and summaries

Helpful summaries:

- top adjacent emerging places
- top diaspora places
- places with growing trusted-user density
- places with contributor presence but no formal coverage

If charts are added later, they should support the table data rather than replacing it. Tables and filters should remain the primary operational interface.

## Admin Curation Workflow

Admin curation should sit between observed data and canonical geography.

Recommended admin workflows:

- review recurring unmatched observed geos
- map observed geos to existing canonical places
- create new canonical places when truly needed
- promote recurring fallback text into canonical places when appropriate
- mark noisy or low-value observed geos as ignored

Recommended additional workflow:

- review users with only fallback location text and decide when repeated patterns justify new canonical place curation

This gives the system a path to grow organically from real usage without sacrificing data quality.

## Super Admin Expansion Intelligence

Super Admin should have a geography dashboard designed around density and quality of use, not just traffic volume.

The central question is:

- where is a real cluster of people forming?

Not:

- where did one heavy user generate the most activity?

### Metrics That Should Matter Most

Recommended place-level metrics:

- distinct registered users
- distinct active users in the last 30 days
- distinct trusted users
- distinct contributors or staff
- repeat active users across multiple days
- submissions or participation events
- content reads or visits as a secondary signal

### Metrics That Should Not Dominate

These can be informative, but should not drive the ranking on their own:

- raw sessions
- raw logins
- total pageviews
- one user's high-volume activity

### Anti-Skew Rules

Recommended safeguards:

- emphasize unique users over total actions
- cap per-user impact on certain aggregate metrics
- use repeated-day activity rather than single-day spikes
- separate declared-user density from observed-IP density
- distinguish adjacent local clusters from far-off diaspora readership

### Recommended Geography Buckets

Super Admin should be able to review places as:

- `Current service core`
- `Adjacent emerging clusters`
- `Potential next-market candidates`
- `Out-of-region diaspora`
- `Low-confidence watchlist`

Examples:

- many distinct users in Altoona should surface as a stronger expansion signal than one extremely active user in Montana
- repeated Pittsburgh readership may matter strategically, but should be framed differently from a dense adjacent local cluster

### Expansion Signal Score

The dashboard should eventually derive an expansion signal score weighted toward:

- distinct-user concentration
- repeat engagement
- trust density
- contributor density
- proximity or strategic relevance

Observed-IP density can inform the score, but should be weighted below declared-user and declared-place relationships.

## Relationship To Multi-Tenant Expansion

The place system should help the platform decide where future tenants or sister sites make sense.

Recommended rule:

- do not automatically move users to a future tenant just because they live elsewhere today

Instead:

- let users belong to the current tenant
- record their actual or declared place relationship separately
- use density and engagement signals to decide when a place merits stronger coverage or a dedicated tenant later

This keeps current adoption from being punished just because the long-term site map is not built yet.

## Relationship To Directory And Organizations

The place model should also become a shared foundation for:

- directory municipality filters
- organization service-area tagging
- public local views by place
- future coverage summaries
- community pages or place landing pages later

This means `Place` should be treated as infrastructure, not a one-off onboarding field.

## Non-Goals

The first version should not try to become:

- a global geospatial platform
- an exact-address system
- a full GIS product
- a school-district-centric classification layer
- an auto-generated place database from messy user input

The goal is a clean, curated civic/place model with low-friction user capture and strong admin expansion intelligence.

## Recommended Sequencing

### Phase 1: Canonical Place Layer

Build:

- `Place`
- `PlaceAlias`
- Pennsylvania seed data
- `SUPER_ADMIN` `Places` interface

### Phase 2: User Place Capture

Build:

- `UserPlaceRelationship`
- onboarding and profile flows for structured place plus text fallback
- early profile-completion prompt aligned with date-of-birth completion

### Phase 3: Tenant Coverage Mapping

Build:

- `TenantCoverageArea`
- admin controls for primary, secondary, and emerging service areas
- `SUPER_ADMIN` tenant-to-place management interface

### Phase 4: Observed Geo Signal Layer

Build:

- `ObservedGeoLocation`
- normalization from login IP geodata
- admin review queue for unmatched recurring geos
- promotion/match workflow from observed geo into curated places

### Phase 5: Expansion Intelligence Dashboard

Build:

- Super Admin place-density reporting
- unique-user-weighted expansion signals
- adjacent/emerging market watchlists
- coverage-gap reporting between declared users, observed reach, and tenant service areas

## Canonical Product Conclusion

Highlander Today should separate:

- canonical places
- tenant service areas
- user-declared location and place ties
- observed geo signals from IP/login data

The system should make location capture easy for users, allow out-of-area participation without exclusion, and give Super Admin a density-based view of where real traction is forming.

The correct long-term model is not:

- `tenant = user geography`

It is:

- `tenant = publication/service boundary`
- `place = real-world geography`
- `user place relationship = where the user is or what places matter to them`
- `observed geo = lower-confidence reach signal`

That structure is flexible enough for the current founding footprint, statewide Pennsylvania expansion, future sister-site decisions, and later broader geographic growth without forcing premature or inaccurate assumptions into the data model.
