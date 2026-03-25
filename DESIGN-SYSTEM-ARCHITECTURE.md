# Design System Architecture

## Purpose

This document defines the shared UI terminology and theming direction for Highlander Today so future design and implementation work uses a consistent structure across pages, sections, cards, and multi-tenant theming.

It is intended to work with the existing Next.js + React + Tailwind architecture in this repo. Components remain reusable structural units; visual styling should increasingly be driven by shared semantic classes and theme tokens rather than hardcoded one-off component styling.

## Core Principle

Separate:

- structure and behavior, owned by components
- semantic UI vocabulary, owned by shared class names
- tenant branding and visual theming, owned by theme variables/tokens

This keeps the app maintainable as it grows and makes tenant-specific branding possible without rewriting component logic for each tenant.

## Page Hierarchy

Use this terminology for the public site and other shared surfaces unless there is a clear reason not to:

1. `app-header` or `masthead`
2. `page`
3. `page-header`
4. `page-body`
5. `page-footer`
6. `app-footer`

Within a page body:

1. `section`
2. `section-header`
3. `section-body`
4. `section-footer`
5. `subsection`

Within cards:

1. `card`
2. `card-header`
3. `card-body`
4. `card-footer`

This preserves a clean distinction between:

- global app shell
- route-level page structure
- content groupings within a page
- reusable content containers such as cards

## Shared Element Vocabulary

Use these suffixes consistently:

- `*-header`: structural header container
- `*-label`: eyebrow or kicker text inside a header/container
- `*-title`: main heading for the object
- `*-body`: main content region
- `*-footer`: lower region for metadata, summary, or controls
- `*-actions`: action group for the object

Examples:

- `page-header`
- `page-label`
- `page-title`
- `page-actions`
- `page-body`
- `page-footer`

- `section-header`
- `section-title`
- `section-actions`
- `section-body`

- `card-label`
- `card-title`
- `card-body`
- `card-footer`
- `card-actions`

Important distinction:

- `header` is a structural region/component
- `label` is a text element inside that structure

They are not synonyms.

## Current Alignment With The Codebase

These patterns already exist in partial form:

- `src/components/shared/InternalPageHeader.tsx` is the active shared page-header-style component for many public/internal pages.
- `src/app/globals.css` already defines shared card vocabulary such as `card`, `card-label`, `card-title`, and `card-body`.
- Public pages already reuse shared top-of-page treatment and shared title styling in multiple places.

The next step is to continue extending these patterns deliberately instead of creating one-off naming conventions per page.

## Component Strategy

In this repo, reusable React components should define structure and slots, not lock in tenant-specific visual decisions.

Recommended pattern:

- components own markup and behavior
- semantic classes describe the role of each part
- global design-system classes define shared visual language
- Tailwind utilities handle local layout and spacing adjustments
- CSS Modules are optional for genuinely component-local styling, not the default for every shared surface

Examples of good shared components:

- `PageHeader`
- `SectionHeader`
- `Card`
- `CardFooter`

Each should expose clear semantic regions such as title, label, body, and actions.

## Multi-Tenant Theming Direction

Because Highlander Today is multi-tenant, components should not be tightly coupled to a single community's color palette or visual identity.

Theming should move toward:

- stable semantic class names
- CSS custom properties / theme tokens
- tenant-specific token overrides

Components should be reusable across tenants without changing their structure.

The tenant layer should control:

- color palette
- typography
- radius
- shadows
- surface treatments
- selected spacing adjustments

The component layer should control:

- layout structure
- semantic slots
- interaction behavior
- accessibility

## Token Direction

The repo already has a small token foundation in `src/app/globals.css`. Expand that approach over time.

Suggested categories:

- `--color-page-bg`
- `--color-surface`
- `--color-surface-accent`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-brand-primary`
- `--color-brand-accent`
- `--radius-card`
- `--radius-pill`
- `--shadow-card`
- `--shadow-page-header`
- `--font-sans`
- `--font-serif`

Use semantic tokens rather than tenant-specific names when possible.

Prefer:

- `--color-surface-accent`

Over:

- `--cambria-red`

That keeps theming portable across communities.

## Practical Naming Guidance

Default to the shortest clear name that matches the object actually being styled.

Prefer:

- `card-actions`

Over:

- `section-card-actions`

Unless the longer name is needed to resolve ambiguity.

Likewise:

- use `page-header` for the page intro structure
- use `page-label` for the eyebrow text inside it
- use `page-title` for the main page heading

## Near-Term Implementation Guidance

As shared surfaces are touched, prefer moving them toward this pattern:

1. Define or reuse a shared structural component.
2. Use semantic class names aligned with this vocabulary.
3. Reduce hardcoded page-specific styling where possible.
4. Move repeated visual decisions into shared classes or theme tokens.
5. Keep tenant-specific branding concerns out of component logic.

This should be done incrementally, not as a disruptive rewrite.

## Current Canonical Vocabulary

For now, the preferred shared vocabulary is:

- `masthead`
- `page`
- `page-header`
- `page-label`
- `page-title`
- `page-actions`
- `page-body`
- `page-footer`
- `section`
- `section-header`
- `section-title`
- `section-actions`
- `section-body`
- `section-footer`
- `subsection`
- `card`
- `card-header`
- `card-label`
- `card-title`
- `card-body`
- `card-footer`
- `card-actions`
- `app-footer`

Use this document as the reference point when introducing new shared UI terminology.
