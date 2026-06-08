# Workspace & Admin Surface Migration Guide

## Purpose

This is the execution plan for bringing existing administration / management / data-heavy surfaces onto [ADMIN-DESIGN-GUIDELINES.md](./ADMIN-DESIGN-GUIDELINES.md). The guidelines define the target; this document maps the **current code** to that target and sequences the work so an agent (Claude Code / Codex) can do it incrementally without a risky big-bang rewrite.

Read first, in order:
1. [ADMIN-DESIGN-GUIDELINES.md](./ADMIN-DESIGN-GUIDELINES.md) — the rules.
2. [ADMIN-LIST-DESIGN.md](./ADMIN-LIST-DESIGN.md) — the canonical table pattern.
3. This file — what to change and in what order.

**Visual targets (reference implementations):**
- Form-heavy single record → `Organization Management.html`
- Triage queue + drawer edit → `Article Review Queue.html`

When a decision is ambiguous, match those screens.

## Precedence rule

This migration guide does **not** authorize flattening a workspace surface into a generic admin shell when a more specific workspace mockup exists.

Use this order:

1. Exact screenshot / mockup / reference HTML for the target workspace screen
2. This migration plan
3. `ADMIN-DESIGN-GUIDELINES.md`
4. `ADMIN-LIST-DESIGN.md`

Practical rule: **match shell and composition first, then migrate controls and editor patterns inside that shell.**

---

## Scope: what is in / out

**In scope** — surfaces that currently diverge from the guidelines:

| Surface | Files | Primary problem |
|---|---|---|
| Workspace · org membership list | `src/app/profile/[id]/workspace/organizations/page.tsx` | Gradient "hero" section, rounded record cards |
| Workspace · org detail shell | `src/app/profile/[id]/workspace/organizations/[organizationId]/page.tsx` | Four full-card managers stacked vertically; no tabs |
| Workspace · profile editor | `src/components/profile/WorkspaceOrganizationProfileEditor.tsx` | Decorative chrome; field grouping/labels |
| Workspace · locations | `src/components/profile/WorkspaceOrganizationLocationsManager.tsx` | **Every record is a permanently-open `<form>`**; placeholder-only inputs |
| Workspace · members | `src/components/profile/WorkspaceOrganizationMembersManager.tsx` | Same stacked-editor pattern |
| Workspace · contacts | `src/components/profile/WorkspaceOrganizationContactsManager.tsx` | Same stacked-editor pattern |

**Already close to target (use as donors, do not rewrite):**
- `src/app/admin/articles/ArticleTabs.tsx` — correct list + drawer + view-tabs pattern.
- `src/app/admin/organizations/OrganizationTabs.tsx` — correct `admin-list` usage.
- Shared primitives in `globals.css` (`admin-list*`, `admin-card*`, `form-input`, `btn*`) and `src/components/admin/*` (`AdminViewTabs`, `AdminFilterBar`, `AdminChip`, `AdminDrawer`).

**Out of scope:** public-site pages, reporter surfaces, anything not primarily about managing structured records.

---

## The core move

The Workspace managers were built with a different vocabulary than the admin tooling. Migration is mostly **deleting decorative chrome and reusing primitives that already exist** in the admin side.

### Anti-pattern → replacement

| Current (remove) | Target (use) |
|---|---|
| `className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,…)] p-6 shadow-[0_24px_55px_rgba(15,23,42,.16)] backdrop-blur md:p-8"` section wrapper | A flat `card` / `admin-card` surface: `border`, `--radius` 12px, single soft shadow |
| Each record rendered as an always-open `<form>` editing card | `admin-list` table; edit one record at a time via **inline-expand** (locations, contacts) or a **drawer** (queue-style) |
| `<input placeholder="City" … className="form-input" />` with no label | `form-input` **with a persistent `<label>`** + required/optional marker, grouped in a labeled fieldset |
| `text-2xl font-black tracking-[-0.03em] text-slate-950` section titles | `section-title` scale (≈16px/700) under a small eyebrow |
| `CrudActionButton` styles varying per call site | Fixed `btn` hierarchy + fixed placement (see guidelines §6) |
| Ad-hoc `rounded-full bg-slate-950 px-4 py-2` links | `btn btn-primary` / `btn btn-secondary` |
| Inline `BooleanInput` checkbox for settings | toggle switch in a `toggle-field` for consequential booleans; checkbox only for tabular attributes |

### Token / class mapping

Prefer existing shared classes and `--hl-admin-*` tokens. Do **not** introduce route-local hex or gradients.

| Concept | Use |
|---|---|
| App/card background | `--hl-admin-bg`, `--hl-admin-surface`, `--hl-admin-surface-muted` |
| Borders | `--hl-admin-border`, `--hl-admin-border-strong` |
| Text | `--hl-admin-text`, `--hl-admin-text-muted`, `--hl-admin-text-faint` |
| Brand primary / accent | `--brand-primary` (#12436b), `--brand-accent` (#8f1d2c) — accent is identity only, never a button |
| Status | `--hl-admin-ok/-pend/-bad` (+ `-bg`) → render via `AdminChip` tone |
| Table | `admin-list`, `admin-list-table`, `admin-list-row`, `admin-list-cell`, `admin-list-empty`, `admin-list-pagination` |
| Filter bar | `AdminFilterBar` + `admin-list-filter*` |
| Status cuts | `AdminViewTabs` (tone per view) |
| Drawer edit | `AdminDrawer` |
| Inputs | `form-input`, `form-textarea`, `admin-list-cell-select` |
| Buttons | `btn` + `btn-primary` / `btn-secondary` / `btn-ghost` / danger |

---

## Phased plan

Each phase is independently shippable and independently verifiable. Do not start a phase before the previous one type-checks and renders.

### Phase 0 — Confirm shared primitives (no UI change)
- Verify `globals.css` exposes everything the migration needs: `card`/`admin-card`, `admin-list*`, `form-input`, `btn*`, `toggle`/switch, fieldset styling. Add only what is genuinely missing, as shared classes (not route-local).
- Confirm `AdminViewTabs`, `AdminFilterBar`, `AdminChip`, `AdminDrawer` are importable from the Workspace tree (they live under `src/components/admin/*`). If Workspace must not import from admin, promote them to `src/components/shared/*` first.
- **No visual change ships in this phase.**

### Phase 1 — Org detail shell → tabbed
File: `…/workspace/organizations/[organizationId]/page.tsx`
- Replace the four vertically-stacked managers with an **entity header** (logo, name, status pill, type chip, slug, counts; `View public page` + `Save` top-right) followed by a **tab row**: `Profile · Locations · Members · Contacts` (counts as badges).
- Each tab renders one section card. Keep the existing server query; only the presentation changes.
- Accept: all four sections reachable; one visible at a time; no gradient/`rounded-[30px]` wrappers remain.

### Phase 2 — Locations manager → list-first
File: `WorkspaceOrganizationLocationsManager.tsx`
- Render locations in an `admin-list` table: **Location** (label + sub) · Address · Contact · Visibility (chip) · Primary (star) · row actions.
- Move editing into **inline-expand** beneath the row (or `AdminDrawer`). Reuse `LocationFields`, but: add a `<label>` to every input, group into `Identity` / `Address` / `Visibility` fieldsets, mark required vs optional, convert `isPrimary`/`isPublic` to toggle switches.
- Keep `StatusMessage` for success/error; add an `admin-list-empty` body for the zero state with a "Add your first location" action.
- "Add Location" becomes the section's primary action (top-right) opening the same editor empty.
- Accept: list scans at a glance; one editor open at a time; no permanently-open record forms.

### Phase 3 — Members manager → roster table
File: `WorkspaceOrganizationMembersManager.tsx`
- `admin-list` roster: Member (avatar + name + email) · Role (`admin-list-cell-select` inline) · Title · Primary contact (star) · Public (checkbox) · Status (`AdminChip`) · actions.
- Inline-edit low-risk single fields (role, primary-contact) in the row; deeper edits via expand/drawer. Add-member uses the section primary action.
- Mirror the membership status pattern already in `OrganizationDetailEditor.tsx` so admin + workspace behave the same.

### Phase 4 — Contacts manager → table
File: `WorkspaceOrganizationContactsManager.tsx`
- `admin-list`: Name · Title · Linked to (member/location chip) · Email · Phone · Public · actions. Edit via expand/drawer with labeled fields.

### Phase 5 — Profile editor → fieldset form
File: `WorkspaceOrganizationProfileEditor.tsx`
- Convert to a labeled-fieldset form (`Identity` / `Contact` / `Visibility`) with a narrower media sidebar (logo + banner upload slots showing target dimensions). Description gets a character counter. Add a sticky save bar with a dirty indicator + `Discard` / `Save`.
- Replace the decorative section wrapper with `card`.

### Phase 6 — Org membership list page
File: `…/workspace/organizations/page.tsx`
- Replace the gradient hero + rounded record cards with a `card` + `admin-list` (or compact list) of memberships: Organization (name + type) · Role · row actions (`Manage` primary, `View public page` secondary). Keep `admin-list-empty` for the no-memberships state.

### Cross-cutting cleanup (every phase)
- Remove `bg-[linear-gradient(…)]`, `rounded-[30px]`, `shadow-[0_24px_…]`, `backdrop-blur` from migrated files.
- Every input has a `<label>`; placeholders are examples only.
- Buttons follow the hierarchy + placement rules; exactly one primary per context.
- Empty / loading / error / dirty states present (reuse `StatusMessage`, `admin-list-empty`).

---

## Per-file acceptance checklist

A migrated file is done when:

- [ ] No `rounded-[30px]`, gradient `bg-[…]`, oversized shadow, or `backdrop-blur` remain.
- [ ] Collections render as `admin-list` tables, not stacked editor cards.
- [ ] Exactly one editor open at a time (inline-expand or drawer); create reuses that editor.
- [ ] Every form control has a persistent `<label>` and required/optional marking.
- [ ] Fields grouped in labeled fieldsets; correct control per data type (guidelines §5).
- [ ] Buttons use `btn*` hierarchy and the documented placement; one primary per context.
- [ ] Status via `AdminChip`; identity color (`--brand-accent`) used only as a thin accent.
- [ ] Empty / error / dirty states handled.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test:unit` pass; no new route-local hex.
- [ ] Visual parity with the reference mockup for that surface.

---

## Sequencing notes

- Ship **Phase 1 + Phase 2** together first — they deliver the most visible improvement (the screen the redesign targeted) and validate the tab + list + editor pattern before repeating it.
- Phases 3–6 then repeat the proven pattern; they should get faster as shared field/editor pieces stabilize.
- If a shared field/editor component emerges (labeled fieldset, upload slot, toggle-field), extract it to `src/components/shared/*` once, after Phase 2, and reuse — but don't over-abstract before the second use exists.
- Keep diffs scoped per the repo working rules in `AGENTS.md`; do not opportunistically refactor unrelated areas.
