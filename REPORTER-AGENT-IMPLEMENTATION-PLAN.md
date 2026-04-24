# Reporter Agent Implementation Plan

## Purpose

Define the correct Highlander Today implementation shape for AI-assisted reporting.

This plan replaces the idea of a separate standalone reporter microservice with a Highlander-native internal reporting subsystem that fits the existing product, stack, trust model, editorial posture, and moderation boundaries.

The goal is not generic AI content generation. The goal is a constrained reporting system that can help collect information, research public facts, and draft accountable local articles while keeping humans in control.

For the dedicated browser-based interview workflow, queue model, multilingual behavior, and deterministic interview setup described after the initial reporter foundation, use `REPORTER-INTERVIEW-AGENT-PLAN.md` as the canonical follow-on plan.

## Product Fit

This fits Highlander Today only if it is treated as:

- an editorial and reporting aid
- staff/trusted-contributor constrained
- source-grounded
- reviewable and blockable
- non-autonomous in publication

It should strengthen the product's local-information-infrastructure role rather than turn the platform into a generic AI writing surface.

It should align with:

- `ARTICLE-SOURCING-PLAN.md`
- the existing article moderation and trust model
- tenant/community boundaries
- the platform's preference for explicit workflow and accountability over opaque automation

## Core Decision

Do not implement this as a separate Python/Django service by default.

Implement it inside the existing Highlander Today application stack as an internal subsystem:

- Next.js + TypeScript
- existing auth/role/trust boundaries
- existing PostgreSQL + Prisma data layer
- existing admin/editorial surfaces

If a separate service is ever introduced later, that should be a scaling decision, not the v1 architectural default.

## System Shape

The reporting system should be treated as a controlled multi-agent subsystem with one orchestrator and three specialized agent roles.

### 1. Interview Agent

Purpose:

- conduct guided interviews
- ask progressive follow-up questions
- surface missing names, dates, locations, chronology, and evidence gaps
- separate direct observation from claim, opinion, and quote

Responsibilities:

- determine who the subject is and why they matter
- gather factual chronology
- ask one clean question at a time where practical
- probe ambiguity, unsupported assertions, and missing context
- capture quotable language without inventing or polishing away meaning
- produce a structured interview transcript plus extracted interview facts

Boundaries:

- may ask follow-up questions
- may not present guesses as facts
- may not draft a final article by itself
- may not imply external verification that has not happened

### 2. Research Agent

Purpose:

- gather and structure external reporting material
- prioritize primary and high-quality sources
- verify or contextualize claims coming from interviews or tips

Responsibilities:

- define the reporting target
- map verification questions
- gather official records, primary statements, reliable reporting, and contextual material
- rate source quality
- distinguish verified fact, attributed claim, disputed claim, analytical inference, and opinion
- record source URL, publisher, author when available, publication date when available, retrieval time, and relevant excerpt

Boundaries:

- must prefer primary sources whenever practical
- must not flatten conflict into certainty
- must not use weak or partisan sourcing as sole factual support for contentious claims
- must not draft a final article by itself

### 3. Reporter Agent

Purpose:

- combine interview and research material
- choose the article angle
- determine whether there is enough information to draft
- produce a source-grounded draft
- validate the draft and surface gaps or blockers

Responsibilities:

- choose operating mode: `INTERVIEW`, `RESEARCH`, or `HYBRID`
- maintain the active story state
- decide the next reporting action
- stop for clarification when information is materially insufficient
- build a fact table and source packet
- generate article drafts only when drafting is allowed
- validate output against reporting rules
- return `COMPLETE`, `COMPLETE_WITH_WARNINGS`, `BLOCKED`, or `ERROR`

Boundaries:

- must not publish directly
- must not invent facts, quotes, events, sources, or statistics
- must not conceal uncertainty
- must not overrule source-quality logic for convenience

## Agent Coordination Model

Use one orchestrating reporting workflow with specialized tools or internal submodes. The product may describe this as "three agents," but implementation should stay operationally simple.

Recommended coordination:

- one top-level `ReporterRun`
- one orchestrator decides the next step
- interview, research, and drafting/validation capabilities are explicit modules
- avoid open-ended agent swarms
- avoid invisible prompt spaghetti

This means:

- the system is agentic
- the system is not a loose autonomous general agent

## Supported Modes

### INTERVIEW

Use when the main input is a person, witness, subject, official, expert, participant, or affected resident.

Goal:

- collect structured testimony and quotable material
- identify what still needs verification or context

### RESEARCH

Use when the main input is a topic, claim, event, institution, issue, policy, or trend.

Goal:

- gather and synthesize external material into a factual reporting packet

### HYBRID

Use when both interview material and external verification/context are needed.

Goal:

- combine first-person material with external evidence and context

This should be the expected mode for many serious local stories.

## User Roles And Access

Do not expose the full reporting system equally to all users.

Recommended role split:

- ordinary users:
  - submit article requests
  - submit story tips
  - answer interview questions when invited into an intake flow
- trusted contributors and staff writers:
  - use guided interview and source-packet tools
  - request draft generation from validated material
- editors and admins:
  - use full hybrid reporting workflow
  - review blockers, drafts, sourcing, and validation issues

The public product should not expose "write me an article" as a generic open AI tool.

## Human Review Rule

Every generated article must remain a draft until a human approves it.

Hard rule:

- agent output may populate article drafts or preview states
- agent output may not directly publish to the public site

This is non-negotiable for Highlander Today.

## Editorial Positioning

Do not encode a blunt ideological identity such as "center-left" into the product contract.

Use this editorial standard instead:

- public-interest oriented
- accountability-oriented
- fair
- evidence-led
- local and civic in emphasis
- willing to scrutinize concentrated power, corruption, exploitation, disinformation, and anti-democratic conduct
- never willing to distort facts or suppress major contrary evidence

This preserves the spirit of civic-minded reporting without turning the product into a declared ideological publication system.

## Reporting Rules

The following rules should be enforced in code and validation logic, not only in prompts.

- never fabricate quotations
- never invent sources
- never invent statistics
- never imply reporting that did not occur
- never collapse allegation into fact
- never collapse opinion into reported truth
- never present uncertainty as settled
- never use weak sourcing as sole support for a contentious claim
- always distinguish verified fact from attributed claim
- always distinguish interview testimony from external verification
- always distinguish evidence from analysis

## Fact Classification Model

Every material statement should be tracked internally as one of:

- `VERIFIED_FACT`
- `ATTRIBUTED_CLAIM`
- `DISPUTED_CLAIM`
- `ANALYTICAL_INFERENCE`
- `OPINION`

The final article does not need to expose these labels directly, but the internal workflow should.

## Source Quality Model

Preferred source order:

1. direct interview material
2. official records and filings
3. named primary statements
4. established news organizations with editorial standards
5. credible expert analysis
6. advocacy organizations
7. partisan outlets
8. aggregators and reposts
9. anonymous or unverifiable social posts

Operational rules:

- primary sources first
- stronger corroboration for reputational or politically sensitive claims
- at least two independent reliable sources for contentious factual claims when practical
- explicitly note unresolved conflicts between sources

## Highlander-Native Inputs

Do not limit the system to raw text arrays.

The reporting subsystem should accept structured source packets that can include:

- topic
- article type
- target audience
- tenant/community
- location or place references
- interview transcript segments
- uploaded documents
- pasted notes
- existing article drafts
- related event, organization, place, or profile records
- external source metadata and excerpts
- context instructions
- debug flag

## Highlander-Native Outputs

The system should be able to return:

- draft article
- proposed headline and optional dek
- reporting gaps
- fact table
- source packet summary
- validation issues
- blockers
- suggested follow-up interview questions
- suggested follow-up verification tasks

The draft should map cleanly into Highlander's existing article workflow rather than becoming a standalone foreign object.

## Suggested Data Model Direction

The exact schema can be refined later, but v1 likely needs first-class reporting records rather than burying everything inside `Article`.

Recommended entities:

- `ReporterRun`
- `ReporterSource`
- `ReporterFact`
- `ReporterClaim`
- `ReporterInterview`
- `ReporterInterviewTurn`
- `ReporterValidationIssue`
- `ReporterBlocker`
- `ReporterDraft`

Relationship direction:

- one run can involve many sources
- one run can involve zero or more interview sessions
- one run can generate zero or more draft attempts
- one run can attach to a draft article, but should not require article creation up front

If v1 must stay lighter:

- persist run state and source packet first
- keep deeper fact/claim normalization incremental

## Tooling Model

The agent should act through explicit tools/modules, not through a single opaque chat loop.

Recommended tool set:

- `detect_mode`
- `plan_interview_questions`
- `record_interview_answer`
- `extract_interview_facts`
- `search_external_sources`
- `fetch_external_source`
- `extract_source_claims`
- `rate_source_quality`
- `build_fact_table`
- `classify_claims`
- `assess_draft_sufficiency`
- `generate_article_draft`
- `validate_article_draft`
- `generate_revision`

This preserves agent behavior while keeping the system inspectable.

## Workflow

Recommended high-level workflow:

1. determine mode
2. ingest available material
3. ask only the minimum necessary questions to continue
4. gather interview or research material
5. classify facts and claims
6. assess whether drafting is allowed
7. if insufficient, return blockers plus the next needed reporting actions
8. if sufficient, draft article
9. validate article
10. revise in a bounded way if validation fails but is fixable
11. return draft plus traceability and gaps
12. require human review before publication

## Validation Requirements

Validation must be explicit and separate from drafting.

At minimum, validate:

- subject clearly identified when required
- no fabricated or unsupported facts
- no fabricated or unsupported quotes
- no advisory drift
- no chatbot-like filler
- no unresolved pronoun references
- structure appropriate for article type
- fair treatment of serious opposing views
- uncertainty disclosed where needed
- attribution used where verification is incomplete

## Web Research Rules

If the system browses or searches the web, it must retain enough metadata for later review.

For each external source, capture when possible:

- URL
- publisher
- author
- published date
- retrieved date/time
- excerpt used
- source type
- reliability tier

This is required for accountability and later editorial review.

## Model Provider Strategy

Do not hardwire the system to one model vendor.

The reporting subsystem should use a provider abstraction that can support at least:

- `anthropic`
- `openai`

The workflow, validation, and data model must remain provider-agnostic.

Provider-specific behavior should stay behind adapters.

## Vector Search Position

Do not make vector search a dependency for v1.

V1 should work with:

- direct interview transcripts
- manually supplied source packets
- ordinary structured metadata
- conventional database queries
- conventional full-text search

Vector retrieval becomes worth considering only when Highlander accumulates a large unstructured reporting corpus such as:

- interview archives
- meeting transcripts
- PDF records
- historical archives
- prior article corpora used for semantic retrieval

If that point arrives, prefer hybrid retrieval and consider `pgvector` before introducing a separate vector database.

## UI Direction

The first UI should be internal and operational, not consumer-marketing flavored.

Recommended surfaces:

- article-request intake
- guided interview panel
- research/source packet panel
- fact table review
- draft + validation panel
- blocker and reporting-gap display

These should follow the product's existing compact admin/editorial design language.

## Phased Rollout

### Phase 1: Article Request And Source Packet Foundations

Build:

- article request intake
- source packet structure
- basic reporter run state
- manual source entry
- no autonomous research yet

### Phase 2: Interview Agent

Build:

- guided question flow
- transcript capture
- extracted quote/fact separation
- interview gap detection

Use `REPORTER-INTERVIEW-AGENT-PLAN.md` as the canonical implementation direction for this phase, including interview-request setup, login-gated browser sessions, deterministic branching, and language-preference confirmation.

### Phase 3: Research Agent

Build:

- source search/fetch tooling
- source quality scoring
- external verification packet

### Phase 4: Reporter Agent Drafting

Build:

- fact table
- article drafting
- validation
- bounded revision
- draft handoff into article workflow

### Phase 5: Deeper Retrieval

Only after corpus depth justifies it:

- semantic retrieval over reporting archives
- transcript/document chunk search
- related-coverage suggestion

## What Not To Build First

Do not start with:

- autonomous publishing
- public unrestricted article generation
- ideological prompt theatrics
- multi-agent swarms
- background job complexity unless usage justifies it
- vector DB as a default dependency
- a second standalone app stack unless scale demands it

## Recommendation

Proceed with a Highlander-native reporting subsystem built around three agent roles:

- Interview Agent
- Research Agent
- Reporter Agent

Use one orchestrated reporting run, explicit tools/modules, strong validation, source traceability, and mandatory human review.

This preserves the agent requirement while keeping the product aligned with Highlander Today's existing architecture and trust model.
