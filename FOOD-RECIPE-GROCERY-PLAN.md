# Highlander Today — Food, Recipe, And Grocery Plan

> **Last updated:** 2026-04-04
> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define how Highlander Today should evolve from local food editorial into a structured recipe and grocery-reservation system without collapsing that work into the existing marketplace domain.

## Product Intent

Highlander Today should eventually support a food and grocery module that does three things in sequence:

- publish local food editorial and recipes
- turn recipes into structured ingredient plans people can actually use
- turn those ingredient plans into grocery reservation intent for a local store

The central strategic idea is not "build online grocery."

The central strategic idea is:

> use local editorial trust and recipe utility to shape demand, route that demand toward a local grocer, and help the store move promoted and time-sensitive inventory.

This is a distinct product domain from the current marketplace.

- `Marketplace` is seller discovery, listings, and local commerce presence
- `Food / Recipes / Grocery` is editorial demand generation plus structured ingredient planning plus store-linked reservation

Do not force this into marketplace models just because a store is involved.

## Core Product Thesis

The strongest version of this module behaves like:

- a locally grounded food publication
- a recipe utility system
- a grocery demand-routing layer for a participating store

The user-facing promise progresses like this:

1. "Here is a recipe worth making this week."
2. "Here is the ingredient list to shop from."
3. "Here is how to reserve the ingredients from Ken's Bi-Lo."

The store-facing promise is:

1. "We can direct customer attention toward products you want to move."
2. "We can turn recipe interest into larger, more structured baskets."
3. "We can do this before deep POS/inventory integration exists."

## What This Is Not

- Not a generic grocery delivery app
- Not a clone of Instacart
- Not an extension of `MarketplaceListing`
- Not just a recipe blog with affiliate-style store mentions
- Not a requirement for real-time inventory sync on day one

## What This Is

- A first-class future Highlander module
- A recipe-first editorial and utility surface
- A structured ingredient system
- A local grocery reservation layer built to tolerate imperfect store operations

## Architectural Rule

Preserve three separate layers:

1. `FoodContent`
   Editorial food posts, recipe storytelling, weekly-special tie-ins, seasonal features

2. `RecipeStructure`
   Ingredients, quantities, optional items, instructions, notes, print-friendly ingredient lists

3. `StoreReservation`
   Store-specific product mapping, bundle assembly, pickup reservation, fulfillment status

These layers can be introduced gradually, but they should not be confused with each other in the model design.

Important rule:

- A recipe may initially render inside article-like presentation patterns
- A recipe should not remain trapped forever as unstructured rich-text article content
- Grocery reservation should not be modeled as generic marketplace listings

## Public Rollout Progression

This module should be planned on the user-facing axis separately from backend integration maturity.

### Phase A — Local Food Editorial

Goal:

- build public expectation
- create repeat attention around local food content
- connect recipes to real local grocery context

User-facing experience:

- recipe and food posts
- seasonal food coverage
- weekly special callouts tied to a participating store
- phrases like "Ken's Bi-Lo has chuck roast on special this week"

What this validates:

- whether local food content gets attention
- whether store-linked editorial increases engagement
- what kinds of recipes or seasonal posts drive local response

### Phase B — Structured Recipe Utility

Goal:

- make recipe content actionable rather than purely inspirational

User-facing experience:

- ingredient lists
- quantities and units
- optional ingredient toggles
- notes and substitutions
- printable shopping list such as "Print this ingredient list to take to Ken's Bi-Lo"

What this validates:

- whether users actually use the ingredient utility
- which ingredients are frequently removed, swapped, or left optional
- whether structured lists create stronger purchase intent than plain editorial

### Phase C — Reservation Intent

Goal:

- turn recipe utility into structured store demand

User-facing experience:

- reserve ingredients now
- choose pickup window
- receive confirmation and ready-status updates

Important expectation:

- this is initially reservation and fulfillment coordination, not a perfect live-cart ecommerce experience
- staff may fill the core order, make substitutions, or flag missing items manually

What this validates:

- whether recipe-driven demand converts to real orders
- whether basket sizes increase
- whether reservation demand is useful enough for the store to sustain participation

## Operational Integration Maturity

This module should also be planned on a separate store/system axis.

### Level 1 — Manual Operations

- manual recipe-to-product mapping
- manual weekly special updates
- manual order review and fulfillment
- staff handles substitutions or missing items directly
- notifications can be email/dashboard based

This is the right starting point.

Do not block launch on perfect systems integration.

### Level 2 — Light Integration

- CSV or spreadsheet imports for store catalog/pricing
- lighter-touch product refreshes
- more reliable store-specific ingredient mapping
- basic pricing sync and reporting

### Level 3 — Advanced Integration

- POS or inventory-feed ingestion
- automated product updates
- stronger substitution logic
- inventory-aware reservation handling
- better forecasting/reporting for store operations

The user experience may advance faster than the store integration level. That is acceptable and likely desirable.

## Two-Dimensional Planning Rule

Always plan this module on both axes:

- public rollout progression
- operational integration maturity

Example:

- a strong Phase C user experience may still run on Level 1 or Level 2 store operations
- the public should feel momentum before the backend becomes sophisticated

Do not confuse:

- "What the user sees next"

with:

- "How integrated the store/system is underneath"

## Model Boundary Recommendation

This should become a first-class domain rather than an extension of existing marketplace tables.

Recommended future core models:

- `Recipe`
- `RecipeIngredient`
- `Ingredient`
- `IngredientAlias`
- `RecipeInstructionStep`
- `RecipeNote`
- `StoreCatalogProduct`
- `IngredientProductMapping`
- `RecipeBundle`
- `RecipeBundleItem`
- `GroceryReservation`
- `GroceryReservationItem`
- `PickupWindow`

Recommended supporting ideas:

- optional ingredient flags
- substitution notes
- store-specific promotion overlays
- reservation-status history

Important boundary rules:

- `Recipe` is not the same thing as `Article`, even if the presentation overlaps at first
- `Ingredient` is not the same thing as `StoreCatalogProduct`
- `GroceryReservation` is not the same thing as `MarketplaceListing`
- store/business presence elsewhere in the platform can stay connected, but the grocery workflow should keep its own lifecycle

## Relationship To Existing Highlander Domains

This future module should reuse shared platform infrastructure:

- auth and trust
- community scoping
- compact admin patterns
- uploads/media
- homepage curation
- messaging/notifications
- analytics

It should remain distinct from these domains:

- `Marketplace`
  Seller/storefront discovery and listings remain separate from recipe-driven grocery reservation.

- `Organization`
  A participating grocer may later have organization presence, directory visibility, and inbox/CRM history, but grocery reservation is still its own workflow.

- `Article`
  Food editorial can share publishing language with articles, but recipe data should become structured rather than living only in article body content.

## Recommended Store-Side Workflow

For the first practical pilot, the store workflow should remain simple:

1. Store receives reservation request
2. Staff reviews recipe bundle / ingredient list
3. Staff picks what is available
4. Staff adjusts for substitutions or missing items
5. Staff marks reservation ready
6. Customer picks up

This workflow is deliberately tolerant of imperfect grocery operations.

Success depends on building a system that still works when:

- some products are unavailable
- prices are slightly stale
- substitutions need human judgment
- store staff are not using specialized ecommerce tooling

## Admin And Data Stewardship Needs

This domain will require real operational stewardship. That should be acknowledged early.

Future admin capabilities should include:

- recipe management
- structured ingredient editing
- store catalog management
- ingredient-to-product mapping
- promotion/special overlays
- reservation monitoring
- pickup-window controls
- fulfillment/status management

Without these admin tools, the public product will eventually drift away from store reality.

## Pricing, Availability, And Substitutions

These should be treated as explicit policy areas, not accidental behavior.

Recommended early rules:

- prices may be approximate or recently updated rather than live
- reservations request products; they do not guarantee perfect live inventory
- substitutions are allowed when the store needs them
- optional items should be removable by the user
- the store should be able to mark certain ingredients unavailable or substituted

Do not promise precision that the store cannot operationally support.

## Initial Grocer Positioning

The pitch to a participating grocer should be straightforward:

> We help you sell more of what you already have by turning local recipe demand into structured baskets and pickup reservations.

The first store relationship should likely be narrow:

- one store
- one community
- limited recipe set
- one human contact at the store
- simple fulfillment workflow

## Monetization Direction

This module should eventually support clear, understandable value capture.

Potential revenue paths:

- per-reservation fee
- featured recipe placement for store campaigns
- promoted ingredient/special placement
- seasonal sponsorships

As with the broader platform, monetization should follow visible value rather than arrive first.

## Success Metrics

Track success by phase.

### Phase A metrics

- recipe views
- repeat readership
- click-through on store-linked specials
- homepage or seasonal-feature performance

### Phase B metrics

- ingredient-list prints or exports
- optional-item toggles
- ingredient-list interaction rate
- store-specific shopping-list usage

### Phase C metrics

- reservation volume
- fulfillment completion rate
- average basket size
- repeat reservation rate
- store satisfaction with order quality and operational burden

## Risks And Mitigations

### Risk: Store resistance

Mitigation:

- keep early workflow lightweight
- avoid requiring POS replacement
- prove demand before asking for deeper integration

### Risk: Data inconsistency

Mitigation:

- manual mapping first
- explicit substitution rules
- conservative promises around pricing/inventory

### Risk: Domain confusion with marketplace

Mitigation:

- keep food/recipe/grocery as a separate module
- share infrastructure but not core workflow models

### Risk: Overbuilding too early

Mitigation:

- release in phases
- validate public attention before reservation complexity
- validate reservation usefulness before advanced integration

## Sequencing Recommendation

Recommended order inside Highlander:

1. Continue strengthening current shared platform foundations.
2. Introduce food editorial and recipe publishing direction.
3. Add structured ingredient and instruction models before relying on recipe utility behavior.
4. Add printable/store-specific ingredient lists.
5. Pilot reservation flow with one local grocer under manual operations.
6. Add light catalog/pricing import support only after the manual pilot proves useful.
7. Revisit deeper integration only after repeat demand and store value are visible.

## Immediate Planning Rules

Until implementation begins:

- treat this as a planning-only domain
- do not force recipes into generic article assumptions permanently
- do not force grocery workflows into marketplace abstractions
- keep the public rollout plan and the operational integration plan separate in all future discussions

## Summary

The long-term opportunity is not simply local food content and not simply grocery ordering.

It is a Highlander-native system that:

- builds public expectation through local food editorial
- deepens usefulness through structured recipe utility
- converts demand into real grocery reservations
- helps an independent grocer move inventory and grow basket size without needing perfect integration on day one
