# Reporter Daily Coverage Roadmap

## Purpose

Define the next roadmap beyond the current reporter foundation and the completed Reporter Agent maturity hardening layer.

This document exists to answer a specific product question:

How does Highlander Today move from a bounded internal reporter workflow toward a system that can consistently discover, evaluate, and produce at least one local article per day for a defined geographic area?

Use this document after reading:

- `PROJECT-STATUS.md` for current implementation state and active cautions
- `REPORTER-AGENT-IMPLEMENTATION-PLAN.md` for the canonical reporter system direction
- `REPORTER-AGENT-MATURITY-REQUIREMENTS.md` for the durability, tracing, validation, and claims hardening layer
- `REPORTER-INTERVIEW-AGENT-PLAN.md` for the browser interview flow

This roadmap is intentionally directional. It should guide the next epics without pretending that the system is already ready for unattended local reporting.

## Core Goal

The target end state is:

- defined geographic coverage areas
- recurring source monitoring across local public-interest information channels
- daily identification of credible local story candidates
- generation of at least one source-grounded article per day
- explicit human-review or autonomy gates depending on operating mode

The emphasis is not generic content volume.

The emphasis is reliable local civic reporting from accountable source material.

## Current Position

After the current reporter foundation and completed maturity layer, Highlander Today should have:

- reporter runs, sources, blockers, drafts, validation issues, and interview workflows
- bounded draft generation and deterministic fallbacks
- durable internal task execution where needed
- prompt versioning
- structured output validation
- claim-level internal review
- traceability for model-assisted actions
- internal triage visibility

That is enough to support the next stage of development.

It is not yet enough to support autonomous daily local story discovery or guaranteed daily article production.

## What Is Still Missing

The system still needs:

- recurring source ingestion from government, school, and local media channels
- normalized source monitoring across multiple municipalities and institutions
- de-duplication and clustering of overlapping story signals
- ranking logic for novelty, civic importance, urgency, and source quality
- structured external-source claim extraction and corroboration workflows
- daily production orchestration with quotas, retries, freshness windows, and escalation rules
- a clear operating mode distinction between editor-reviewed daily production and more autonomous production

## Operating Modes

This roadmap should preserve two possible end states.

### Mode 1: Editor-Approved Daily Coverage

The system discovers, ranks, researches, and drafts daily local stories, but a human editor still approves publication.

This should be treated as the default intended target.

### Mode 2: Constrained Autonomous Daily Coverage

The system discovers, ranks, researches, drafts, validates, and publishes within explicit low-risk boundaries.

This should not be treated as the default near-term target.

It should be considered only after editor-reviewed daily coverage is stable and trustworthy.

## Epic 1: Local Source Ingestion And Monitoring

### Objective

Build the recurring intake layer that watches the local information environment for a defined coverage area.

This is the prerequisite for daily story discovery.

### Scope

The first implementation should focus on bounded, high-signal sources such as:

- municipal government agendas, minutes, notices, and meeting pages
- county government and authority updates
- school district board agendas, minutes, calendars, and announcements
- public safety or emergency notices when publicly available
- local newsroom RSS feeds, article indexes, and public update pages
- organization press release pages for major local institutions
- community event and public-notice sources where they generate newsworthy leads

### Required Capabilities

- source registry by community or coverage area
- source-type classification and fetch policy rules
- recurring scheduled fetch jobs
- fetch history and last-seen tracking
- normalized ingestion records for fetched items
- basic extraction of headline, timestamp, source URL, publisher, excerpt, and retrieval time
- source-health tracking for broken, stale, or changed feeds

### Important Boundaries

- Do not begin with unrestricted web search.
- Prefer configured watchlists and known recurring public sources first.
- Preserve tenant-aware and community-aware boundaries.
- Treat ingestion as discovery input, not as publication approval.

### Acceptance Direction

At the end of this epic, the system should be able to say:

- which sources it monitors for a given area
- what changed recently
- which items are new enough to consider for reporting
- which monitored sources are stale or failing

## Epic 2: Story Detection, Ranking, And Research Packet Assembly

### Objective

Turn raw ingestion into ranked local story candidates and structured reporting packets.

This is the step that converts “many incoming items” into “a few serious stories worth pursuing.”

### Scope

The system should:

- normalize fetched items into candidate story signals
- cluster duplicates and near-duplicates
- score candidates by locality, novelty, urgency, public-interest weight, and source quality
- identify probable follow-up questions and reporting gaps
- produce an initial source packet and claim set for the top candidates

### Required Capabilities

- story-candidate model and ranking records
- duplicate and overlap detection across sources
- relevance scoring tied to geography and configured beats
- novelty scoring against recent Highlander coverage
- source-quality weighting
- structured claim extraction from fetched materials
- corroboration state tracking
- initial reporter-run creation from selected candidates

### Important Boundaries

- Do not collapse weak local media repetition into “verified fact.”
- Do not let a model-generated claim count as verified without source support.
- Preserve explicit distinction between official statement, attributed claim, repeated report, and corroborated fact.
- Escalate low-confidence or thinly sourced candidates instead of forcing them into daily output.

### Acceptance Direction

At the end of this epic, the system should be able to say:

- what the top story candidates are for a given day
- why they ranked where they did
- what source material supports them
- what is still missing before drafting

## Epic 3: Daily Production Orchestrator

### Objective

Coordinate the daily newsroom loop that turns top-ranked local candidates into at least one finished article per day when sufficient source quality exists.

This is the first epic that directly targets the “one article a day” requirement.

### Scope

The orchestrator should:

- select the best candidate or escalate when none meets threshold
- create or update the corresponding reporter run
- invoke research, draft, validation, and triage steps in the right order
- track daily output goals by coverage area
- retry safe recoverable failures
- stop cleanly when quality gates are not met

### Required Capabilities

- daily coverage goal model by community or area
- per-day candidate selection logic
- freshness rules so yesterday’s stale signal does not crowd out today’s stronger signal
- quota and fallback logic when the top candidate is blocked
- explicit “no publishable story found” outcome with internal explanation
- draft generation from supported claims and source packets
- validation and editorial issue handling
- editor-review mode as the default operating mode

### Publication Modes

The first production rollout should default to editor-reviewed output:

- the system must be able to prepare at least one article candidate per day
- a human editor approves or rejects the final output

Only after that mode is stable should the product evaluate constrained autonomous publication for narrow low-risk categories.

### Important Boundaries

- Do not require a publishable article every day if source quality is inadequate.
- Prefer “no qualified story today” over hallucinated or weak reporting.
- Treat the daily target as an operational goal, not a justification to lower sourcing standards.
- Preserve clear audit trails for why the system selected, drafted, or declined a story.

### Acceptance Direction

At the end of this epic, the system should be able to say:

- what story it chose for the day
- why that story was selected
- what article artifact it produced
- whether it is awaiting editor approval, blocked, or complete
- why no story was produced if thresholds were not met

## Cross-Epic Requirements

These requirements apply across all three epics:

- preserve tenant-aware and geography-aware behavior
- prefer configured source watchlists over open-ended browsing
- keep source quality and corroboration explicit
- keep claims reviewable and traceable
- preserve human editorial gates by default
- do not silently expand authority into publication or external contact
- keep all recurring automation observable from internal admin tooling

## Recommended Delivery Order

1. Implement `REPORTER-AGENT-MATURITY-REQUIREMENTS.md`.
2. Build local source ingestion and monitoring.
3. Build story detection, ranking, and initial research packet assembly.
4. Build the daily production orchestrator in editor-reviewed mode.
5. Evaluate whether constrained autonomous publication is justified later.

## Success Definition

Highlander Today is meaningfully near the desired goal when it can do the following for a defined area:

- monitor a known set of local public-interest sources every day
- detect credible story candidates from that intake
- rank the strongest candidates transparently
- assemble source-backed reporter runs with claims and gaps
- produce at least one editor-reviewable article candidate per day on most days

Highlander Today reaches the full target only when the team decides whether the final step remains:

- editor approval required

or becomes:

- constrained autonomous publication under explicit rules

## Implementation Notes

This document should be read in the context recorded in `PROJECT-STATUS.md`.

If the reporter baseline or product ambition changes materially, update `PROJECT-STATUS.md` first, then revise this roadmap as needed.
