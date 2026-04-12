# Tenant Theming Implementation Plan

> **Last updated:** 2026-04-11
> **Status:** Implementation plan for the first build pass. Not yet built.
> **Depends on:** `TENANT-THEMING-ARCHITECTURE.md`, `DESIGN-SYSTEM-ARCHITECTURE.md`

## Purpose

This document turns the tenant-theming architecture into a practical implementation sequence for the current codebase.

The goal of phase 1 is not to build a full tenant-brand CMS or theme editor. The goal is to make the shared shell and shared visual primitives actually themeable so future tenants can be added without rewriting `layout.tsx` and shared CSS every time.

## Phase 1 Outcome

At the end of phase 1, the codebase should support:

- one canonical code-owned theme manifest for Highlander Today
- both `light` and `dark` theme modes for that tenant
- shell-level theme resolution
- semantic CSS tokens consumed by shared shell components
- a clean path for future tenants and future seasonal overlays

Phase 1 does **not** need:

- per-tenant custom layout branches
- a DB-backed arbitrary style editor
- user-facing seasonal theme controls
- complete refactoring of every route in the app

## Current-Code Reality

The current repo already has the right infrastructure anchors:

- tenant/community resolution already exists in `src/lib/tenant.ts`
- community lookup already exists in `src/lib/community.ts`
- `Community` already stores bootstrap identity fields in `prisma/schema.prisma`
- shared public structure already routes through `src/app/layout.tsx`
- shared page-header structure already routes through `src/components/shared/InternalPageHeader.tsx`
- shared public navigation already routes through `src/components/layout/NavigationBar.tsx`
- mobile utility actions already route through `src/components/layout/BannerActions.tsx`
- shared visual primitives already live largely in `src/app/globals.css`

The current problem is not missing architecture. It is that the visual layer is still hardcoded:

- shell gradients are hardcoded in `src/app/layout.tsx`
- shared classes still contain Highlander-specific gradients and colors
- navigation controls use fixed colors instead of semantic variables
- text such as `Highlander Today` still appears directly in the shell instead of coming from tenant identity inputs

## Implementation Decision Summary

### 1. Start at the shell, not at leaf pages

The first pass should theme the shared shell and shared primitives first:

- app background
- masthead
- navigation pills/dropdowns
- footer
- page headers
- cards
- buttons
- form controls

Reason:

- these are the highest-leverage shared surfaces
- they currently carry the strongest hardcoded Highlander styling
- theming individual pages first would produce drift instead of a real foundation

### 2. Keep theme manifests in code

Theme manifests should live in `src/lib/theme/`, not in the database.

Reason:

- reviewable in git
- typed
- testable
- safer than DB-stored arbitrary CSS

### 3. Treat `Community` colors as bootstrap fallback only

`colorPrimary` and `colorAccent` should remain useful, but they should not be treated as the full theme system.

Reason:

- a real shell/theme contract needs many more decisions than two colors

### 4. Support `light` and `dark` first, defer `system`

Phase 1 should support only:

- `light`
- `dark`

Reason:

- `system` adds resolution complexity without proving the core architecture
- explicit modes are easier to test and reason about

### 5. Defer seasonal overlays until the shell token model is working

Seasonal overlay support should be represented in types and docs, but the first shipped implementation can stop at tenant + mode.

Reason:

- the architecture should allow overlays
- the first code slice should prove the base token system first

## Required Decisions Before Coding

These need to be treated as locked for phase 1:

### Theme token contract

We need one initial token contract and should avoid adding names ad hoc during refactor.

### Highlander baseline

We need to decide Highlander Today's official token set for:

- `light`
- `dark`

That includes:

- app background
- masthead treatment
- nav pills
- page header treatment
- cards
- primary/secondary actions
- form controls

### Mode ownership

We need to decide whether mode is:

- tenant default only in phase 1
- or tenant default plus explicit user preference

Recommended phase-1 answer:

- tenant default plus a developer/admin override path for testing
- defer persistent user preference until the token system is stable

### Tenant identity inputs

We need to define what tenant-facing identity is passed into the shell:

- site name
- short wordmark label if different
- logo URL or icon asset
- optional eyebrow/support text
- footer identity text

## Proposed File Structure

Add a dedicated theme layer:

```text
src/lib/theme/
  types.ts
  manifests/
    highlander-today.ts
  registry.ts
  resolve-theme.ts
  to-css-vars.ts
```

Recommended responsibilities:

- `types.ts`
  Shared types such as `ThemeMode`, `ThemeTokens`, `TenantThemeManifest`, `ResolvedTheme`
- `manifests/highlander-today.ts`
  Highlander Today canonical manifest for `light` and `dark`
- `registry.ts`
  Maps tenant slug or theme family to manifest
- `resolve-theme.ts`
  Composes tenant identity + mode into one resolved theme object
- `to-css-vars.ts`
  Converts a resolved token set into inline CSS variable output

## Phase 1 Token Contract

Phase 1 should keep the token set intentionally narrow but sufficient for the shared shell.

### App shell

- `--app-bg`
- `--app-bg-decor`
- `--app-text`
- `--app-text-muted`

### Masthead

- `--masthead-bg`
- `--masthead-border`
- `--masthead-title`
- `--masthead-eyebrow`
- `--masthead-icon-start`
- `--masthead-icon-end`

### Navigation

- `--nav-pill-bg`
- `--nav-pill-border`
- `--nav-pill-text`
- `--nav-pill-hover-bg`
- `--nav-pill-hover-border`
- `--nav-pill-hover-text`
- `--nav-dropdown-bg`
- `--nav-dropdown-border`
- `--nav-dropdown-text`
- `--nav-dropdown-hover-bg`
- `--nav-dropdown-hover-text`

### Page header

- `--page-header-bg`
- `--page-header-border`
- `--page-label`
- `--page-title`
- `--page-description`
- `--page-action-bg`
- `--page-action-border`
- `--page-action-text`
- `--page-action-hover-bg`
- `--page-action-hover-text`

### Cards and surfaces

- `--card-bg`
- `--card-bg-accent`
- `--card-bg-deep`
- `--card-text`
- `--card-label`
- `--card-title`
- `--surface-border`
- `--surface-shadow`

### Buttons

- `--button-primary-bg`
- `--button-primary-text`
- `--button-primary-hover-bg`
- `--button-secondary-bg`
- `--button-secondary-text`
- `--button-secondary-hover-bg`

### Forms

- `--input-bg`
- `--input-border`
- `--input-text`
- `--input-placeholder`
- `--input-focus-ring`

### Identity

- `--brand-primary`
- `--brand-accent`
- `--font-sans`
- `--font-serif`
- `--radius-card`
- `--radius-pill`

## Exact Files To Touch In Phase 1

### New files

- `src/lib/theme/types.ts`
- `src/lib/theme/manifests/highlander-today.ts`
- `src/lib/theme/registry.ts`
- `src/lib/theme/resolve-theme.ts`
- `src/lib/theme/to-css-vars.ts`

### Existing files

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/layout/NavigationBar.tsx`
- `src/components/layout/BannerActions.tsx`
- `src/components/shared/InternalPageHeader.tsx`

### Optional phase-1.5 files if needed

- `src/components/layout/Masthead.tsx`
  if the shell header should be extracted from `layout.tsx` during cleanup
- `src/components/layout/Footer.tsx`
  only if the active footer is extracted from `layout.tsx`

## Refactor Plan By File

### 1. `src/lib/theme/*`

Build the typed theme layer first.

Required outputs:

- theme mode type
- token type
- Highlander manifest
- manifest registry lookup
- theme resolver
- CSS variable emitter

This needs to exist before touching the shell so refactors have a stable target.

### 2. `src/app/layout.tsx`

Refactor the shell to:

- resolve the active tenant/community
- select a theme manifest
- resolve `light` or `dark`
- apply `data-tenant` and `data-theme-mode` attributes
- apply CSS variables at the root shell wrapper
- stop hardcoding Highlander gradients and shell colors directly in JSX
- stop hardcoding tenant label strings where tenant identity should be injected

Phase 1 can still keep the current general layout structure.

Do not redesign the shell while theming it.

### 3. `src/app/globals.css`

Refactor shared classes to consume semantic variables instead of fixed Highlander color values.

Highest-priority targets:

- `.page-header`
- `.page-label`
- `.page-title`
- `.page-description`
- `.page-header-action`
- `.card`
- `.card-dark`
- `.card-accent`
- `.card-deep`
- `.card-label`
- `.card-title`

This is the biggest leverage point in the repo.

### 4. `src/components/layout/NavigationBar.tsx`

Replace hardcoded nav pill and dropdown colors with semantic theme classes or CSS variables.

Do not change the navigation data logic in this pass.

This pass is visual only.

### 5. `src/components/layout/BannerActions.tsx`

Refactor mobile utility actions and dropdown visuals onto semantic tokens so mobile shell and desktop shell follow the same theme.

Again, do not change auth/nav behavior in this pass.

### 6. `src/components/shared/InternalPageHeader.tsx`

Keep structure unchanged.

Ensure all visual styling continues to come from shared `globals.css` classes rather than per-page hardcoding.

This component is already structurally sound; the real work is making its CSS token-driven.

## Recommended Build Sequence

### Step 1. Add the typed theme layer

Do this first so the rest of the code can compile against stable theme types and helper functions.

### Step 2. Define Highlander Today light/dark manifest

Create the first real manifest with:

- tenant identity
- shell tokens
- page-header tokens
- card/action/input tokens

Do not try to support a second tenant yet.

### Step 3. Refactor `layout.tsx`

Apply resolved theme vars at the root shell and replace shell hardcoding.

### Step 4. Refactor `globals.css`

Convert shared shell and page-header/card styles to variables.

### Step 5. Refactor navigation and banner actions

Move pill/dropdown/button styling onto semantic tokens.

### Step 6. Verify Highlander in both modes

Check:

- desktop masthead
- mobile masthead
- nav pills and dropdowns
- footer
- shared page headers
- shared cards
- forms and action pills

## Verification Checklist

Phase 1 should be considered complete only if all of the following are true:

- `npm run lint` passes
- `npm run typecheck` passes
- Highlander Today renders correctly in `light`
- Highlander Today renders correctly in `dark`
- no tenant-specific shell styling remains hardcoded in `layout.tsx`
- shared shell components use semantic tokens rather than direct Highlander hex values
- adding a second tenant manifest would not require editing component structure

## Explicit Non-Goals

Do not include these in phase 1:

- full admin tenant-theme editor
- arbitrary CSS storage in DB
- user-uploaded style JSON
- tenant-specific route/layout forks
- seasonal overlays with custom layout changes
- complete route-by-route visual cleanup across the whole app

## Recommended Acceptance Criteria

Use this as the decision standard for whether phase 1 is truly done.

### Functional

- one tenant manifest exists in code
- shell can resolve tenant + mode
- theme variables are applied at runtime

### Architectural

- theme concerns live in `src/lib/theme/*`
- shared components do not branch on tenant slug for visuals
- semantic variables are the main visual interface between theme layer and components

### Operational

- Highlander remains visually intact or improved in both modes
- future sessions can add a tenant by creating a manifest rather than rewriting shell JSX

## Next Phase After This

After phase 1 is stable, the next reasonable phase is:

1. persistent user mode preference if desired
2. seasonal overlay support
3. tenant identity extraction for shell text/assets
4. expansion of token usage into more page-level components
5. optional admin preview tools for theme switching

Do not start those until phase 1 is proven.
