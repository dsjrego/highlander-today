# Reporter Agent Phase 1 Implementation Checklist

## Purpose

Translate `REPORTER-AGENT-PHASE-1-SPEC.md` into a concrete implementation checklist against the current Highlander Today codebase.

This document is intentionally operational. It maps the Phase 1 reporter foundation to the files, schema seams, permission hooks, API conventions, and UI patterns already present in the repo.

## Current-Code Constraints

The current repo already establishes several important boundaries:

- app stack: Next.js App Router + TypeScript
- data layer: Prisma + PostgreSQL in `prisma/schema.prisma`
- auth/session + middleware header pattern
- compact admin operational UI
- article creation and moderation already live through `src/app/local-life/submit/page.tsx`, `src/app/api/articles/route.ts`, and `src/app/admin/articles/page.tsx`
- permissions currently flow through `src/lib/permissions.ts`
- activity logging already exists via `ActivityLog` and `logActivity`

Phase 1 should attach to those seams instead of inventing parallel architecture.

## Phase 1 Deliverables

Build these deliverables in order:

1. schema foundations for reporter runs and source packets
2. permission and activity-log support
3. public article-request intake
4. internal admin list/detail pages
5. source-packet CRUD
6. bounded AI draft generation from manual source packets
7. convert-to-article flow into the existing `Article` draft workflow
8. tests

## 1. Prisma Schema

### File

- `prisma/schema.prisma`

### Add enums

- `ReporterRunStatus`
- `ReporterMode`
- `ReporterRequestType`
- `ReporterSourceType`
- `ReporterReliabilityTier`
- `ReporterValidationSeverity`
- `ReporterDraftStatus`
- `ReporterDraftType`

### Add models

- `ReporterRun`
- `ReporterSource`
- `ReporterBlocker`
- `ReporterDraft`
- `ReporterValidationIssue`

### Add minimal relations to existing models

#### `Community`

Add:

- `reporterRuns ReporterRun[]`

#### `User`

Add:

- `reporterRunsCreated ReporterRun[] @relation("reporterRunCreatedBy")`
- `reporterRunsAssigned ReporterRun[] @relation("reporterRunAssignedTo")`
- `reporterSourcesCreated ReporterSource[] @relation("reporterSourceCreatedBy")`
- `reporterDraftsCreated ReporterDraft[] @relation("reporterDraftCreatedBy")`
- `reporterBlockersResolved ReporterBlocker[] @relation("reporterBlockerResolvedBy")`

#### `Article`

For Phase 1, use a nullable backlink only if implementation wants one:

- `reporterRun ReporterRun?`

This can be implemented either:

- as `Article.reporterRunId` unique nullable
- or as `ReporterRun.linkedArticleId`

Recommendation:

- use `ReporterRun.linkedArticleId`

That keeps the reporter system as the extension layer rather than contaminating `Article` more than necessary.

### Recommended model details

#### `ReporterRun`

Must include:

- tenant/community context
- creator
- optional assignee
- run status
- reporting mode
- request type
- primary topic text
- optional subject name
- requester contact fields
- internal notes
- optional linked article id

Recommended indexes:

- `[communityId, status]`
- `[assignedToUserId, status]`
- `[createdByUserId]`
- `[linkedArticleId]`
- `[createdAt]`

#### `ReporterSource`

Must include:

- run id
- source type
- label/title
- URL if applicable
- excerpt/content note
- reliability tier
- optional links to existing product entities
- ordering

Recommended indexes:

- `[reporterRunId, sortOrder]`
- `[sourceType]`

#### `ReporterBlocker`

Must include:

- run id
- code
- message
- resolution status

Recommended indexes:

- `[reporterRunId, isResolved]`

#### `ReporterDraft`

Must include:

- run id
- draft body
- headline nullable
- dek nullable
- draft status
- draft type
- provider/model metadata nullable

Recommended indexes:

- `[reporterRunId, createdAt]`

#### `ReporterValidationIssue`

Must include:

- run id
- optional draft id
- code
- severity
- message
- resolution status

Recommended indexes:

- `[reporterRunId]`
- `[reporterDraftId]`

### Schema push note

This repo still uses `prisma db push`, not checked-in migrations. Phase 1 implementation should follow the existing environment-specific schema push rules already documented in `PROJECT-STATUS.md`.

## 2. Permission Wiring

### File

- `src/lib/permissions.ts`

### Add new actions

Add action constants:

- `CREATE_REPORTER_RUN`
- `VIEW_REPORTER_RUN`
- `EDIT_REPORTER_RUN`
- `ASSIGN_REPORTER_RUN`
- `ADD_REPORTER_SOURCE`
- `GENERATE_REPORTER_DRAFT`
- `CONVERT_REPORTER_TO_ARTICLE`

### Update permission matrix

Recommended initial access:

- `REGISTERED` + `READER`
  - `CREATE_REPORTER_RUN`
- `REGISTERED` + `CONTRIBUTOR`
  - `CREATE_REPORTER_RUN`
- `TRUSTED` + `CONTRIBUTOR`
  - `CREATE_REPORTER_RUN`
  - `VIEW_REPORTER_RUN`
  - `EDIT_REPORTER_RUN`
  - `ADD_REPORTER_SOURCE`
- `TRUSTED` + `STAFF_WRITER`
  - above plus `GENERATE_REPORTER_DRAFT`
- `TRUSTED` + `EDITOR`
  - above plus `ASSIGN_REPORTER_RUN`
  - plus `CONVERT_REPORTER_TO_ARTICLE`
- `TRUSTED` + `ADMIN`
  - same as editor
- `TRUSTED` + `SUPER_ADMIN`
  - same as admin

### Legacy permission bridge

Extend `legacyPermissionMap` with strings like:

- `reporter:create`
- `reporter:view`
- `reporter:edit`
- `reporter:assign`
- `reporter:source:add`
- `reporter:draft`
- `reporter:convert`

This keeps route handlers consistent with existing code conventions.

## 3. Activity Log Support

### Files

- `prisma/schema.prisma`
- `src/lib/activity-log.ts` if needed

### Add `ResourceType`

Add:

- `REPORTER_RUN`
- `REPORTER_DRAFT`

Current `ActivityAction` is likely sufficient for Phase 1:

- `CREATE`
- `UPDATE`
- `DELETE`
- `APPROVE`

If truly needed later, add more action types in a future slice.

### Log these events

- reporter run created
- reporter run updated/assigned
- source added
- blocker resolved
- draft generated
- run converted to article

## 4. Reporter Service Layer

### New folder

- `src/lib/reporter/`

### New files

- `src/lib/reporter/types.ts`
- `src/lib/reporter/permissions.ts`
- `src/lib/reporter/run-normalizer.ts`
- `src/lib/reporter/source-packet.ts`
- `src/lib/reporter/status.ts`
- `src/lib/reporter/draft-generator.ts`
- `src/lib/reporter/draft-validator.ts`
- `src/lib/reporter/provider-adapter.ts`
- `src/lib/reporter/provider-anthropic.ts`
- `src/lib/reporter/provider-openai.ts`

### Responsibilities

#### `types.ts`

Define TypeScript shapes for:

- intake payload
- source packet
- draft result
- validation issue result

#### `permissions.ts`

Wrap reporting-specific permission checks rather than scattering literal permission strings.

#### `run-normalizer.ts`

Normalize public intake payloads:

- trim strings
- normalize optional empty fields to `null`
- sanitize link arrays
- collapse blank source inputs

#### `source-packet.ts`

Build the bounded packet passed to the draft generator from:

- run
- ordered sources
- notes
- linked entity summaries

#### `status.ts`

Hold run-status transition helpers so route logic stays explicit and consistent.

#### `draft-generator.ts`

Generate bounded outputs only from the assembled source packet.

Phase 1 functions:

- `generateReporterDraft`
- `generateSourcePacketSummary`
- `generateReportingGaps`

#### `draft-validator.ts`

Implement explicit code-side validation for:

- advisory drift
- chatbot filler
- missing attribution in obvious claim cases
- empty headline/body issues

Keep Phase 1 validation small but inspectable.

#### `provider-adapter.ts`

Define provider-agnostic contract.

#### `provider-anthropic.ts` and `provider-openai.ts`

Keep vendor-specific logic isolated. Default actual provider based on env.

## 5. Public Intake UI

### New route

- `src/app/report-a-story/page.tsx`

### Likely companion component

- `src/app/report-a-story/ReportAStoryClient.tsx`

### UI behavior

Use the product’s normal public shell and `InternalPageHeader`.

Fields:

- topic
- what happened
- who is involved
- where did it happen
- when did it happen
- why it matters
- supporting links
- notes
- contact fields

### Validation behavior

Require enough signal to avoid junk runs.

Recommended minimum:

- topic or what happened must be present

### Reuse patterns

Model after the public submit flows already present in:

- `src/app/local-life/submit/page.tsx`
- `src/app/organizations/submit/page.tsx`

## 6. Public Intake API

### New route

- `src/app/api/reporter/runs/route.ts`

### Methods

#### `POST`

Create run + initial sources.

Responsibilities:

- read authenticated user and community from middleware headers when present
- allow public or authenticated submission per chosen policy
- validate payload with `zod`
- create `ReporterRun`
- create first one or more `ReporterSource` rows
- log activity when user id exists

#### `GET`

Optional for Phase 1.

Recommendation:

- do not expose a public listing endpoint yet

## 7. Internal Admin List Page

### New route

- `src/app/admin/reporter/page.tsx`

### Suggested companion component

- `src/app/admin/reporter/ReporterTabs.tsx`

### Page behavior

Follow the same operational shape as:

- `src/app/admin/articles/page.tsx`

Recommended view:

- list-first table
- filter by status
- filter by assignee
- filter by request type
- search by topic/requester/subject

Keep it compact. Do not build a kanban board in Phase 1.

## 8. Internal Admin Detail Page

### New route

- `src/app/admin/reporter/[id]/page.tsx`

### Suggested components

- `src/app/admin/reporter/[id]/ReporterDetailClient.tsx`
- `src/app/admin/reporter/[id]/ReporterSourceList.tsx`
- `src/app/admin/reporter/[id]/ReporterBlockerList.tsx`
- `src/app/admin/reporter/[id]/ReporterDraftPanel.tsx`

### Tabs

Use a restrained tab set:

- `Details`
- `Sources`
- `Blockers`
- `Drafts`

Do not add `Interview`, `Research`, `Claims`, or `Validation` tabs yet unless the implementation proves they are immediately needed.

## 9. Internal Reporter APIs

### New routes

- `src/app/api/reporter/runs/[id]/route.ts`
- `src/app/api/reporter/runs/[id]/sources/route.ts`
- `src/app/api/reporter/sources/[id]/route.ts`
- `src/app/api/reporter/runs/[id]/blockers/route.ts`
- `src/app/api/reporter/blockers/[id]/route.ts`
- `src/app/api/reporter/runs/[id]/draft/route.ts`
- `src/app/api/reporter/runs/[id]/convert-to-article/route.ts`

### Responsibilities

#### `/runs/[id]`

- fetch one run
- patch status, assignment, notes, subject/topic normalization

#### `/runs/[id]/sources`

- create sources

#### `/sources/[id]`

- edit or delete one source

#### `/runs/[id]/blockers`

- create blockers

#### `/blockers/[id]`

- resolve/update blocker

#### `/runs/[id]/draft`

- generate bounded draft from assembled source packet
- persist `ReporterDraft`
- persist validation issues if returned

#### `/runs/[id]/convert-to-article`

- create `Article` in `DRAFT`
- copy title/body/excerpt/category when available
- set `ReporterRun.linkedArticleId`
- log activity

## 10. Draft-to-Article Integration

### Existing seams

- `src/app/api/articles/route.ts`
- `src/app/api/articles/[id]/route.ts`
- `src/app/local-life/submit/page.tsx`
- `src/app/admin/articles/page.tsx`

### Integration recommendation

Do not bypass the article system.

Instead:

- create a regular `Article` row from a selected `ReporterDraft`
- set status to `DRAFT`
- route editors into the existing article editor via `/local-life/submit?edit={id}`

This keeps Phase 1 aligned with the current moderation and publishing loop.

### Category handling

Phase 1 should allow the reporter run to carry an optional category selection, but if category is absent:

- still allow draft creation
- require category later when the article is submitted for review

That matches the existing article rules in `src/app/api/articles/route.ts`.

## 11. Admin Navigation

### Likely touched areas

- admin sidebar/navigation source files
- any admin route registry or layout where the item list is built

The exact file should be discovered during implementation, but the outcome should be:

- new top-level admin item `Reporter`

Position recommendation:

- near `Articles`
- before or after `Events`

Reason:

- this is editorial operations, not a generic settings page

## 12. Environment Variables

### Files

- `.env.example`
- relevant config readers in `src/lib` or env helper modules

### Add

- `REPORTER_MODEL_PROVIDER`
- `REPORTER_MODEL_NAME`
- `REPORTER_MODEL_TEMPERATURE`
- `REPORTER_MODEL_MAX_TOKENS`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Phase 1 should support Anthropic and OpenAI through the same adapter contract.

## 13. Tests

### New test areas

- `tests` or colocated test structure matching repo conventions

### Minimum coverage

#### Schema/service tests

- run payload normalization
- source packet assembly
- draft validator behavior

#### API tests

- create reporter run
- add source
- generate draft with mocked provider
- convert run to article
- permission denial cases

#### UI tests

Only if existing repo patterns already support them cleanly.

Priority should stay on service and route logic first.

## 14. Implementation Order

Use this exact order:

1. `prisma/schema.prisma`
2. permission constants + legacy permission map in `src/lib/permissions.ts`
3. reporter service-layer scaffolding in `src/lib/reporter/*`
4. public create-run API in `src/app/api/reporter/runs/route.ts`
5. public intake page in `src/app/report-a-story/*`
6. admin list page in `src/app/admin/reporter/page.tsx`
7. admin detail page and CRUD APIs
8. draft generation endpoint with mocked provider in tests
9. convert-to-article route
10. admin navigation entry
11. `.env.example`
12. tests and polish

## 15. Open Decisions To Make Before Coding

These should be answered before implementation starts:

1. Can anonymous users submit article requests, or is sign-in required?
2. Should `ReporterRun` support file uploads in Phase 1, or only links + text notes?
3. Should the first draft endpoint create article-style prose only, or also allow summary-only outputs?
4. Should `Reporter` access be granted to `TRUSTED CONTRIBUTOR`, or only `STAFF_WRITER` and above for internal management?
5. Should Phase 1 include assignee filtering by current user on `/admin/reporter`?

Recommended defaults:

1. allow authenticated and anonymous submission, but require contact info when anonymous
2. links + text notes first; defer upload attachment plumbing if it adds too much drag
3. support both `ARTICLE_DRAFT` and `SOURCE_PACKET_SUMMARY`
4. allow `TRUSTED CONTRIBUTOR` view/edit access, but keep draft generation at `STAFF_WRITER+`
5. yes, include assigned-to-me filtering if easy

## 16. Done When

This implementation checklist is satisfied when:

1. `ReporterRun` and related schema exist in Prisma.
2. Public intake can create a run inside the current app.
3. Internal staff can manage runs through compact admin pages.
4. Source packets can be assembled manually.
5. Bounded AI drafting works from that packet through a provider adapter.
6. Drafts can be converted into standard `Article` drafts.
7. The entire feature lives inside Highlander Today’s existing stack and permissions model.

## Recommendation

Do not skip directly to interview intelligence or autonomous research.

Phase 1 should be implemented as:

- intake foundation
- editorial object model
- source packet management
- bounded internal drafting
- article handoff

That will give later Interview Agent and Research Agent work a stable, product-native base rather than forcing those later phases to retrofit themselves onto ad hoc article-generation code.
