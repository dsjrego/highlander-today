# Admin & Management UI Design Guidelines

## Purpose

This document defines how every **administration, management, and data-heavy** surface in Highlander Today should look and behave: organization workspaces, admin moderation, roster and record managers, settings, and any screen whose primary job is to scan, edit, and manage structured data.

It exists so that a coding agent (Claude Code, Codex) or a human can build a *new* management surface that feels native to the product **without re-deriving the rules each time**. When you build or touch one of these surfaces, follow this document. Diverge only with a stated reason.

This document is the umbrella for data-dense UI. It works **with**, and does not replace:

- [DESIGN-SYSTEM-ARCHITECTURE.md](./DESIGN-SYSTEM-ARCHITECTURE.md) — shared structural vocabulary (`page-*`, `section-*`, `card-*`) and theming/token direction.
- [ADMIN-LIST-DESIGN.md](./ADMIN-LIST-DESIGN.md) — the canonical compact list/table pattern. **For table specifics, that document is authoritative;** this one covers everything around the table (forms, fields, buttons, editing flow, states).

**Reference implementation:** the redesigned organization-management screen at `design/admin/Organization Management.html` (in the design workspace). It demonstrates every rule below as a single coherent screen. When a rule is ambiguous, match that screen.

## Reference Precedence

These guidelines define the default system for management surfaces, but they do **not** outrank a more specific approved workspace or product mockup.

Use this precedence order when implementing or revising a management screen:

1. **A provided screenshot, mockup, or reference HTML for the exact surface** — authoritative for shell, composition, spacing, and visual hierarchy.
2. **A surface-specific migration or implementation guide** — authoritative for how the existing code should be moved toward that target.
3. **This document** — authoritative for reusable control rules, table/editor behavior, button hierarchy, field labeling, and state handling.
4. **Shared design-system documents** — authoritative for tokens and shared structural vocabulary.

### Workspace vs. Admin surfaces

Do not assume every management surface should collapse into the generic admin shell.

- **Admin operations surfaces** should use the default admin-shell vocabulary from this document.
- **Workspace management surfaces** may reuse the same controls, field rules, table density, button hierarchy, and editing patterns, but should preserve a workspace-specific shell when one exists: dark member sidebar, scoped workspace top bar, breadcrumb line, entity summary card, and tab composition.

If a workspace reference exists, match that shell first, then apply the field/list/editor rules inside it.

---

## 1. Core Principles

1. **Operational density, not card sprawl.** These surfaces are tools. Optimize for scanning many records and editing one at a time. A screen that shows three records as three giant editor cards has failed.
2. **One read path, one edit path.** Records are *scanned* in a table and *edited* in one deliberate place (inline-expand, drawer, or modal). Never render every record as a permanently-open form.
3. **Structure is visible.** Group related fields under labeled fieldsets. Every input has a real, persistent `<label>` — never a placeholder masquerading as a label.
4. **Color carries meaning, not decoration.** Brand color marks identity and the active path; status color encodes state. No decorative gradients on content surfaces, no rounded "hero" cards for tools.
5. **Predictable controls.** The same action lives in the same place on every screen: section-level create top-right, row actions far-right, save/cancel bottom-right of the editor. Users should never hunt.
6. **Calm default, clear emphasis.** Most of the screen is neutral slate. One primary action per context, one accent line per active element. Emphasis only works if it is rare.

> The anti-pattern this replaces: stacked full-width editor cards wrapped in `rounded-[30px]`, gradient fills, and heavy drop-shadows, with placeholder-only fields and inconsistent pill buttons. Do not build that.

---

## 2. Design Tokens

Use the shared admin tokens. Do not introduce route-local hex values. These already exist (or should be referenced) via `globals.css` / the `.admin-shell` scope.

### Surfaces & text
| Token | Value | Use |
|---|---|---|
| `--bg` / `--hl-admin-bg` | `#eef1f5`–`#f4f6f9` | App background behind cards |
| `--surface` | `#ffffff` | Cards, tables, inputs |
| `--surface-muted` / `--surface-sunken` | `#f4f6f9` / `#f8fafc` | Toolbars, table headers, footers, fieldset insets |
| `--border` | `#dde3ea`–`#cbd5e1` | Hairlines, dividers, input borders |
| `--border-strong` | `#c6cfda`–`#94a3b8` | Input borders, segmented controls |
| `--text` | `#1c2733`–`#20303d` | Primary text |
| `--text-muted` | `#5d6b7a`–`#64748b` | Secondary text, descriptions |
| `--text-faint` | `#8c98a6`–`#94a3b8` | Placeholder, disabled, eyebrow icons |

### Brand
| Token | Value | Use |
|---|---|---|
| `--navy` (brand primary) | `#12436b` | Primary buttons, active states, links, focus ring |
| `--navy-tint` | `#e9f0f6` | Selected rows, chips, primary-tinted fills |
| `--crimson` (brand accent) | `#8f1d2c` | Identity accents only: active-tab underline, section eyebrows, editor edge, logo mark |
| `--crimson-tint` | `#fbecee` | Accent chips, active-tab count badge |

**Color discipline:** Navy is the *working* color (interactive, primary). Crimson is the *identity* color — used sparingly as a thin accent that says "Highlander," never as a button or large fill. Never use crimson for a primary action; that's navy's job. Crimson on a destructive action is wrong too — destructive uses the red status token.

### Status (semantic — the only other colors allowed)
| State | Text | Background | Border |
|---|---|---|---|
| Success / Active / Public | `#15803d` | `#e4f6ea` | `#bce5c8` |
| Warning / Pending | `#b45309` | `#fdf2dc` | `#f0d9a8` |
| Danger / Error / Destructive | `#b91c1c` | `#fdecec` | `#f3c9c9` |
| Info / Neutral | `#12436b` | `#e9f0f6` | `#c4d6e6` |

### Shape & elevation
- Radius: `10–12px` cards, `8px` inputs/buttons, `999px` pills. Never the oversized `30px` "hero" radius on a tool surface.
- Elevation: at most one soft shadow on cards (`0 1px 2px`, `0 6px 18px` at low opacity). Tables and inputs are flat with borders. No layered/colored glows.
- Type: system sans stack (`-apple-system, "Segoe UI", Roboto, …`). It is the correct, native, application feel. Do not import display fonts for tools.

---

## 3. Page & Layout Structure

Every management screen follows the same skeleton, top to bottom:

```
app sidebar  |  topbar (breadcrumb + scoped search)
             |  entity header   ← who/what am I editing + identity + top-level actions
             |  section tabs    ← Profile · Locations · Members · Contacts …
             |  active section card
             |    section header (eyebrow · title · description · primary action)
             |    toolbar (filter · segment · result count)
             |    list / form
             |    footer (count · pagination)
```

### Rules
- **Breadcrumb** the path (`Workspace / Organizations / <name>`); the last segment is the current record, bold, non-link.
- **Entity header** carries identity: logo/mark, name, a status pill, a type chip, the slug/URL, and summary counts. Top-level actions (`View public page`, `Save changes`) sit top-right of the header.
- **Tabs split sub-resources** when one record owns several collections (profile, locations, members, contacts). Use tabs — not four stacked sections on one endless page. The active tab is marked by a **crimson** underline; counts ride as muted pill badges.
- **One section card per tab.** It owns its own header, toolbar, body, and footer.
- **Spacing scale:** `4 · 8 · 12 · 16 · 18 · 24`. Card padding `16–18px`, field gaps `14px`, section gaps `16–20px`. Be tight and even; whitespace is structure, not filler.
- **Content max-width** ~`1240px`. Tables may scroll horizontally inside their wrapper rather than wrapping cells.

### When NOT to use tabs
If a record has only one collection, skip the tab row and render the single section directly. If a tab mixes "manage existing" and "create new," use the nested secondary subtab split (`List` / `+ New`) from [ADMIN-LIST-DESIGN.md](./ADMIN-LIST-DESIGN.md) rather than one long mixed panel.

---

## 4. Tables & Lists

Tables are the default for any collection that can grow beyond ~2 entries. (Table mechanics, density, filtering, empty states, and pagination are specified in [ADMIN-LIST-DESIGN.md](./ADMIN-LIST-DESIGN.md) — follow it.) The rules below cover composition and column design.

### Column rules
- **First column is the identity** (name/label) + one muted sub-line of context. It is the record's anchor and the manage trigger.
- **One concept per column.** Status, counts, dates, visibility, and "primary" each get their own column. Never stack four facts into one cell.
- **Right-align numbers**, center status/boolean/icon columns, left-align text.
- **Row actions** live in a final, header-less, right-aligned column as compact icon buttons (edit, delete, overflow `⋯`). Destructive icon buttons reveal red only on hover.
- **Booleans in a row** render as a real checkbox or a star toggle, not text. **Status** renders as a status pill (dot + label). **Category/type** renders as a tinted chip.
- **Inline edit-in-place** is allowed for low-risk single fields (e.g. a member's Role `<select>` right in the row). Anything with multiple fields opens the full editor instead.
- **Zebra + hover:** subtle zebra (`--row-zebra`), `--row-hover` on hover, `--navy-tint` on the expanded/selected row.

### Toolbar
Sits between section header and table on `--surface-sunken`: a filter field (icon + input, placeholder names the exact fields it searches), optional segmented control for quick status cuts (`All / Public / Hidden`), and a right-aligned result count. Show the filter whenever the list can exceed a handful of rows.

---

## 5. Field Types & Form Controls

Every input is built from the shared `form-input` / `.input` family. Consistency here is what makes the whole product feel designed.

### Universal field anatomy
```
label (12px/600, + required * in crimson OR "optional" in faint)
control (36px tall, 8px radius, --border-strong, navy focus ring)
hint (11px faint)  — optional, explains format/consequence
error (11px red + icon) — replaces hint when invalid
```
- **Labels are mandatory and persistent.** A placeholder is example text (`Suite, floor, unit…`), never the field's name. The screen this replaces used placeholder-only fields — do not.
- **Required vs optional is always marked** — `*` in crimson for required, a faint "optional" tag otherwise. Pick one convention per form and apply it to every field.
- **Focus state** is a navy border + `3px` navy ring at ~14% alpha. Same on every control.

### Control selection table
| Data | Control | Notes |
|---|---|---|
| Short text | `text input` | 36px, single line |
| Long text | `textarea` | min ~74px, vertical resize, **character counter** in the label row when limited |
| One of few (≤ ~7, known) | `select` | Custom chevron; never a native unstyled dropdown |
| One of many / searchable | combobox / typeahead | When options are long or numerous |
| One of 2–3 short options | segmented control | Inline, no dropdown — faster to scan |
| Boolean: setting/consequence | **toggle switch** in a `toggle-field` (label + hint + switch) | For "publish," "show publicly," "primary" — things with an effect |
| Boolean: attribute in a row/list | **checkbox** | Compact, tabular |
| URL | input with `https://` **prefix affix** | Store/display the bare host |
| Email / phone | `text input`, format-validated | Phone may auto-format on input |
| State + ZIP, qty + unit | **paired inputs in one field** | Group tightly under a single label (e.g. `State / ZIP`) |
| Money | input with currency prefix affix, right-aligned | — |
| Date / range | date picker | Don't hand-roll three number inputs |
| Image / file | **upload slot**: framed preview + dimension hint + replace button | Show target size (`240×240`) and constraints (`PNG/SVG · max 2 MB`) |

### Layout
- Group fields into **labeled fieldsets** by meaning (`Identity`, `Contact`, `Visibility`). The legend is a small uppercase divider.
- Two-column field grid on desktop; full-width (`col-2`) for description, address line 1, and anything long. Collapse to one column under ~980px.
- For record forms that also have media, use a **main column + a narrower media/visibility sidebar** (see the Profile tab in the reference screen).

---

## 6. Buttons: Hierarchy & Placement

A fixed hierarchy and fixed positions. This is where the old screen felt "random" — buttons varied in style and location per section.

### Hierarchy (max one primary per context)
| Variant | Look | Use |
|---|---|---|
| **Primary** | solid `--navy`, white text | The one main action of the context — `Save`, `Add location` |
| **Secondary** | white, slate border | Alternative/neutral — `View public page`, `Invite member`, `Replace logo` |
| **Ghost** | transparent, muted text | Low-stakes — `Cancel`, `Discard` |
| **Danger** | white with red border/text, red fill on hover | Destructive — `Delete`. Confirm before it acts. |
| **Icon** | square, bordered on hover | Compact row actions; always `title`/`aria-label` |

- Buttons are `8px` radius, ~`34px` tall (`29px` for `-sm` inside editors/rows). **Not** full-pill. Reserve pills for *status*, not actions.
- A leading icon is encouraged on primary/secondary actions; keep it `15–16px`.

### Placement (memorize this)
- **Section create** (`Add X`, `Invite X`) → **top-right of the section header.**
- **Row actions** (edit / delete / overflow) → **far-right cell** of each row.
- **Editor actions** → editor footer: **Delete far-left**, then a spacer, then **Cancel (ghost) + Save (primary) bottom-right.**
- **Page/form save** → sticky `save-bar` at the bottom of a long form: dirty indicator left, `Discard` + `Save` right.
- Never put the primary action bottom-left or floating mid-content.

---

## 7. Editing Patterns

Choose the edit surface by record complexity. Be consistent within a screen.

| Pattern | Use when | How |
|---|---|---|
| **Inline edit-in-place** | a single low-risk field | The control lives in the row (e.g. Role select). Saves on change or with a tiny inline confirm. |
| **Inline expand** *(default for record editing)* | a record with several fields, edited in list context | Clicking `Manage`/the chevron expands a full editor **beneath the row**; the row stays as the header. Crimson left-edge marks the open editor. One row open at a time. |
| **Side drawer** | editing benefits from keeping the list visible, or the form is long | Right-side panel, same field system, same footer. |
| **Modal** | a short, focused, blocking create/confirm | Small forms and destructive confirms only. Don't put a 12-field editor in a modal. |

### Rules
- **Default to inline-expand** for record collections (locations, contacts). It is the pattern in [ADMIN-LIST-DESIGN.md](./ADMIN-LIST-DESIGN.md) and the reference screen.
- **Never** render every record pre-expanded. The list is the resting state.
- **Create** reuses the same editor as edit — opened empty from the section's primary action (or a nested `+ New` subtab), not a different-looking form.
- **Save / Cancel always paired**, bottom-right of the editor. Save disabled (with a reason, e.g. "Fix 1 error to save") while invalid.
- **Destructive actions confirm** and explain the consequence; the confirm's primary button is the danger variant.

---

## 8. States

Design these four up front — they are not optional polish.

- **Empty:** inside the list body, a centered block — small tinted icon, one-line explanation, and the next useful action as a button (e.g. *"No locations yet — Add your first location"*). Never a bare "No data."
- **Loading:** skeleton rows that match the table's columns, or an inline spinner on the acting control. Never collapse layout to a centered page spinner for a partial update.
- **Error:** field-level errors replace the hint (red text + icon, red input ring) and block save with a stated reason. Form/section-level errors use an info/danger status banner at the top of the card. Always say what to do next.
- **Validation:** validate on blur and on submit; show success transiently (toast or inline note), don't trap the user in a modal on success.
- **Dirty:** a long form shows an "Unsaved changes" indicator in its save bar and offers Discard.

---

## 9. Accessibility & Keyboard

- Every control has a programmatic label (`<label for>` or `aria-label`); icon-only buttons always carry `aria-label`/`title`.
- Visible focus ring on every interactive element (the navy ring) — never remove outlines without replacing them.
- Color is never the only signal: status pills pair a dot/label with color; errors pair an icon with red.
- Meet WCAG AA contrast (the tokens above are chosen to pass on white).
- Tables are real `<table>` semantics; toggles/checkboxes are real inputs or have correct `role`/`aria-checked`.
- Tab order follows visual order; expanded editors and drawers move focus to the first field and trap focus while open; `Esc` cancels.
- Hit targets ≥ 32px in dense tables, ≥ 44px on touch contexts.

---

## 10. Build Checklist

Before considering a management surface done:

- [ ] Records scan in a **table**, not stacked editor cards.
- [ ] Sub-resources are **tabbed**; active tab has the crimson underline + count badge.
- [ ] Section header carries eyebrow · title · description, with the **create action top-right**.
- [ ] A toolbar with a **labeled filter** + result count when the list can grow.
- [ ] Every field has a **persistent label** and required/optional marking; placeholders are examples only.
- [ ] Fields grouped into **labeled fieldsets**; correct control per data type (§5 table).
- [ ] Editing uses **inline-expand** (or a justified drawer/modal); one editor open at a time; create reuses the editor.
- [ ] Buttons follow the **hierarchy and placement** rules (§6); exactly one primary per context.
- [ ] **Empty, loading, error, validation, dirty** states all designed.
- [ ] Only **brand + status tokens** used; no route-local hex, no decorative gradients, no oversized radii.
- [ ] Keyboard, focus, labels, and AA contrast verified.

When in doubt, open `design/admin/Organization Management.html` and match it.
