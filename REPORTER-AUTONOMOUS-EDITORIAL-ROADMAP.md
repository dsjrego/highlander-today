# Reporter Autonomous Editorial Roadmap

## Purpose

Define the canonical forward-looking product and architecture plan for Highlander Today's reporter system beyond the already-live bounded reporter foundation, maturity layer, and initial monitored-source coverage work.

This document exists to answer the broader product question that now governs future reporter expansion:

How does Highlander Today evolve from an editor-reviewed reporter workflow into an editorial automation system that can discover stories, build evidence, draft useful content on a schedule, and eventually support multiple subject-matter lanes without collapsing into disinformation, weak sourcing, or generic content sludge?

Use this document after reading:

- `PROJECT-STATUS.md` for current implementation state and active cautions
- `REPORTER-AGENT-IMPLEMENTATION-PLAN.md` for the original bounded reporter philosophy and core object model
- `REPORTER-AGENT-MATURITY-REQUIREMENTS.md` for durability, tracing, validation, and claim hardening
- `REPORTER-INTERVIEW-AGENT-PLAN.md` for browser-based interview workflows

This roadmap supersedes `REPORTER-DAILY-COVERAGE-ROADMAP.md` as the canonical future-direction document for reporter autonomy, coverage scheduling, and multi-lane editorial production. Keep the older roadmap as historical reference, not as the primary planning surface.

## Product Goal

The target system is not a generic chatbot that occasionally drafts articles.

The target system is an editorial production platform that can:

- discover credible story candidates
- gather and normalize source material
- extract and score claims
- apply beat-specific sourcing and writing rules
- draft content on planned cadences by subject lane
- hold or escalate work when evidence is weak
- preserve human review where the risk profile requires it

The goal is useful, factual, source-grounded coverage at a scale that exceeds what one human operator can manually produce alone.

## Editorial Position

The intended posture is:

- factual rigor over ideological signaling
- explicit separation of fact, inference, and opinion
- source transparency
- willingness to follow evidence even when it cuts against preferred narratives
- refusal to manufacture certainty where the source base is thin
- preference for helpfulness, accountability, and civic usefulness over outrage or narrative convenience

This should be treated as a product rule, not only a writing preference.

## Core Business Reality

The system is being built to fill gaps in:

- subject-matter expertise
- reporting labor
- time available for manual research and drafting
- affordable human staffing

That means future work should not optimize only for "assistant for journalists."

Future work should optimize for a durable operator-plus-agents editorial business where the operator may not personally be the subject-matter expert for every lane.

## Current Position

Highlander Today already has a meaningful reporter substrate:

- reporter runs, sources, blockers, validation issues, drafts, and claims
- bounded draft generation
- internal review surfaces
- monitored-source ingestion and scheduling foundations
- daily-coverage selection/orchestration foundations
- browser-based interview workflows
- durable task and trace visibility for reporter-agent work

That substrate is strong enough to support the next stage.

What it does not yet provide is the broader autonomous editorial system described in this document.

## System Layers

Future work should separate the platform into five layers.

### 1. Shared Evidence Pipeline

These capabilities are structurally common across beats and should be built once:

- source registry and monitoring
- fetch and retrieval logic
- deduplication and clustering
- source normalization
- claim extraction
- evidence scoring
- contradiction and gap detection
- validation and policy checks
- audit trails and traces

Do not rebuild these separately for food, economics, politics, gardening, or national coverage.

### 2. Coverage Planner

This layer decides what the system should try to produce and when.

Responsibilities:

- define coverage lanes
- assign cadences by lane
- enforce quotas and freshness windows
- prevent low-value flood behavior such as dozens of food drafts in one day
- record why a lane produced a draft, was skipped, or was blocked

This layer is what turns "the agents found many things" into "here is today's planned editorial mix."

### 3. Domain Policy Packs

Subject-matter specialization should usually live here rather than as fully separate end-to-end agent stacks.

Each domain pack should define:

- preferred source classes
- minimum evidence thresholds
- high-risk claim types
- article structures
- style and vocabulary constraints
- what counts as publishable, review-required, or blocked

Examples:

- `economics`: official data, units, dates, historical comparisons, no unsupported causal claims
- `politics`: strong corroboration for accusations, distinction between statement, filing, vote, proposal, and enacted policy
- `food`: freshness, utility, local venue grounding, lower factual risk but high repetition risk
- `gardening`: region-aware guidance, extension-service grounding, practical structure
- `personal finance`: high consumer-harm sensitivity, no sloppy advice framing

### 4. Writer And Review Agents

Writer behavior should be lane-aware and policy-bound.

Review behavior should score:

- sourcing strength
- contradiction risk
- thin corroboration
- staleness
- legal or reputational risk
- publishability tier

Do not treat changing a prompt role as sufficient specialization for high-risk beats.

### 5. Publication Control Plane

The final layer decides what happens after drafting.

Possible outcomes:

- `SKIPPED`
- `BLOCKED`
- `EDITOR_REVIEW`
- `AUTO_PUBLISH_ALLOWED`

The system must preserve explicit reasons for every outcome.

## Coverage Lanes

Future work should assume multiple content lanes, each with its own cadence and autonomy profile.

Initial lanes likely include:

- local government
- police and public safety
- local institutions and schools
- events and community happenings
- food
- gardening
- economics
- national and world summaries
- personal finance

These lanes should not all be treated equally.

Some are evidence-thin and high-risk.
Some are source-rich and structurally easy.
Some are commodity-content traps unless differentiated carefully.

## Local Coverage Is The Hard Mode

Local civic and accountability coverage remains the hardest lane because it often has:

- weak corroborative sourcing
- low publication volume from other outlets
- fragmented public records
- heavy reliance on Facebook groups, public notices, agendas, meeting packets, and informal community signals

For local work, the near-term product goal should not be "fully autonomous publication."

The near-term goal should be:

- faster evidence gathering
- earlier story detection
- better source organization
- more consistent draft preparation
- explicit blockers when corroboration is missing

The most valuable automation here is often fact-base assembly rather than full article autonomy.

## Event Detection And Draft Event Creation

The system should not assume that every discovered candidate is only an article lead.

Some inputs should be recognized as:

- event candidates
- article candidates
- both event and article candidates
- neither

Examples:

- a traveling county celebration exhibit
- a school-board public meeting
- a summer festival
- a farmers market series
- a local history presentation

For event-like discoveries, the system should attempt structured extraction of:

- event title
- summary or description
- start and end date
- time when known
- location or multiple locations
- organizer or host
- recurrence or multi-stop structure
- source URL
- extraction confidence
- missing required fields

The first operational outcome should be a draft `Event` record for human review, not automatic calendar publication.

### Event Versus Article Classification

The system should explicitly decide whether a candidate is:

- `EVENT_ONLY`
- `ARTICLE_ONLY`
- `EVENT_AND_ARTICLE`
- `NEITHER`

This matters because many useful calendar items are not independently article-worthy, while some events are important enough to justify both a calendar entry and a news or feature article.

### Event Digest Downstream Use

Approved event records should later support digest-style content such as:

- what is happening this week
- what is happening this month
- holiday and seasonal event roundups
- geography-specific event digests
- beat-specific event summaries such as arts, civic, or family activities

This makes events a parallel content system rather than only a supporting data type for articles.

## Source Landscape Discovery

This system needs a capability that is distinct from both story discovery and article research.

The separate job is:

- find recurring information channels for a geography or coverage area
- classify them by source type and lane relevance
- estimate likely usefulness and trust role
- propose them for inclusion in the monitored-source registry
- require human approval before they become active monitored sources

This should be treated as a `source landscape discovery` or `source registry discovery` function.

Examples for a geography such as Clearfield, Pennsylvania:

- local news organizations
- municipal, county, and township sites
- agendas, minutes, and public-notice pages
- police, sheriff, fire, EMS, and emergency-management pages
- school districts and boards
- business, chamber, and economic-development sources
- community Facebook groups and pages
- local history groups
- political parties, campaigns, and advocacy groups

These are not yet story candidates.

They are potential recurring inputs that feed later discovery and reporting workflows.

### Source Landscape Workflow

1. Define a geography, beat, or lane target.
2. Run source landscape discovery for that target.
3. Produce proposed source records with:
   - label and URL
   - geography and lane relevance
   - public vs authenticated/restricted access type
   - source class
   - reason this source matters
   - initial trust-role assessment
4. Human reviewer approves, rejects, or edits the proposal.
5. Approved items enter the monitored-source and source-registry system.

This should be the standard expansion path for unfamiliar geographic areas.

## Source Classes

Future architecture should treat source classes differently.

### Public Structured Sources

Examples:

- RSS, Atom, JSON feeds
- government agendas and minutes
- official releases
- public notices
- court, election, regulatory, and economic data

These are the best sources for higher-autonomy workflows.

### Business And Institutional Sources

Examples:

- chambers of commerce
- economic-development authorities
- major employer newsrooms
- trade associations
- local business journals
- tourism and destination organizations
- commercial development and permit-oriented sources

These are important recurring inputs, especially for business and economics lanes.

They often provide real operational signal, but they are not neutral by default.

Treat them as valuable, often self-interested institutional sources whose claims still require context and sometimes corroboration.

### Public Unstructured Sources

Examples:

- public article listing pages
- public organization pages
- brittle JavaScript-heavy sites

These may need browser automation or custom extraction, but are still less risky than private/authenticated social sources.

### Restricted Authenticated Sources

Examples:

- private Facebook groups the operator or organization account is legitimately allowed to access
- authenticated local dashboards
- member-only community channels used as tip sources

These should be modeled as authorized restricted sources, not generic crawler inputs.

Rules:

- access must come from a real authorized account
- private-group content should usually become a lead or source artifact, not a sole publication basis
- sensitive claims require corroboration
- the system should preserve capture provenance such as group name, screenshot, timestamp, copied text, and access note

### Partisan And Advocacy Sources

Examples:

- county or local political party organizations
- campaign committees
- caucuses
- issue-advocacy groups
- ideological organizations
- unions or trade groups acting in an advocacy role

These sources should be included in the source landscape because they are important for:

- statement tracking
- event detection
- issue-position monitoring
- campaign and political activity awareness
- early detection of claims that need verification

They should not be treated as neutral factual authorities.

Their main value is:

- showing what an interested actor is saying
- revealing that a controversy, vote, event, or campaign action exists
- surfacing claims that need corroboration

### Source Role And Trust Semantics

The system should classify not only what a source is, but what role it plays in factual reasoning.

Suggested role semantics:

- `PRIMARY_OFFICIAL`
- `PRIMARY_DATA`
- `LOCAL_NEWS`
- `BUSINESS_INSTITUTION`
- `COMMUNITY_SIGNAL`
- `PARTISAN_SOURCE`
- `ADVOCACY_SOURCE`
- `RESTRICTED_AUTHENTICATED`

This classification should affect:

- ranking weight
- corroboration requirements
- whether a claim is treated as fact, statement, or lead
- whether a source can support autonomous drafting by itself

## Statements Versus Facts

The system must explicitly distinguish among:

- verified factual statements
- attributed claims
- partisan or advocacy assertions
- opinions
- analytical inference

Example:

- "Party X says policy Y is great for the economy" is an attributable political statement.
- It is not a verified economic fact merely because a partisan source said it.

The system should attempt an explicit judgment about this distinction and carry that judgment through ranking, claim extraction, and drafting.

At minimum, policy should require:

- partisan and advocacy claims remain labeled as attributed unless independently corroborated
- economic or political impact claims require stronger evidence than rhetorical statements
- article drafts must not collapse source viewpoint into factual narration
- review and validation layers should flag cases where statements are being written as settled fact

## Browser Worker Architecture

The current Next.js application should remain the orchestration and editorial-control surface.

Browser automation should be treated as a separate worker capability.

Recommended split:

- `Main app`: Vercel-hosted Next.js app, admin UI, APIs, scheduling control, reporter data model
- `Public fetch workers`: bounded retrieval jobs for feeds and public pages
- `Browser workers`: Playwright or similar workers for JS-heavy or authenticated sources
- `Restricted-source workers`: isolated persistent-profile browser environments for authorized social/private sources

Do not make a personal laptop the primary production runtime.

The durable target is a hosted worker environment with:

- isolated browser sessions
- allowlisted domains and tasks
- persistent authorized profiles where necessary
- screenshot and trace capture
- manual takeover when a site breaks or requests verification

## Coverage Planning And Quotas

The system should not generate content merely because content can be generated.

It should follow explicit coverage plans per lane.

Each lane should have policy like:

- target cadence such as daily, every 3 days, or weekly
- max outputs per day and per week
- minimum evidence threshold
- preferred source classes
- fallback behavior when no publishable story exists

Examples:

- local government: attempt daily when credible material exists
- police/public safety: event-driven, not quota-driven
- food: capped weekly cadence
- gardening: seasonal cadence
- economics: several times per week if strong data-driven material exists
- national/world: limited summary cadence to avoid commodity-volume spam

Cadence creates opportunity, not obligation.

Usefulness is more important than output count.

The system must not lower standards merely to satisfy a schedule.

Low-value filler, weakly sourced repetition, and "something to publish" content should be treated as product failures, not acceptable schedule compliance.

The system must be allowed to say:

- no credible candidate today
- quota already met
- evidence too weak
- topic too risky for autonomous handling
- candidate exists but lacks enough public-interest value to justify coverage
- candidate is mostly filler or routine noise

This should be treated as a successful outcome when the underlying evidence does not justify publication.

## Candidate Quality Grading

The system should not hide weak or incomplete candidates simply because they are not ready for drafting.

It should surface candidates with structured editorial judgment so a human operator can decide whether to pursue them further.

The goal is not binary "good/bad" labeling.

The goal is a useful candidate desk that helps a human see:

- which leads are strongest
- which leads are under-sourced but potentially important
- which items are mostly filler
- which items are statement-driven rather than fact-driven
- which items may become workable if a human adds outside sourcing
- which items should become draft events even if they are not article-worthy

Illustrative candidate-quality outcomes:

- `STRONG_CANDIDATE`
- `PROMISING_NEEDS_FOLLOW_UP`
- `HIGH_INTEREST_LOW_CONFIDENCE`
- `STATEMENT_DRIVEN`
- `REDUNDANT`
- `LOW_VALUE_FILLER`
- `NOT_NEWSWORTHY`

These labels should influence ranking, dashboard visibility, and follow-up suggestions, but they should not silently discard potentially important leads.

## Human Feedback And Learning Loop

The system should gradually improve from human editorial interaction, but the learning target must be chosen carefully.

The safest near-term learning target is:

- editorial prioritization
- lane relevance
- likely public-interest value
- whether a candidate deserves follow-up
- what kinds of items tend to become publishable after more reporting

The system should not be framed as learning "truth" from human behavior.

Truth and sourcing standards should remain policy-bound and evidence-bound.

### Human Feedback Signals

The system should preserve explicit reviewer signals such as:

- promoted candidate
- dismissed candidate
- marked as filler
- marked as promising but under-sourced
- selected for follow-up
- turned into a reporter run
- drafted but not published
- published after additional sourcing
- reclassified into a different lane

It should also preserve concise reason codes where practical.

### Learning Boundaries

Learned ranking may influence prioritization.

Learned ranking must not override:

- source-role semantics
- corroboration requirements
- statement-versus-fact rules
- high-risk publication gates
- deterministic editorial safety rules

The system may learn what often becomes a good story.

It must not learn that repeated weak claims become factual merely because humans sometimes investigated them.

## Autonomy Tiers

Future work should assign autonomy by lane and risk profile.

### Tier 1: Discovery Autonomy

Allowed behaviors:

- monitor sources
- fetch and normalize items
- create candidates
- classify event versus article relevance
- extract draft event details from event-like candidates
- extract claims
- rank opportunities

This should become broadly available first.

### Tier 2: Drafting Autonomy

Allowed behaviors:

- generate source-grounded outlines, analysis, and article drafts
- create editor-reviewable content

This should be standard for most lanes before autopublish is considered.

### Tier 3: Conditional Publishability

Allowed behaviors:

- automatically mark low-risk outputs as publishable
- still require explicit policy and validation gates

This should apply only to narrow, low-risk categories with strong source structure.

### Tier 4: Autonomous Publication

Allowed behaviors:

- publish without human approval

This should remain tightly bounded and should never be the default for local accountability, politics, crime, health, or source-thin reporting.

## Recommended Initial Autonomy By Lane

- `Local government`: Tier 2 by default
- `Police/public safety`: Tier 1 or Tier 2 with strong corroboration, never default Tier 4
- `Events and community happenings`: Tier 2 quickly, Tier 3 later for bounded low-risk calendar entries and digest material
- `Food`: Tier 2 quickly, Tier 3 later for narrow formats
- `Gardening`: Tier 2 quickly, Tier 3 later for bounded practical content
- `Economics`: Tier 2 with strong data rules, Tier 3 only for narrow recurring briefs
- `National/world`: Tier 2 summaries, Tier 3 only if differentiated and strongly sourced
- `Personal finance`: Tier 2 with strict policy pack, very cautious on any Tier 3 behavior

## Dashboard Outcome Model

The intended morning dashboard should show planned editorial output, not just raw bot findings.

It should answer:

- what lanes were scheduled today
- which lanes produced drafts
- which draft events were created
- which drafts need review
- which lanes were skipped and why
- which lanes were blocked and why
- how close each lane is to its weekly quota

It should also surface notable non-drafted candidates that may deserve human follow-up, especially:

- promising but under-sourced leads
- high-interest low-confidence items
- statement-driven items needing corroboration
- potentially important local items that the system could not complete autonomously
- event candidates that should be reviewed for calendar inclusion even if they are weak article leads

Expected outcomes per scheduled run:

- `DRAFT_CREATED`
- `NEEDS_REVIEW`
- `BLOCKED`
- `SKIPPED_NO_CREDIBLE_STORY`
- `SKIPPED_QUOTA_MET`
- `FAILED`

## Multi-Epic Roadmap

### Epic 1: Strengthen The Shared Evidence Pipeline

Build or extend:

- source registry by lane and geography
- source landscape discovery for new geographic areas and unfamiliar beats
- better source classification
- source-role and trust semantics
- event-candidate detection and event-field extraction
- claim extraction consistency
- statement-versus-fact classification
- corroboration modeling
- source reliability scoring
- richer candidate clustering and deduplication

### Epic 2: Add Coverage Planner And Lane Policies

Build:

- coverage lane model
- cadence and quota policy model
- daily and weekly scheduling logic
- explicit no-story and skip outcomes
- candidate quality grading
- event-lane planning and digest cadence policy
- dashboard surfaces for coverage planning

### Epic 3: Add Domain Packs

Build:

- beat classifier or manual lane assignment support
- lane-specific sourcing rules
- lane-specific draft templates and validation rules
- high-risk policy enforcement
- event-specific extraction and validation rules

### Epic 4: Add Browser Worker Infrastructure

Build:

- separate worker runtime for JS-heavy and authenticated sources
- public-browser and restricted-browser execution modes
- capture of screenshots, copied text, and provenance artifacts
- isolated account/session handling

### Epic 5: Add Restricted-Source Intake

Build:

- authorized restricted-source registry entries
- capture workflows for private Facebook groups and similar sources
- provenance-aware source artifacts
- mandatory corroboration gates for sensitive restricted-source claims

### Epic 6: Expand Scheduled Draft Production

Build:

- lane-driven scheduled runs
- draft production according to cadence
- quota-aware candidate selection
- editor-ready morning dashboard
- visibility into non-drafted but potentially useful candidates
- draft event creation and review visibility
- event digest article generation from approved event data

### Epic 7: Add Human Feedback Ranking

Build:

- explicit reviewer feedback capture on candidates and outcomes
- reason-coded candidate promotion, dismissal, and follow-up actions
- ranking improvements informed by human editorial behavior
- hard boundaries so learned ranking does not override sourcing and policy rules

### Epic 8: Evaluate Narrow Autopublish Lanes

Only after the previous layers are stable, evaluate:

- low-risk routine civic summaries
- narrow economics briefs
- bounded food/gardening service content

Do not evaluate autopublish for the hardest local lanes first.

## Success Definition

Highlander Today is near the intended business outcome when it can:

- discover stories without requiring constant manual prompting
- assemble evidence faster than a solo human operator can manually do
- produce scheduled draft output across multiple lanes
- produce structured draft events from discovered event signals
- avoid flooding low-value categories
- avoid rewarding filler simply because a schedule exists
- preserve strong factual and sourcing standards
- clearly explain why an article was drafted, blocked, or skipped
- surface promising but incomplete candidates for human follow-up
- learn from human prioritization without weakening evidence rules
- maintain reader trust by preferring evidence over ideology or narrative pressure

## Implementation Notes

- Keep this document as the primary roadmap for future reporter autonomy work.
- Keep `PROJECT-STATUS.md` current when implementation state changes.
- Keep `REPORTER-DAILY-COVERAGE-ROADMAP.md` as historical context unless it is later folded completely into this document.
- Update this document when the target architecture or autonomy posture changes materially.
