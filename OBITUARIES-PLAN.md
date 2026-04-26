# Obituaries and Memoriam Plan

> **Implementation status as of session 186:** The core Memoriam subsystem is now live. The Prisma data model, public intake form, moderation queue, public browse/detail pages, steward self-service management page, multi-photo support, YouTube/Vimeo video embeds, memorial service stream links, admin steward assignment, admin photo approval, and `MEMORIAM` homepage box type are all implemented. See `MEMORIAM-LAUNCH-READINESS.md` for the operational pre-launch checklist and `MEMORIAM-STRATEGY.md` for the long-term strategic vision.

## Purpose

This document defines the recommended obituary, death notice, and memorial direction for Highlander Today.

It is not a standalone product brief for a new memorial startup. It is a subsystem plan for the existing Highlander Today platform, which already includes community identity, trust levels, moderation, messaging, uploads, admin operations, directory foundations, and tenant-aware local publishing.

The goal is to let Highlander Today preserve the histories of ordinary local people, not just traditionally notable figures, while still protecting families and the community from fake death notices, abusive submissions, revenge posting, identity mistakes, and low-accountability memorial content.

Core principle:

- everyone is notable to someone
- memorial content must carry higher verification and moderation standards than ordinary community publishing
- the system should fit Highlander Today's broader role as local digital infrastructure rather than behaving like an isolated memorial app

## Platform Context

Highlander Today already has platform primitives that obituary and memorial workflows should build on rather than replace:

- signed-in user accounts
- trust levels (`ANONYMOUS -> REGISTERED -> TRUSTED -> SUSPENDED`)
- platform roles (`Reader -> Contributor -> Staff Writer -> Editor -> Admin -> Super Admin`)
- moderation and approval patterns
- audit/activity logging
- direct messaging
- uploads/media handling
- tenant-aware community context
- admin operational surfaces

Because those foundations already exist, the obituary/memorial system should be designed as a new content and stewardship subsystem inside the platform, not as a parallel product with its own unrelated account, moderation, or publishing model.

## Product Direction

Obituaries should not behave like normal Local Life articles. They should become a dedicated content system with stronger identity, stewardship, provenance, and moderation rules.

Recommended split:

1. `Death Notice`
   A minimal, factual, time-sensitive public record for informing the community about a death and, when appropriate, service details.

2. `Memorial Page`
   A richer, longer-lived page that can preserve biography, family history, photos, milestones, stories, affiliations, places, and community memories over time.

This split should remain the core product structure. It reduces risk by separating the urgent factual use case from the richer, more contributable memorial use case.

## Why This Is A Separate System

Obituaries and memorials have different risks from ordinary community publishing:

- false reports of death
- mistaken identity
- insulting or revenge-driven submissions
- family disputes about wording or control
- permanent harm from publishing inaccurate or humiliating content
- sensitive photos or personal details being posted without consent
- confusion between factual record and community storytelling

For that reason, publication should not rely only on ordinary trust level or the same moderation path used for Local Life articles.

## Highlander Today Role

Within Highlander Today, `Memoriam` should function as one part of the broader community record:

- Local Life handles current local publishing
- Events handles what is happening now and next
- Directory and organizations help residents find people and institutions
- `Memoriam` preserves deaths, lives, and community memory
- over time, `Memoriam` can connect naturally to `History` and the broader community-record direction

This means the obituary/memorial subsystem should strengthen the platform's place-based identity rather than compete with or replace its existing sections.

## Public Information Architecture

The public-facing home for obituaries and memorials is the `Memoriam` section, located under the `Community` top-level nav dropdown alongside `History` and `Moving To`.

"Memoriam" or "In Memoriam" is the preferred public name. It is dignified, signals respect, and is distinct from the newspaper-style "Obituaries" framing that carries stronger paid-classified associations.

The homepage should include a small, understated block showing recent death notices:

- names
- dates
- link into the full `Memoriam` section

That homepage treatment should be visually quiet and respectful, not a high-attention promotional module competing with events, articles, or marketplace content.

## Core Rules

- Only signed-in users can interact with obituary workflows.
- Only `TRUSTED` users can initiate a public obituary or memorial submission.
- Public publication should require either family authority, institutional authority, or additional trusted confirmation.
- Core factual identity fields should lock after approval unless staff re-open them.
- Rich memorial storytelling and photo additions should be moderated separately from the core factual record.
- Anonymous comments should not be allowed.
- All obituary and memorial actions should produce durable audit history.

## Product Goals

The obituary/memorial subsystem should let Highlander Today answer a local need that existing systems handle poorly:

- provide a clear place to record a death
- preserve a life in a dignified and structured way
- allow families and trusted community members to extend a factual notice into a richer memorial over time
- preserve local memory as part of the platform's broader community record

The product should feel easy enough for ordinary residents to use, but not so frictionless that it becomes vulnerable to false publication or family harm.

## Submission Actors

Common initiating actors may include:

- spouse
- child
- sibling
- extended family member
- funeral home representative
- clergy member
- friend
- neighbor
- classmate
- community volunteer
- organization representative

Those actors should not all receive identical publishing power. The workflow should distinguish between who may submit, who may verify, who may steward, and who may approve publication.

## Recommended Roles

### Submitter

The person who starts a death notice or memorial submission.

### Steward

The primary ongoing manager of a memorial page. Usually a family member or another approved representative. A memorial may have more than one steward in later phases.

### Verifier

A person or entity used to support publication legitimacy. This could be:

- family member
- funeral home representative
- clergy member
- cemetery representative
- organization representative
- trusted secondary confirmer from the community

### Moderator

Staff, editor, admin, or super-admin roles that review, approve, freeze, reject, unpublish, or transfer obituary-related content.

## Submission Requirements

Every obituary or memorial submission should collect:

- full name of the deceased
- town or community connection
- date of death, if known
- relationship of the submitter to the deceased
- whether the submitter is family, institutional representative, or other
- at least one source or verification path
- contact method for review follow-up

Recommended relationship options:

- immediate family
- extended family
- funeral home
- clergy
- friend
- classmate
- neighbor
- organization representative
- other

## Content Model

### Death Notice

The `Death Notice` format should be narrow and factual. It may include:

- full name
- age
- town
- date of death
- brief summary
- service or visitation details
- funeral home or institutional attribution when relevant
- burial or cemetery details when appropriate

Recommended publication rule:

- publish if submitted by family or institution and reviewed
- or publish if submitted by another trusted user plus secondary confirmation

This should be the faster, narrower workflow.

### Memorial Page

The `Memorial Page` format should allow richer content such as:

- biography
- life timeline
- family history
- military, church, civic, school, or organizational involvement
- major places in the person's life
- service details
- surviving and predeceased family
- photo gallery
- legacy and remembrance sections
- moderated memory submissions from others

Recommended publication rule:

- require steward approval before the page becomes publicly editable
- require stronger verification than an ordinary death notice
- treat factual identity fields and narrative content as separate review concerns

This should be the slower, richer, longer-lived workflow.

## Guided Writing Direction

Highlander Today should preserve the stronger safety and moderation posture above while still making memorial creation easier for non-technical users.

Recommended prompts for memorial creation:

- What should people remember most?
- What was this person known for?
- What places were important in their life?
- What relationships mattered most?
- What organizations, churches, schools, or community groups shaped their life?

These prompts should assist writing, not force rigid templates.

## Community Contribution Model

Open public comments are likely to create avoidable moderation risk early and do not align well with Highlander Today's trust/accountability principles for memorial content.

Recommended launch approach:

- no open public comments
- allow a `Share a Memory` flow instead
- memories, condolences, corrections, and photos from non-stewards go into moderation or steward review
- stewards can approve, hide, or request staff review

This preserves community participation without turning a memorial into an unmoderated comment thread.

## Provenance And Reader Trust

Every obituary or memorial page should display clear provenance signals so readers understand who created and verified it.

Recommended public indicators:

- created by daughter/son/family/funeral home/etc.
- verified by funeral home/clergy/family/staff
- managed by family
- last factual review date

This increases accountability, helps readers interpret the page correctly, and discourages misuse.

## Anti-Abuse Controls

The system should assume some users will joke, troll, settle scores, or submit content while angry.

Recommended protections:

- require `TRUSTED` status to initiate public obituary workflows
- require declared relationship to the deceased
- require at least one verifiable source before public publication
- require secondary confirmation for non-family submissions
- block immediate self-publication for rich memorial pages
- maintain a dedicated obituary moderation queue
- provide a fast `freeze memorial` action for staff
- keep immutable moderation and edit logs

## Writing Rules

Obituaries and memorials should follow stricter language standards than ordinary opinion or community writing.

Required standards:

- factual when presenting core identity and death information
- respectful
- non-accusatory
- non-mocking
- non-sensational

Should not allow:

- personal grievances
- unresolved accusations
- sarcasm
- ridicule
- score-settling
- defamatory speculation

## Moderation Actions

Staff should have obituary-specific moderation tools, not just generic article approval actions.

Recommended actions:

- approve
- request clarification
- reject
- freeze public edits
- unpublish
- transfer stewardship
- lock factual fields
- remove abusive memory or photo submission
- flag for identity dispute

## Launch Scope

To reduce risk, initial launch should be narrower than the long-term vision.

Phase 1 — **Now live:**

- only trusted users can initiate public submissions
- no open comments — moderated `Share a Memory` flow only
- staff-approved or steward-approved memories and photos appear publicly
- obituary and memorial content lives in a separate moderation workflow from Local Life articles
- homepage `MEMORIAM` box type renders a recent-death-notices block
- public `/memoriam` index with search and type filtering
- multi-photo support: photos submitted at intake (staff-reviewed) and steward-uploaded (auto-approved)
- YouTube / Vimeo video embeds and memorial service stream links
- steward self-service via `/memoriam/[slug]/manage`: edit text, manage photos/videos, approve memories, invite co-stewards

Phase 2 — **Still pending:**

- richer place associations (birth town, death town already collected; deeper geo integration pending)
- print-friendly memorial output
- email notification to steward when memories are submitted
- email-based co-steward invitation (currently requires user ID)
- steward transfer workflow in admin UI
- deeper public search (date-range, multi-filter)
- memoriam ↔ history linkage

Phase 3 — **Planned:**

- support a broader structured memorial archive for community history
- allow memorial records to connect to a larger people/history knowledge base if Highlander Today later builds one
- evaluate stronger search and archive experiences across `Memoriam` and `History`
- data portability: individual memorial export (PDF, JSON)

## Monetization Direction

The current recommended direction should remain aligned with the broader Highlander Today product philosophy:

- death notices are free
- basic community notification of a death should not be paywalled
- richer memorial pages with media hosting, extended galleries, or other storage-heavy features may later carry a modest fee

This differs from a standalone memorial business model where every memorial record is immediately paid. In Highlander Today, the priority is public-service usefulness first, with restrained monetization around richer memorial expansion later if needed.

Sponsored memorial support may still be worth exploring later, but it should not be treated as the defining launch mechanic. If revisited, it should be framed with dignity and aligned with the platform's broader trust and community-benefit posture.

## Data Model Direction

Exact schema design can be refined later, but the current recommended direction is:

- `MemorialPerson`
- `MemorialPage`
- `MemorialContributor`
- `MemorialVerification`
- `MemorialSubmission`
- `MemorialMemory`
- `MemorialPhoto`
- `MemorialAuditLog`

Important distinctions:

- the person record should be separable from the page record
- the factual identity record should be separable from community-contributed narrative material
- stewardship and verification should be explicit rather than implied by generic article authorship

That separation helps with moderation, versioning, future archive use, and later transfer of stewardship.

## UX Direction

The memorial creation flow should be easier and more guided than a generic article submission flow, but still compatible with Highlander Today's existing platform patterns.

Recommended user experience goals:

- clear step-by-step flow
- minimal jargon
- mobile-friendly public pages
- clear preview before submission when appropriate
- simple invitation path for additional memories or photos
- visible ownership and review state
- stable public URLs
- future print-friendly treatment if justified

The design should feel quiet, readable, and dignified rather than promotional.

## Accessibility And Reliability Expectations

As part of Highlander Today, `Memoriam` should follow the same quality bar expected of other core platform systems:

- readable typography
- strong contrast
- large tap targets
- keyboard accessibility
- screen reader compatibility
- responsive performance
- stable URLs
- durable records with backup/export thinking included in later implementation planning

## Relationship To Existing Systems

The obituary/memorial system should reuse or align with existing Highlander Today patterns where possible:

- use existing auth and trust levels
- use existing upload/media infrastructure where appropriate
- use existing admin design vocabulary for list and moderation surfaces
- use existing audit and activity logging principles
- use messaging carefully where it helps stewardship or clarification

The system should not be forced into the exact `Local Life` article model, because its moderation and stewardship requirements are materially different.

## Success Criteria

The first phase should be considered successful if:

- residents understand what `Memoriam` is
- trusted/family/institutional users can submit without confusion
- staff can review and moderate without improvised manual workarounds
- public pages feel dignified and trustworthy
- families can extend a death notice into a richer memorial over time
- the section begins to feel like part of the community record rather than a one-off publishing feature

## Risks

### Over-Scope Risk

Trying to build memorials, broader community record tooling, archive systems, and monetization mechanics all at once.

### Trust Risk

If the platform does not feel durable, accountable, and careful, users may hesitate to publish sensitive memorial content.

### Moderation Risk

Community contributions, family disputes, and identity errors require stronger workflows than standard publishing.

### Permanence Risk

Promises of long-term remembrance need corresponding technical, operational, and financial realism.

## Recommended Initial Build Focus

Must have — **all now live:**

- [x] dedicated `Memoriam` section in the public information architecture
- [x] death notice workflow
- [x] memorial submission workflow
- [x] obituary-specific moderation queue and actions
- [x] clear provenance display on public pages
- [x] support for trusted-family or institution-backed publication
- [x] photo support for memorial pages (multi-photo, gallery, hero selection)
- [x] video support (YouTube/Vimeo embeds, memorial service stream link)
- [x] guided writing support (plain-language form, auto-calculated age, character limits)
- [x] moderated `Share a Memory` submissions instead of open comments
- [x] steward self-service (edit text, manage media, approve memories, invite co-stewards)

Nice to have — **still pending:**

- [ ] print-friendly memorial treatment
- [ ] better service-details formatting
- [ ] email notifications to steward on new memory submissions
- [ ] email-based co-steward invitation
- [x] basic search by name and town (live)
- [x] co-steward support (live via invite)

Later:

- richer historical/archive integration
- broader memorial media packages
- sponsorship or memorial-support mechanics if justified
- deeper people/history graph connections
- data export / portability (PDF, JSON)

## Summary

Highlander Today's obituary and memorial system should not be a clone of newspaper obituaries, a generic article type, or a separate memorial startup bolted onto the side of the platform.

It should be a careful, dignified `Memoriam` subsystem inside Highlander Today:

- factual where it must be factual
- human where it should preserve memory
- locally grounded
- stronger on verification than ordinary publishing
- designed to become part of the community record over time

The right first move is not to build every future archive or civic-record capability at once. The right first move is to establish a trusted local death-notice and memorial workflow that fits the platform Highlander Today already is.
