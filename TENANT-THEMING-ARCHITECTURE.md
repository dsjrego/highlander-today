# Tenant Theming Architecture

## Purpose

Define the canonical theming structure for a multi-tenant platform where each tenant can have:

- its own visual identity
- a light theme and a dark theme
- optional seasonal or campaign variants

The goal is to keep layout and component structure shared while allowing each tenant to feel distinct without forking the app shell or scattering tenant-specific conditionals throughout the codebase.

## Current State

The repo already has the right high-level direction:

- tenant/community resolution exists through `src/lib/tenant.ts` and `src/lib/community.ts`
- `Community` already stores a small identity baseline (`name`, `slug`, `domain`, `logoUrl`, `colorPrimary`, `colorAccent`)
- `DESIGN-SYSTEM-ARCHITECTURE.md` already says tenant branding should move toward theme tokens rather than component-level hardcoding

The current gap is that the live shell is still visually hardcoded for Highlander Today:

- `src/app/layout.tsx` hardcodes the masthead gradients, wordmark, footer copy, and brand treatment
- `src/app/globals.css` still contains many Highlander-specific gradients and text colors in shared classes
- shared components such as the masthead and navigation are structurally reusable but not yet token-driven

## Core Principle

Separate four layers cleanly:

1. Tenant identity
2. Theme mode
3. Optional seasonal overlay
4. Shared component structure

That means:

- components own structure, slots, behavior, and accessibility
- semantic classes own shared UI vocabulary
- theme tokens own visual decisions
- tenant/theme resolution decides which token set is active

Do not solve multi-tenancy by adding tenant-slug conditionals throughout component code.

## Canonical Theme Model

The effective theme should be composed from three parts:

1. `tenant base`
2. `mode variant`
3. `optional overlay`

Conceptually:

`effectiveTheme = tenantBase + mode(light|dark) + optionalOverlay(seasonal)`

Examples:

- `highlander-today + light + none`
- `highlander-today + dark + none`
- `highlander-today + dark + christmas-2026`
- `johnstown-whatever + light + founders-week`

The overlay should be additive and limited in scope. It can change selected colors, imagery, or accents, but it should not redefine layout or component behavior.

## Source Of Truth

Use a split source of truth rather than pushing arbitrary theme CSS into the database.

### Database-owned

The database should own stable tenant identity and operational settings:

- tenant/community identity
- domain mapping
- logo/wordmark asset URLs when those are content-like assets
- simple fallback brand colors
- tenant-level default mode or seasonal flags through `SiteSetting` when needed

### Code-owned

Code should own the actual theme manifests:

- semantic token definitions
- light/dark token sets
- seasonal overlay token deltas
- asset usage rules for masthead/background treatments
- typography choices
- component consumption rules

This is the important guardrail:

- the DB may select a theme
- the DB should not store arbitrary CSS or unconstrained visual logic

That keeps theming reviewable, versioned, testable, and safe.

## Recommended File Structure

Create a dedicated theme layer in code:

```text
src/lib/theme/
  types.ts
  tokens.ts
  resolve-theme.ts
  apply-theme.ts
  manifests/
    highlander-today.ts
    ...
```

Suggested responsibilities:

- `types.ts`
  Defines `TenantThemeManifest`, `ThemeMode`, `ThemeOverlay`, and `ResolvedTheme`
- `tokens.ts`
  Defines the semantic token contract every tenant must satisfy
- `resolve-theme.ts`
  Composes tenant + mode + overlay into one resolved theme object
- `apply-theme.ts`
  Converts a resolved theme into CSS custom properties and dataset attributes
- `manifests/*.ts`
  One manifest per tenant brand family

## Theme Manifest Shape

Each tenant should have one base manifest that includes:

- tenant id / slug
- human-readable theme name
- supported modes
- default mode
- typography choices
- asset references
- semantic tokens for each mode
- optional overlays

Example shape:

```ts
type ThemeMode = 'light' | 'dark';

type ThemeOverlay = {
  id: string;
  label: string;
  activeFrom?: string;
  activeUntil?: string;
  tokens?: Partial<ThemeTokens>;
  assets?: Partial<ThemeAssets>;
};

type TenantThemeManifest = {
  tenantSlug: string;
  themeFamily: string;
  defaultMode: ThemeMode;
  supports: ThemeMode[];
  assets: ThemeAssets;
  modes: Record<ThemeMode, ThemeTokens>;
  overlays?: ThemeOverlay[];
};
```

## Semantic Token Contract

Tokens should be semantic and reusable across tenants. Avoid tenant-specific token names.

Recommended token categories:

### App shell

- `--app-bg`
- `--app-bg-accent`
- `--app-text`
- `--app-text-muted`

### Masthead

- `--masthead-bg`
- `--masthead-border`
- `--masthead-title`
- `--masthead-nav-bg`
- `--masthead-nav-text`
- `--masthead-nav-hover-bg`
- `--masthead-nav-hover-text`

### Page header

- `--page-header-bg`
- `--page-header-border`
- `--page-label`
- `--page-title`
- `--page-description`
- `--page-action-bg`
- `--page-action-text`

### Surfaces

- `--surface-1`
- `--surface-2`
- `--surface-3`
- `--surface-border`
- `--surface-shadow`

### Cards

- `--card-bg`
- `--card-bg-accent`
- `--card-text`
- `--card-label`
- `--card-title`

### Actions

- `--button-primary-bg`
- `--button-primary-text`
- `--button-secondary-bg`
- `--button-secondary-text`
- `--button-danger-bg`
- `--button-danger-text`

### Inputs

- `--input-bg`
- `--input-border`
- `--input-text`
- `--input-placeholder`
- `--input-focus-ring`

### Feedback

- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`

### Identity

- `--brand-primary`
- `--brand-accent`
- `--brand-highlight`
- `--font-sans`
- `--font-serif`
- `--radius-card`
- `--radius-pill`

If a token is needed in multiple places, it belongs in the contract.

## Runtime Resolution Rules

Theme resolution should happen at the shell level, not inside leaf components.

Recommended resolution order:

1. Resolve current tenant/community from host/domain
2. Load that tenant's theme manifest
3. Resolve desired mode
4. Resolve optional overlay
5. Emit one final resolved token set
6. Apply those tokens to the document root or shell wrapper

### Mode resolution order

Use this precedence:

1. explicit user preference if present
2. tenant default mode if no user preference exists
3. system preference only if product intentionally supports "system"

Recommended first implementation:

- support explicit `light` and `dark`
- defer `system` until the base architecture is stable

### Overlay resolution order

Use this precedence:

1. explicitly forced admin preview overlay if present
2. tenant-configured active overlay if enabled
3. no overlay

Overlays should be optional and easy to disable globally.

## DOM Application Pattern

The active theme should be exposed through both CSS variables and stable data attributes.

Example:

```html
<html
  data-tenant="highlander-today"
  data-theme-mode="dark"
  data-theme-overlay="none"
>
```

Then apply variables at the root shell level:

```ts
style={{
  '--masthead-bg': resolvedTheme.tokens.mastheadBg,
  '--page-header-bg': resolvedTheme.tokens.pageHeaderBg,
  ...
}}
```

The important rule is that components consume semantic variables such as `var(--masthead-bg)` rather than hardcoded tenant colors.

## What Belongs In Components

Components may vary by theme through tokens, assets, and slots.

Components should not vary by:

- tenant-specific conditional layout branches
- hardcoded color hex values
- hardcoded Highlander-only copy or branding names unless that content is intentionally tenant-specific

Acceptable component inputs:

- logo asset URL
- wordmark text
- masthead eyebrow text
- whether the tenant uses icon-only or text wordmark treatment

Unacceptable long-term pattern:

- `if (tenant.slug === 'highlander-today') { ...large custom JSX branch... }`

## Tenant Identity vs Theme Family

Do not assume one tenant always equals one totally unique implementation.

Support this distinction:

- `tenant`
  The actual site/community instance
- `theme family`
  A reusable visual system

That allows:

- multiple tenants to share a starting visual family
- one tenant to evolve across seasonal overlays without rewriting its base theme
- future paid tenant rollout to reuse a controlled set of theme families instead of requiring custom one-off design work for every launch

Example:

- tenant: `highlander-today`
- theme family: `highlander-core`

Later another tenant might use:

- tenant: `johnstown-local`
- theme family: `regional-civic`

## Recommended Use Of Existing Community Fields

Current `Community` fields should be treated as bootstrap identity, not the final theming system:

- `colorPrimary`
- `colorAccent`
- `logoUrl`

They are still useful for:

- admin preview summaries
- initial tenant creation defaults
- simple fallback rendering

They should not be treated as sufficient to drive the full UI long-term.

## Seasonal Theme Rules

Seasonal themes are allowed, but they need boundaries.

Seasonal overlays may change:

- gradients
- accent colors
- decorative textures
- secondary imagery
- limited masthead treatment

Seasonal overlays should not change:

- route structure
- navigation behavior
- information architecture
- component spacing contracts
- accessibility contrast standards

Seasonal design should feel like a skin, not a second product.

## Accessibility Guardrails

Every tenant mode and overlay must preserve:

- AA-level readable contrast on primary text and controls
- visible focus states
- readable form controls
- clear hover/active/disabled states
- usable dark-mode editor/admin/public surfaces

No tenant or seasonal variant should bypass these constraints.

## Initial Implementation Direction

The first implementation should stay narrow:

1. Move shell, masthead, page-header, card, button, and input colors onto semantic tokens
2. Create a first real manifest for Highlander Today
3. Support `light` and `dark` for Highlander Today
4. Add one optional overlay path to prove the seasonal model
5. Keep all other component/layout behavior shared

Do not begin by building a fully custom admin theme editor.

## Proposed Rollout Sequence

1. Add the theme manifest/types/resolver layer in code
2. Refactor `src/app/layout.tsx` to consume resolved shell tokens instead of hardcoded Highlander styles
3. Refactor `src/app/globals.css` shared classes to use semantic CSS variables
4. Update shared components such as `NavigationBar` and `InternalPageHeader` to consume semantic tokens
5. Add tenant/site settings only for mode/overlay selection where needed
6. Add admin preview tooling later, after the token contract is stable

## Canonical Rules

- Shared layout stays shared
- Tenant identity chooses theme assets and tokens
- Mode chooses light or dark token sets
- Seasonal overlays are additive deltas, not alternate layouts
- Code owns theme manifests
- Database owns tenant identity and limited theme selection settings
- Components consume semantic tokens, not tenant-specific color values
- Do not store arbitrary CSS in the database

## Relationship To Existing Docs

- `DESIGN-SYSTEM-ARCHITECTURE.md`
  Remains the canonical shared UI vocabulary and semantic naming reference
- `PROJECT-STATUS.md`
  Should point here as the canonical theme/skin structure reference for future tenant and mode work

Use this document when implementing multi-tenant skins, light/dark mode support, tenant-specific mastheads, and seasonal theme overlays.
