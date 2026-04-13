# Highlander Today — Gardening Implementation Plan

> **Last updated:** 2026-04-13
> **Status:** Proposed implementation plan
> **Purpose:** Turn the gardening/merchant direction into a concrete build sequence for tenant-aware gardening editorial, structured planning, and future merchant kits.

## Goal

Build gardening in the same strategic shape as recipes, but with gardening-native data structures.

The key requirement is:

- support local gardening content now
- preserve a path to structured garden plans later
- preserve a path to merchant interoperability and kits
- preserve a path to zone-aware cross-tenant content sharing

## Core Decision

Do not model gardening as:

- just more generic articles forever
- a copy of the recipe schema
- generic marketplace listings with garden-themed copy

Do model gardening as:

- editorial first
- structured garden planning second
- merchant routing and kits third

## Phase 1 — Tenant Growing Context

Before heavy gardening structure, add tenant growing metadata.

Recommended first-pass schema direction:

- `CommunityGrowingProfile`
  - `communityId`
  - `zoneMin`
  - `zoneMax`
  - `avgLastFrostStart`
  - `avgLastFrostEnd`
  - `avgFirstFrostStart`
  - `avgFirstFrostEnd`
  - `notes`

Why phase 1 comes first:

- content sharing depends on it
- gardening relevance depends on it
- future scheduling windows depend on it

## Phase 2 — Gardening Editorial Metadata

Before a full `GardenProject` system, add metadata to gardening editorial content so the system can begin targeting by relevance.

Recommended initial metadata:

- zone minimum / maximum
- season tags
- planting window text
- project type tags

## Phase 3 — Plant And Project Foundations

Recommended first true structured models:

- `PlantProfile`
- `GardenProject`
- `GardenProjectRequirement`
- `GardenTaskStep`

Suggested early requirement fields:

- requirement kind
- quantity
- unit
- label
- notes
- optional flag

## Phase 4 — Public Gardening Surfaces

Once the models exist, build:

- gardening browse page
- garden project detail page
- plant profile detail page
- admin moderation surface
- submit/create flow

Recommended routes:

- `/gardening`
- `/gardening/projects/[id]`
- `/gardening/plants/[id]`
- `/gardening/submit`
- `/admin/gardening`

## Phase 5 — Cross-Tenant Sharing Rules

Introduce gardening-content distribution rules that use tenant growing profiles.

Recommended logic:

- local content always allowed locally
- shared gardening content only shown when zones overlap
- editors can manually override distribution when needed

## Phase 6 — Merchant Product Layer

Only after structured gardening requirements exist, add merchant interoperability:

- `MerchantProduct`
- `RequirementProductMapping`
- `MerchantKit`

This is where a nursery / materials / hardware catalog can plug in first.

## Phase 7 — Kits

Kits should be the first strong merchant-facing experience.

Examples:

- salsa garden kit
- raised bed starter kit
- pollinator patch kit
- mulch refresh kit

Each kit should be generated from:

- a garden project
- a mapped merchant catalog
- optional merchant-specific substitutions

## Recommended First Build Slice

The smallest high-value first slice is:

1. `CommunityGrowingProfile`
2. gardening article metadata for zone relevance
3. admin editing for tenant growing profile
4. basic zone-aware content filtering rules

## Recommended Second Build Slice

After that:

1. `PlantProfile`
2. `GardenProject`
3. `GardenProjectRequirement`
4. public project detail page
5. admin gardening moderation/listing

## Recommended Third Build Slice

After the planning layer is proven:

1. merchant product catalog
2. requirement-product mapping
3. merchant kits
4. reservation/inquiry flows

## Guardrails

- Keep gardening separate from recipe persistence
- Keep gardening separate from generic marketplace listing persistence
- Keep zone logic tenant-aware, not article-only
- Keep kits driven by structured project requirements, not hand-built bundles only
