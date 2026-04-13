# Highlander Today — Gardening, Plants, And Merchant Interoperability Plan

> **Last updated:** 2026-04-13
> **Status:** Product and architecture planning
> **Purpose:** Define how Highlander Today should evolve from gardening editorial into a structured gardening-planning and merchant-routing system without forcing that work into recipe or marketplace models.

## Product Intent

Highlander Today should eventually support a gardening and outdoor-living module that does three things in sequence:

- publish useful local gardening editorial
- turn that editorial into structured gardening plans people can follow
- connect those plans to local merchants that can supply the plants, materials, and tools

The central idea is not:

> build a generic ecommerce garden store

The central idea is:

> use local seasonal guidance and structured garden planning to drive relevant demand toward local nurseries, landscape suppliers, and hardware merchants.

This is structurally similar to the food/recipe/grocery direction, but the domain objects are different.

## Core Product Thesis

The strongest version of this module behaves like:

- a locally grounded gardening publication
- a structured gardening utility system
- a merchant-routing layer for plants, materials, tools, and supplies

The user-facing promise progresses like this:

1. "Here is what to plant or work on this week."
2. "Here is the structured list of what you need."
3. "Here is how to get the plants, materials, and supplies from a local merchant."

The merchant-facing promise is:

1. "We can direct gardening demand toward your catalog."
2. "We can package common projects into kits instead of isolated product sales."
3. "We can do that before deep inventory integration exists."

## What This Is Not

- Not a clone of a big-box hardware ecommerce site
- Not just gardening articles with store mentions
- Not the same model as recipes
- Not something that should be collapsed into generic marketplace listings

## What This Is

- A future first-class Highlander module
- A gardening-planning and seasonal utility surface
- A bridge between structured projects and local supply merchants
- A foundation for future project kits and merchant bundles

## Core Domain Buckets

The core merchant/product buckets should start with:

1. Plants
2. Tools
3. Hard materials
4. Supplies

For implementation and merchant interoperability, those should be refined into:

- `Plants`
- `SeedsAndStarts`
- `Tools`
- `HardMaterials`
- `GrowingMedia`
- `SuppliesAndAmendments`
- `ContainersAndIrrigation`
- `ProjectKits`

## The Gardening Equivalent Of A Recipe

Recipes turn editorial into a structured, actionable plan.

Gardening needs the same thing, but the equivalent object is a `GardenProject` or `GardenPlan`, not a recipe.

Examples:

- build a 4x8 raised bed
- plant a pollinator strip
- start a container tomato garden
- mulch a foundation bed
- install a simple drip line
- plant garlic in fall

That structured project is the unit that should eventually map into merchant kits.

## Architectural Rule

Preserve three separate layers:

1. `GardenContent`
2. `GardenStructure`
3. `MerchantInteroperability`

Do not confuse these layers in the model design.

## Tenant Climate And Zone Metadata

This module should be tenant-aware from the beginning.

The climate/zone data should live at the tenant/site layer, not only on individual articles.

Recommended tenant-level fields:

- USDA hardiness zone minimum
- USDA hardiness zone maximum
- average last frost range
- average first frost range
- growing season notes

Why this matters:

- one gardening guide may be relevant to multiple tenants
- cross-tenant sharing should depend on climate compatibility
- content distribution should be able to say "show this to tenants in compatible zones"

## Cross-Tenant Sharing Model

Future gardening content should support:

- local-only distribution
- zone-compatible multi-tenant distribution
- manual editorial override

This requires:

1. tenant growing profile metadata
2. gardening-content relevance metadata

Recommended content relevance metadata:

- zone minimum
- zone maximum
- frost sensitivity
- planting window
- in-ground vs container applicability
- indoor-start vs direct-sow flags

## Suggested Future Models

Recommended future first-pass models:

- `PlantProfile`
- `GardenProject`
- `GardenProjectRequirement`
- `GardenTaskStep`
- `GardenCalendarWindow`
- `MerchantProduct`
- `RequirementProductMapping`
- `MerchantKit`

## Merchant Interoperability Direction

The merchant interoperability layer should support multiple merchant types:

- nursery
- landscape supply
- hardware
- garden center
- farm/feed store

It can still begin with one merchant relationship first. That is acceptable.

## Kits As A First-Class Commercial Unit

Kits should be treated as a primary future outcome, not just a marketing layer.

Examples:

- beginner raised-bed kit
- salsa garden kit
- herb container kit
- pollinator garden kit
- mulch refresh kit
- garlic planting kit

This is the exact parallel to recipe-driven grocery bundles.

## Rollout Sequence

### Phase A — Gardening Editorial

- gardening articles
- plant explainers
- local seasonal tips
- weekly planting/work guidance

### Phase B — Structured Garden Utility

- plant profiles
- project requirement lists
- step-based garden plans
- zone and timing metadata
- printable material lists

### Phase C — Merchant Routing

- map project requirements to local merchant products
- show merchant-specific suggestions
- build kit/bundle recommendations
- support inquiry, reservation, or order intent

### Phase D — Operational Integration

- merchant catalog updates
- richer pricing/availability sync
- bundle maintenance
- eventual inventory-aware flows if warranted

## Short Recommendation

The right analogy is:

- `Recipe` is to grocery
- `GardenProject` is to nursery / materials / hardware

That should be the guiding model boundary for future gardening work.
