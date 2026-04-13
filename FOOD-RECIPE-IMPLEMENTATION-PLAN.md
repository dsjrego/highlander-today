# Highlander Today — Food / Recipe Implementation Plan

> **Last updated:** 2026-04-13
> **Status:** Proposed implementation plan
> **Purpose:** Turn the existing food/recipe product direction into a concrete build sequence for structured recipe authoring, JSON ingest, and visually strong presentation without forcing recipe-specific HTML/CSS into the generic `Article` body model.

## Problem Statement

The current bridge approach is proving the architectural point:

- `Article.body` is stored as sanitized HTML
- recipe presentation is inferred from CSS classes embedded in that HTML
- HTML import normalizes external markup into those classes
- preview and detail rendering branch on whether those classes appear in the article body

That is useful as a temporary bridge, but it is the wrong long-term persistence model for recipes.

The user requirement is clearer than the current implementation:

- authors should be able to enter recipes through forms
- authors should also be able to paste structured recipe data such as JSON
- the system should parse that structured input and save canonical recipe records in the database
- recipe pages must remain highly stylable and visually strong

That combination argues for a first-class structured recipe domain, not more investment in article-body HTML conventions.

## Core Decision

Keep `Article` for editorial narrative.

Add a dedicated structured `Recipe` domain for anything that has recipe-specific fields such as:

- yield / servings
- prep / cook / total time
- grouped ingredients
- step-by-step method
- notes, substitutions, and storage guidance
- print-friendly layout
- future grocery bundle / reservation linkage

Important rule:

- a recipe may have editorial introduction and story content
- a recipe may visually resemble an article
- a recipe should not be stored primarily as arbitrary recipe-shaped HTML inside `Article.body`

## Model Direction

### Keep `Article` focused on editorial content

Use `Article` for:

- general Local Life editorial
- essays, profiles, explainers, seasonal food stories
- optional intro or companion narrative for a recipe

Do not extend `Article.body` to become the system of record for:

- ingredient quantities
- recipe timing metadata
- grouped ingredient sections
- structured steps
- recipe notes

### Add dedicated recipe tables

Recommended first-pass models:

- `Recipe`
- `RecipeIngredientSection`
- `RecipeIngredient`
- `RecipeInstructionStep`
- `RecipeNote`

Recommended `Recipe` fields:

- `id`
- `communityId`
- `authorUserId`
- `title`
- `slug`
- `excerpt`
- `introHtml`
- `featuredImageUrl`
- `featuredImageCaption`
- `status`
- `categoryId`
- `yieldLabel`
- `prepMinutes`
- `cookMinutes`
- `totalMinutes`
- `servings`
- `sourceName`
- `sourceUrl`
- `structuredInputRaw`
- `createdAt`
- `updatedAt`
- `publishedAt`

Recommended relationship fields:

- optional `primaryArticleId` if a richer editorial article is linked later
- optional future grocery/store linkage fields should live on grocery-specific models, not on `Recipe` itself

Recommended ingredient structure:

- `RecipeIngredientSection`
  - `recipeId`
  - `title`
  - `sortOrder`

- `RecipeIngredient`
  - `recipeId`
  - `sectionId`
  - `sortOrder`
  - `amount`
  - `unit`
  - `ingredientName`
  - `preparationNote`
  - `isOptional`
  - `substitutionNote`

Recommended instruction structure:

- `RecipeInstructionStep`
  - `recipeId`
  - `sortOrder`
  - `title`
  - `body`
  - `timerMinutes`

Recommended note structure:

- `RecipeNote`
  - `recipeId`
  - `kind`
  - `title`
  - `body`
  - `sortOrder`

`kind` can start with:

- `COOK_NOTE`
- `SUBSTITUTION`
- `STORAGE`
- `SERVING`

## Authoring Contract

Support two authoring inputs that resolve into the same canonical recipe model.

### Path A: Structured form entry

Primary admin/editor flow:

- title, excerpt, intro
- hero image + caption
- timing and yield fields
- ingredient sections and rows
- instruction steps
- notes / substitutions / storage

This should be the normal editing surface because it is legible and validates well.

### Path B: Structured JSON ingest

Secondary power-user/admin flow:

- paste recipe JSON into a dedicated field or import dialog
- validate and normalize it
- populate the canonical recipe fields
- allow the user to review and edit the parsed result in forms before save or publish

Important rule:

- JSON import is an input convenience
- JSON is not the primary rendering format
- canonical normalized rows in the database remain the source of truth

## JSON Shape Recommendation

Start with an internal Highlander recipe payload instead of trying to fully support every external recipe schema on day one.

Recommended import shape:

```json
{
  "title": "Sunday Pot Roast",
  "excerpt": "A slow, hearty roast built around local weekly specials.",
  "introHtml": "<p>This is the kind of meal...</p>",
  "yieldLabel": "1 roast",
  "servings": 6,
  "prepMinutes": 20,
  "cookMinutes": 210,
  "totalMinutes": 230,
  "ingredientSections": [
    {
      "title": "Roast",
      "items": [
        {
          "amount": "3",
          "unit": "lb",
          "ingredientName": "chuck roast"
        },
        {
          "amount": "1",
          "unit": "tsp",
          "ingredientName": "kosher salt"
        }
      ]
    },
    {
      "title": "Vegetables",
      "items": [
        {
          "amount": "4",
          "unit": "",
          "ingredientName": "carrots",
          "preparationNote": "peeled and cut into chunks"
        }
      ]
    }
  ],
  "steps": [
    {
      "title": "Season the roast",
      "body": "Pat dry and season all sides."
    },
    {
      "title": "Roast low and slow",
      "body": "Cover and cook until tender.",
      "timerMinutes": 180
    }
  ],
  "notes": [
    {
      "kind": "SERVING",
      "title": "Serve with",
      "body": "Crusty bread or buttered noodles."
    }
  ]
}
```

## Validation Rule

All recipe creation paths should normalize into one shared server-side parser.

Recommended flow:

1. accept either form fields or JSON payload
2. validate with Zod
3. normalize missing sections and sort order
4. trim strings and discard empty rows
5. write canonical recipe rows
6. preserve original JSON in `structuredInputRaw` only for audit/debugging, not rendering

## Rendering Rule

Recipe pages should use structured React components, not `dangerouslySetInnerHTML` plus recipe-specific class detection, for recipe-specific sections.

Recommended split:

- `introHtml` may still render through the sanitizer for editorial intro copy
- ingredients, steps, metadata, and notes should render from typed recipe data
- article detail and recipe detail should become distinct render paths

That solves the styling problem cleanly:

- `editorial-recipe.css` can inform the visual language
- recipe styling becomes component-driven instead of HTML-fragile
- recipe pages can support print layout, grouped cards, sidebars, and future grocery actions without overloading generic article markup

## UI Direction

Create a dedicated recipe editor rather than continuing to overload `/local-life/submit`.

Recommended route direction:

- `/recipes`
- `/recipes/[id]`
- `/recipes/submit`
- `/admin/recipes`

Early rollout shortcut:

- recipes can still be discoverable from `Local Life`
- the `recipes-food` category can feature both articles and recipes in browse surfaces if needed
- the persistence and rendering layers should still remain separate

## Near-Term Compatibility

Do not rip out the current article bridge immediately.

Phase the work:

### Phase 1

- keep existing article-based recipe preview working
- add dedicated recipe schema and APIs
- add recipe authoring UI
- add recipe detail page

### Phase 2

- allow recipe browse cards within food surfaces
- support JSON ingest and review flow
- stop creating new recipes as HTML-only articles

### Phase 3

- optionally support article-to-recipe linkage
- backfill a small number of existing food pieces into true recipe records where appropriate

## API Direction

Recommended initial endpoints:

- `POST /api/recipes`
- `GET /api/recipes`
- `GET /api/recipes/[id]`
- `PATCH /api/recipes/[id]`
- `POST /api/recipes/import`

Import endpoint behavior:

- accepts structured recipe JSON
- validates and normalizes it
- returns parsed form-ready shape
- optionally saves draft immediately when requested

This is preferable to stuffing JSON into `Article.body` or a generic freeform field and parsing it later during render.

## Why This Resolves The Styling Problem

The styling problem exists because recipe layout is currently an accidental property of rich text.

When ingredients and steps become actual data:

- the page can use a deliberate recipe template
- typography and spacing can be tuned per section
- ingredients can render as grouped checklists
- instructions can render as numbered step cards
- metadata can render as a responsive summary grid
- notes and substitutions can render as distinct callouts
- print mode becomes realistic

In short:

- recipe style becomes a component problem
- not a sanitizer/import/class-preservation problem

## Recommended First Build Slice

Implement the smallest slice that proves the right architecture:

1. Prisma recipe schema
2. Zod recipe input schema
3. `POST /api/recipes` with canonical normalization
4. `POST /api/recipes/import` for JSON validation + preview
5. dedicated submit page with structured form fields
6. dedicated recipe detail page using typed rendering

Do not begin with:

- grocery reservation
- store catalog matching
- marketplace reuse
- arbitrary HTML recipe import expansion

## Practical Conclusion

The right answer is not to make the current article model more permissive.

The right answer is:

- keep article editorial flexible
- create a dedicated structured recipe model
- let forms and JSON import both write to that model
- render recipes through typed components so the design can be strong without being brittle

That resolves both of your concerns at once:

- structured authoring and machine-friendly ingest
- visually rich presentation without forcing recipe CSS onto generic article content
