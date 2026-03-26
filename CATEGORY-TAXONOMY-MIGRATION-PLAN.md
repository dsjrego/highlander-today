# Category Taxonomy Migration Plan

## Goal

Make the database the source of truth for Local Life categories, with the database updated to match the current `Local Life` navbar dropdown. After the migration, the admin section should become the maintenance surface for categories, and public/navigation surfaces should read cached DB-backed values rather than hardcoded lists.

## Current State

### Navbar taxonomy

The current `Local Life` navbar dropdown in [src/components/layout/NavigationBar.tsx](/Users/dennisdestjeor/work/highlander-today/src/components/layout/NavigationBar.tsx) uses this taxonomy:

- `local-stores`
- `people`
- `recipes-food`
- `outdoors-tips`
- `arts-creativity`
- `history-heritage`
- `guides`
- `opinion-commentary`

### Database taxonomy

The live `categories` table does **not** currently contain a `local-life` parent category. It contains a different older taxonomy:

- top-level: `news`, `community`, `lifestyle`, `opinion`, `announcements`
- children include items like `business`, `neighborhood`, `people-profiles`, `food-dining`, `arts-entertainment`

### Existing article usage

Only 2 articles currently have category assignments:

- `Highlander Today: A Tech Veteran's Bet on Rebuilding Community in Cambria County` -> `business`
- `test title` -> `neighborhood`

That is small enough to migrate safely, but those assignments should be reviewed explicitly.

### Admin maintenance

There is an `/admin/categories` route, but it is currently a mock client-side page and does not persist to the database. It is not yet a real maintenance surface.

## Safe Migration Strategy

### Phase 1: Preserve and inspect

Before changing any taxonomy:

1. Snapshot current `categories` rows.
2. Snapshot all article -> category assignments.
3. Record explicit remap decisions for the 2 existing article assignments.

The migration should be reversible until article assignments are confirmed.

### Phase 2: Add the new DB taxonomy

Create a new parent category:

- `Local Life` -> slug `local-life`

Create these child categories under `local-life` in navbar order:

1. `Local Stores` -> `local-stores`
2. `Our People` -> `people`
3. `Recipes & Food` -> `recipes-food`
4. `Gardening & Nature` -> `outdoors-tips`
5. `Arts & Music` -> `arts-creativity`
6. `History & Heritage` -> `history-heritage`
7. `Guides & How-Tos` -> `guides`
8. `Opinion` -> `opinion-commentary`

Important:

- Add the new categories first.
- Do not delete the old categories in the same step.
- Keep old rows in place until article/category reassignment is complete.

### Phase 3: Reassign existing article links

Because only 2 articles are affected, remapping should be explicit rather than automatic.

Current review queue:

1. `business` article:
   `Highlander Today: A Tech Veteran's Bet on Rebuilding Community in Cambria County`
   Recommendation: manual review before reassignment.

2. `neighborhood` article:
   `test title`
   Recommendation: manual review before reassignment.

Safer policy:

- Do not guess remaps for legacy articles during the first migration.
- Instead, report them and reassign only after human confirmation.
- If needed, temporarily leave the article linked to the old category until the editorial decision is made.

### Phase 4: Switch reads to DB-backed categories

Once the new `local-life` rows exist:

1. Update the Local Life navbar/category surfaces to read from the DB-backed taxonomy.
2. Remove the hardcoded Local Life category list as the runtime source of truth.
3. Keep the DB order aligned via `sortOrder`.

At that point:

- navbar dropdown
- Local Life page pills
- add article category selector

should all derive from the same DB-backed category source.

### Phase 5: Retire old taxonomy rows

Only after existing article references are migrated and verified:

1. Archive or remove obsolete old category rows that no longer belong to the active Local Life taxonomy.
2. Prefer archive-first over hard delete if there is any uncertainty.

## Cache Architecture (next phase)

The database can be the source of truth without taxing the DB on every page load.

Recommended approach:

1. Add a small server-side category accessor for navigation/category lists.
2. Cache category reads with a long TTL or tagged revalidation.
3. Invalidate the category cache only when admin category changes occur.

That means:

- DB remains the source of truth.
- runtime category reads remain cheap.
- pages do not need a fresh categories query every request.

## Execution Order

1. Approve explicit remap behavior for the 2 existing article assignments.
2. Add the `local-life` category tree to the DB.
3. Keep old categories intact during transition.
4. Repoint reads to the new DB-backed taxonomy.
5. Build the real admin category management UI/API.
6. Add category caching and cache invalidation.
7. Archive obsolete taxonomy rows after validation.

## Recommendation

Execute the migration in two code/data steps:

1. `DB sync step`
   Add `local-life` parent + children, keep old rows, and produce a review list of legacy article assignments.

2. `runtime source-of-truth step`
   Move navbar and related category UIs to a cached DB-backed category service.

This avoids breaking content during migration and keeps the future architecture clean.
