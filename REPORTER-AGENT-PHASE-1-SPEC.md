# Reporter Agent Phase 1 Spec

## Purpose

Define the first buildable slice of the Highlander Today reporting system described in `REPORTER-AGENT-IMPLEMENTATION-PLAN.md`.

For the later browser-based Interview Agent itself, use `REPORTER-INTERVIEW-AGENT-PLAN.md` as the canonical follow-on plan once this foundation is in place.

Phase 1 is intentionally narrow. It should establish the reporting-run foundation, article-request intake, source-packet structure, and an internal operational review surface without yet building autonomous interview loops or autonomous external web research.

The purpose of this phase is to create the substrate that later agent behavior can operate on safely.

## Phase 1 Outcome

At the end of Phase 1, Highlander Today should support:

- article requests and story tips entering the system as first-class reporting runs
- internal review of those runs by trusted contributors, staff writers, editors, and admins
- structured source-packet assembly
- explicit run state and blocker tracking
- optional AI-assisted summary/draft help only from manually supplied material
- draft handoff into the existing article workflow

Phase 1 should not attempt to deliver the full three-agent system yet.

## Non-Goals

Do not build these in Phase 1:

- adaptive interview follow-up loops
- autonomous web browsing or open web research
- vector search
- autonomous publication
- public unrestricted article generation
- a separate microservice or second app stack
- multi-agent swarms or background-job orchestration

## Product Position

Phase 1 is an internal editorial and intake feature set.

Externally, users should be able to:

- request coverage
- submit a story tip
- attach basic notes or source material

Internally, trusted contributors and staff should be able to:

- review the request
- normalize the angle
- assemble a source packet
- mark reporting gaps
- optionally generate a bounded draft or summary from the supplied packet

## Core Product Objects

Phase 1 should introduce the following conceptual objects.

### ReporterRun

Represents one reporting effort or requested story.

Minimum responsibilities:

- track the reporting target
- track workflow state
- track requester and community context
- track blockers and gaps
- link to source records
- link to generated draft attempts
- optionally link to a resulting `Article`

### ReporterSource

Represents one piece of source material attached to a run.

Examples:

- user-submitted note
- pasted transcript excerpt
- uploaded PDF or image-backed document metadata
- official URL manually entered by staff
- quote/note from a phone call or in-person intake entered by staff
- link to an existing Highlander entity such as `Event`, `Organization`, `Place`, or `Article`

### ReporterDraft

Represents an AI-assisted or manually prepared draft artifact attached to a run before article publication.

This allows drafting to be auditable without overloading `Article` itself too early.

### ReporterBlocker

Represents a reason the run cannot move forward yet.

Examples:

- subject unclear
- timeframe unclear
- insufficient sourcing
- lacks corroboration
- awaiting response from organization

### ReporterValidationIssue

Represents a draft-quality or reporting-integrity issue discovered by validation.

Phase 1 only needs a basic first-pass version of this object.

## Recommended Prisma Direction

The exact field list can be adjusted during implementation, but Phase 1 should start with explicit schema instead of hiding all state inside JSON blobs.

### ReporterRun

Suggested fields:

- `id`
- `communityId`
- `createdByUserId`
- `assignedToUserId` nullable
- `status`
- `mode`
- `requestType`
- `title` nullable
- `topic`
- `subjectName` nullable
- `requestedArticleType` nullable
- `requesterName` nullable
- `requesterEmail` nullable
- `requesterPhone` nullable
- `requesterUserId` nullable
- `requestSummary` nullable
- `editorNotes` nullable
- `publicDescription` nullable
- `debugNotes` nullable
- `linkedArticleId` nullable
- `createdAt`
- `updatedAt`

### ReporterSource

Suggested fields:

- `id`
- `reporterRunId`
- `sourceType`
- `title` nullable
- `url` nullable
- `publisher` nullable
- `author` nullable
- `publishedAt` nullable
- `retrievedAt` nullable
- `contentText` nullable
- `excerpt` nullable
- `note` nullable
- `reliabilityTier` nullable
- `linkedArticleId` nullable
- `linkedEventId` nullable
- `linkedOrganizationId` nullable
- `linkedPlaceId` nullable
- `sortOrder`
- `createdByUserId` nullable
- `createdAt`
- `updatedAt`

### ReporterBlocker

Suggested fields:

- `id`
- `reporterRunId`
- `code`
- `message`
- `isResolved`
- `resolvedAt` nullable
- `resolvedByUserId` nullable
- `createdAt`

### ReporterValidationIssue

Suggested fields:

- `id`
- `reporterRunId`
- `reporterDraftId` nullable
- `code`
- `severity`
- `message`
- `evidenceSpan` nullable
- `isResolved`
- `createdAt`

### ReporterDraft

Suggested fields:

- `id`
- `reporterRunId`
- `headline` nullable
- `dek` nullable
- `body`
- `draftType`
- `status`
- `modelProvider` nullable
- `modelName` nullable
- `generationNotes` nullable
- `createdByUserId` nullable
- `createdAt`
- `updatedAt`

## Recommended Enums

Phase 1 should define stable enums now so later phases do not thrash state naming.

### ReporterRunStatus

- `NEW`
- `NEEDS_REVIEW`
- `SOURCE_PACKET_IN_PROGRESS`
- `READY_FOR_DRAFT`
- `BLOCKED`
- `DRAFT_CREATED`
- `CONVERTED_TO_ARTICLE`
- `ARCHIVED`

### ReporterMode

- `REQUEST`
- `INTERVIEW`
- `RESEARCH`
- `HYBRID`

Phase 1 will mostly use `REQUEST`, with internal preparation for later modes.

### ReporterRequestType

- `ARTICLE_REQUEST`
- `STORY_TIP`
- `EDITOR_ASSIGNMENT`

### ReporterSourceType

- `USER_NOTE`
- `STAFF_NOTE`
- `INTERVIEW_NOTE`
- `TRANSCRIPT_EXCERPT`
- `DOCUMENT`
- `OFFICIAL_URL`
- `NEWS_ARTICLE`
- `HIGHLANDER_ARTICLE`
- `EVENT_RECORD`
- `ORGANIZATION_RECORD`
- `PLACE_RECORD`

### ReporterReliabilityTier

- `PRIMARY`
- `HIGH`
- `MEDIUM`
- `LOW`
- `UNVERIFIED`

### ReporterValidationSeverity

- `CRITICAL`
- `WARNING`

## Permissions

Phase 1 should respect existing Highlander Today permission and trust patterns.

Recommended access:

- anonymous users:
  - can submit article requests/tips only if the product already allows anonymous intake
  - otherwise require authentication
- authenticated registered users:
  - can submit requests and tips
  - can view only their own submissions if a user-facing history is built
- trusted contributors, staff writers, editors, admins:
  - can open internal reporter runs
  - can add/edit sources
  - can change run status
  - can create drafts
- editors and admins:
  - can assign runs
  - can resolve blockers
  - can convert a reporter draft into an `Article`

If Phase 1 needs to stay simpler, restrict the internal management surface to:

- `articles:approve`
- or a new reporting-specific permission family

Do not make the entire subsystem public by default.

## Initial Routes

Phase 1 should add a small set of routes rather than a sprawling new section.

### Public / user-facing

#### `GET /report-a-story`

Purpose:

- render the article-request/tip intake page

#### `POST /api/reporter/runs`

Purpose:

- create a new `ReporterRun`

Behavior:

- accept public or authenticated requests depending on the chosen trust policy
- normalize and validate intake fields
- create initial run with `NEW` or `NEEDS_REVIEW`
- create initial `ReporterSource` records from submitted notes/links

### Internal operational

#### `GET /admin/reporter`

Purpose:

- compact list-first management surface for reporting runs

Structure:

- `List`
- `+ Assignment` optional later

This should follow the existing compact `admin-list` pattern.

#### `GET /admin/reporter/[id]`

Purpose:

- internal detail/management view for one reporting run

Suggested tabs:

- `Details`
- `Sources`
- `Blockers`
- `Drafts`

Avoid overbuilding with too many tabs in Phase 1.

#### `PATCH /api/reporter/runs/[id]`

Purpose:

- update status, assignment, notes, topic normalization, and internal fields

#### `POST /api/reporter/runs/[id]/sources`

Purpose:

- add a source record to the packet

#### `PATCH /api/reporter/sources/[id]`

Purpose:

- edit source metadata, note, reliability tier, and excerpt

#### `POST /api/reporter/runs/[id]/draft`

Purpose:

- generate a bounded AI-assisted summary or draft from the manually assembled source packet

Hard rule:

- only available to trusted internal roles
- only uses attached source packet, not autonomous web browsing

#### `POST /api/reporter/runs/[id]/convert-to-article`

Purpose:

- create an `Article` draft from the selected `ReporterDraft`

Behavior:

- create a normal `Article` in `DRAFT`
- do not publish automatically
- retain backlink to `ReporterRun`

## Phase 1 Public Intake Fields

The public intake should stay simple and high-signal.

Recommended fields:

- `topic`
- `whatHappened`
- `whoIsInvolved` optional
- `whereDidItHappen` optional
- `whenDidItHappen` optional
- `whyItMatters` optional
- `supportingLinks` optional list
- `notes` optional
- `name` optional depending on anonymity policy
- `email` optional depending on follow-up needs
- `phone` optional

Do not ask the public user to classify article type, sourcing tiers, or agent modes.

## Phase 1 Internal Source Packet Rules

Internal staff should be able to add and organize:

- plain notes
- quoted text snippets
- URLs
- linked Highlander entities
- document references

For each source, the UI should support:

- title/label
- source type
- short excerpt
- note
- reliability tier
- ordering

This is enough to support later drafting and verification without overbuilding a citation system immediately.

## Drafting Rules For Phase 1

Phase 1 drafting should be deliberately constrained.

Allowed:

- AI-assisted source-packet summary
- AI-assisted draft article from manually provided packet
- optional alternate headlines
- reporting-gaps summary

Not allowed:

- autonomous follow-up interviews
- autonomous source discovery
- publication without human review

The draft generator should enforce:

- source-grounded output only
- no fabricated quotes
- explicit uncertainty
- clear attribution for unverified claims

## Model Provider Contract

Phase 1 should already use a provider abstraction.

Support at least:

- `anthropic`
- `openai`

The contract should expose operations such as:

- `summarizeSourcePacket`
- `generateDraftFromSourcePacket`
- `generateReportingGaps`

Do not bind the application logic to a single vendor.

## Validation Rules

Phase 1 validation can be narrower than later phases, but it should still be explicit.

At minimum, validate:

- headline present when draft type requires it
- no obviously unsupported quote formatting
- no advisory/coaching drift
- no chatbot-style filler
- uncertainty surfaced where the source packet is weak
- attribution used when the packet only supports a claim rather than a verified fact

Phase 1 can store validation findings as `ReporterValidationIssue` rows or compute them first in service code and persist later.

## UI Design Direction

Use existing Highlander operational UI language.

Requirements:

- compact
- list-first
- desktop-first for admin
- no generic AI-chat aesthetic

Recommended patterns:

- use `InternalPageHeader`
- use dense `admin-list` rows for run lists
- use inline expansion or focused management panels over card sprawl

This should feel like editorial operations, not a consumer chatbot product.

## Service Layer Direction

Phase 1 should introduce service modules under the existing TypeScript codebase, likely in `src/lib/reporter/*`.

Suggested modules:

- `run-normalizer.ts`
- `run-permissions.ts`
- `run-status.ts`
- `source-packet.ts`
- `draft-generator.ts`
- `draft-validator.ts`
- `provider-adapter.ts`

Keep business rules in code, not only in prompts.

## Activity Logging

Reporter actions should integrate with existing activity logging patterns where practical.

Useful actions to log:

- reporter run created
- source added
- blocker added/resolved
- draft generated
- run converted to article

This will matter for editorial accountability later.

## Testing Scope

Phase 1 should include:

- intake validation tests
- permissions tests
- source packet CRUD tests
- draft-generation service tests with mocked provider
- convert-to-article tests
- admin route/API tests

Use mocked provider adapters for determinism.

## Suggested Build Order

1. Prisma schema for `ReporterRun`, `ReporterSource`, `ReporterBlocker`, `ReporterDraft`, `ReporterValidationIssue`
2. Basic enum and service scaffolding
3. Public intake page and create-run API
4. Internal `/admin/reporter` list page
5. Internal reporter-run detail page with `Details` and `Sources`
6. Add blocker management
7. Add bounded draft-generation endpoint using manually supplied source packet
8. Add convert-to-article flow into existing `Article` draft workflow
9. Add tests and activity logging

## Done When

Phase 1 is complete when:

1. Users can submit article requests or story tips into first-class reporter runs.
2. Internal staff can review and manage those runs inside Highlander Today.
3. Staff can assemble a structured source packet.
4. Staff can mark blockers and reporting gaps.
5. Staff can generate a bounded AI-assisted draft from the attached packet.
6. The generated draft remains internal and cannot publish directly.
7. Staff can convert the run output into a normal `Article` draft.
8. The implementation lives inside the existing Highlander stack.

## Recommendation

Build Phase 1 as the reporting foundation, not as the full reporter intelligence layer.

This gives Highlander Today:

- a real intake loop
- a real editorial object model
- a safe AI-assisted drafting substrate

Then later phases can add:

- Interview Agent follow-up logic
- Research Agent web/source gathering
- fuller Reporter Agent planning and hybrid reporting behavior

For the Interview Agent specifically, the next planning reference is `REPORTER-INTERVIEW-AGENT-PLAN.md`.

without forcing a rewrite of the base system.
