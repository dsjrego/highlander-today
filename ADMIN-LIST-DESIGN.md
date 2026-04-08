# Admin List Design

## Purpose

This document defines the default list structure for dense admin moderation and management surfaces.

Use it when an admin page or admin tab is primarily about scanning records, filtering them quickly, and opening one record at a time for deeper editing.

## Canonical Pattern

The canonical reference is the compact `admin-list` table treatment used by:

- `src/app/admin/articles/ArticleTabs.tsx`
- `src/app/admin/users/page.tsx`
- organization-detail tabs that manage record collections through list-first flows

The goal is operational density, not card-heavy browsing.

## Nested Admin Tabs

When a single admin tab contains two clearly different tasks, use a secondary tab row inside that tab instead of mixing both tasks into one long panel.

Good candidates:

- one subtab for scanning/managing existing records
- one subtab for creating a new record

Examples:

- `Forms`
- `+ Form`

Rules:

- Keep the parent tab as the section label and use subtabs only inside that section.
- Reuse the shared admin tab vocabulary rather than inventing a custom control for each page.
- Secondary tabs should read lighter than the top-level page tabs so the hierarchy stays clear.
- Default the secondary tab to the management/list view unless creation is the primary task.
- After successful creation, switch back to the list subtab and reveal the new record there when practical.

## Required Structure

When the surface is primarily a record list, default to this structure:

1. `admin-card` or `admin-card-tab-body` wrapper supplied by the page/tab shell
2. `admin-list`
3. `admin-list-toolbar`
4. one or more `admin-list-filter` controls
5. `admin-list-table-wrap`
6. `admin-list-table`
7. `admin-list-head`
8. `admin-list-row`
9. `admin-list-cell`
10. `admin-list-pagination` when count or paging context is useful

## Interaction Rules

- Keep the first row dense and scannable.
- Prefer one record per table row.
- Put the primary identifier in the first column and render it as the row's main link or manage trigger.
- Put status, counts, dates, and short metadata in separate columns instead of stacking them into one card body.
- Keep row actions compact and inline.
- If a record needs deeper editing on the same page, expand it inline beneath the row rather than rendering every record as a full editing card by default.
- Use card-style full-detail editors only after the admin explicitly opens a record.

## Filtering And Ordering

- Include a toolbar filter when the list can grow beyond a few entries.
- Filter labels should say exactly what fields the search covers.
- Default sort should favor fast scanning for the specific entity type:
  alphabetical when admins usually know the record name,
  status/date ordering when triage is the main task.

## Empty States

- Empty states should live inside the table body using `admin-list-empty`.
- The message should explain both the zero-result state and the next useful action when possible.

## Forms Tab Guidance

For organization forms specifically:

- Use a nested subtab split:
  `Forms` for the shared list-first management view
  `+ Form` for the create flow
- Render existing forms in the shared `admin-list` table style.
- Show concise columns such as title, status, question count, response count, and updated date.
- Expand a row inline to reveal the full form editor and question builder only when the admin chooses `Manage`.

This keeps the forms tab aligned with the stronger admin operational surfaces instead of drifting into stacked full-card editing for every record.
