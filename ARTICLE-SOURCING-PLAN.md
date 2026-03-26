# Article Sourcing And Citations Plan

## Purpose

Define a lightweight but credible sourcing model for Local Life articles so factual reporting can show where information came from without turning article creation into a heavy academic workflow.

This should strengthen editorial trust, accountability, and long-term usefulness while staying aligned with Highlander Today's broader direction as local communication infrastructure rather than a generic social feed.

## Why This Fits The Product

- The platform already leans closer to a serious local paper or civic information utility than a casual publishing surface.
- Visible sourcing helps distinguish reported/community-reference content from opinion, first-person experience, and informal announcements.
- A source list creates an observable editorial standard without requiring every article to behave like Wikipedia.
- Trust is not only about author identity; it is also about showing readers where factual claims came from.

## Product Position

The right initial model is Wikipedia-inspired in spirit, but not Wikipedia-complex in implementation.

That means:
- support structured sources
- support visible source notation in the article
- avoid a heavyweight inline citation-management workflow in v1
- preserve lower-friction publishing for community voices and non-reported posts

## Recommended V1

Add optional structured sources to article create/edit flows.

Each source should support:
- `label` or display title
- `url` optional
- `publisher` or publication name optional
- `author` optional
- `publishedAt` optional
- `note` optional for brief context such as "Borough council agenda" or "Interview with store owner"

Article pages should support:
- a bottom-of-article `Sources` section when one or more sources exist
- a simple visible notation near the article header such as `Sources included`
- optional inline numbered references only when the author explicitly inserts them

## Scope Boundaries

V1 should not try to solve all citation problems.

Avoid in the first pass:
- automatic claim-to-source validation
- complex reusable footnote editors inside TipTap
- nested citation styles or academic formatting rules
- mandatory inline citations for every factual statement
- source credibility scoring

## Editorial Guidance

Sources should not be uniformly required across every article type.

Recommended policy direction:
- reported or factual local-news-style articles: sources expected, likely required later
- guides and explainers: sources recommended
- opinion/commentary: sources optional
- personal stories or community voice posts: sources optional
- event/community announcements: use judgment based on how factual or report-like the piece is

This likely implies a future article-type or article-intent field if one does not already exist.

## UX Direction

Keep the authoring experience simple:
- the main article form remains the primary surface
- the sources UI should feel like an expandable structured section, not a second editor
- authors can add, remove, and reorder sources
- inline references, if supported in v1, should be explicit and optional

Reader experience should be equally simple:
- source notation should be visible but not noisy
- the bottom `Sources` block should be easy to scan
- sources should read like accountable references, not raw metadata dumps

## Data Model Direction

Likely future shape:
- `ArticleSource`
- belongs to `Article`
- ordered by `sortOrder`
- stores display metadata plus optional URL and note fields

Possible fields:
- `id`
- `articleId`
- `label`
- `url`
- `publisher`
- `author`
- `publishedAt`
- `note`
- `sortOrder`
- `createdAt`
- `updatedAt`

If inline references are later added beyond a simple ordered list, the body/source relationship may need a separate reference token model. That complexity should be deferred until the simpler source-list workflow proves valuable.

## Risks

- Submission friction increases if sourcing is over-required too early.
- Authors may interpret "Wikipedia-style" to mean a much heavier workflow than the product actually needs.
- A poor UI could produce decorative source lists that do not meaningfully improve trust.
- If article types are not differentiated, the sourcing policy may feel inconsistent.

## Recommendation

Proceed document-first, then implement in phases:

1. Define policy and UX expectations.
2. Add structured article sources plus bottom-of-article rendering.
3. Evaluate whether optional inline citation markers are worth the extra editor complexity.
4. Only later consider stronger editorial requirements by article type.

## Current Status

This is a planning direction only. No schema, admin tooling, editor integration, or article-page rendering exists yet for structured article sourcing/citations.
