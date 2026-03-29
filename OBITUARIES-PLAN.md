# Obituaries and Memorials Plan

## Purpose

This document defines the recommended obituary and memorial direction for Highlander Today. The goal is to let the platform preserve the histories of ordinary local people, not just traditionally "notable" figures, while still protecting families and the community from fake death notices, abusive submissions, revenge posting, and low-accountability memorial content.

The core principle is simple: everyone is notable to someone, but memorial content must carry higher verification and moderation standards than ordinary community publishing.

## Product Direction

Obituaries should not behave like normal Local Life articles. They should become a dedicated content system with stronger identity, stewardship, and moderation rules.

Recommended split:

1. `Death Notice`
   A minimal, factual, time-sensitive record for informing the community about a death and any service details.

2. `Memorial Page`
   A richer, longer-lived page that can preserve biography, family history, photos, milestones, stories, and community memories over time.

That split reduces risk. The factual, urgent use case can be handled with stricter constraints, while the richer memorial format can grow more slowly under stronger stewardship.

## Why A Separate System

Obituaries and memorials have different risks from normal publishing:

- false reports of death
- mistaken identity
- insulting or revenge-driven submissions
- family disputes about wording or control
- permanent harm from publishing inaccurate or humiliating content
- sensitive photos or personal details being posted without consent

For that reason, publication should not rely only on ordinary trust level or article moderation.

## Core Rules

- Only signed-in users can interact with obituary workflows.
- Only `TRUSTED` users can initiate a public obituary or memorial submission.
- Public publication should require either family authority, institutional authority, or additional trusted confirmation.
- Core factual identity fields should lock after approval unless staff re-open them.
- Rich memorial storytelling and photo additions should be moderated separately from the core factual record.
- Anonymous comments should not be allowed.

## Recommended Roles

### Submitter

The person who starts a death notice or memorial submission.

### Steward

The primary ongoing manager of a memorial page. Usually a family member or another approved representative. A memorial may have more than one steward.

### Verifier

A person or entity used to support publication legitimacy. This could be:

- family member
- funeral home representative
- clergy member
- cemetery or organization representative
- trusted secondary confirmer from the community

### Moderator

Staff/admin/editor roles that review, approve, freeze, reject, or remove obituary-related content.

## Submission Requirements

Every obituary or memorial submission should collect:

- full name of the deceased
- town/community connection
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

## Verification Model

### Death Notice

The `Death Notice` format should be narrow and factual. It may include:

- name
- age
- town
- date of death
- service/viewing details
- brief family-approved summary

Recommended publication rule:

- publish if submitted by family or institution and reviewed
- or publish if submitted by another trusted user plus secondary confirmation

### Memorial Page

The `Memorial Page` format should allow richer content such as:

- biography
- life timeline
- family history
- military/service/church/community involvement
- photo gallery
- legacy and remembrance sections
- moderated memory submissions from others

Recommended publication rule:

- require steward approval before the page becomes publicly editable
- require stronger verification than an ordinary death notice
- treat factual identity fields and narrative content as separate review concerns

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

- factual
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

## Community Contribution Model

Open public comments are likely to create avoidable moderation risk early.

Recommended launch approach:

- no open public comments
- allow a `Share a Memory` submission flow instead
- memories, condolences, and photos from non-stewards go into moderation or steward review
- stewards can approve, hide, or request staff review

This preserves community participation without turning a memorial into an unmoderated comment thread.

## Provenance And Reader Trust

Every obituary or memorial page should display clear provenance signals so readers understand who created and verified it.

Recommended public indicators:

- created by daughter/son/family/funeral home/etc.
- verified by funeral home/clergy/family/staff
- managed by family
- last factual review date

This increases accountability and discourages misuse.

## Recommended Launch Scope

To reduce risk, initial launch should be narrower than the long-term vision.

Phase 1:

- only staff, clergy, funeral homes, and trusted family submitters can publish
- other trusted users can propose a memorial or submit a private request
- no open comments
- only staff-approved or steward-approved memories/photos appear publicly
- obituary and memorial content lives in a separate moderation workflow from Local Life articles

Phase 2:

- support co-stewards
- support family-approved photo galleries and timelines
- support moderated community memory submissions
- support gentle historical/archive use cases

Phase 3:

- support a broader structured memorial archive for community history
- allow memorial records to connect to a larger people/history knowledge base if the platform later builds one

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

Important distinction:

- the person record should be separable from the page record
- the factual identity record should be separable from community-contributed narrative material

That separation helps with moderation, versioning, future archive use, and possible family transfers of stewardship.

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
- remove abusive memory/photo submission
- flag for identity dispute

## Public Section: Memoriam

The public-facing home for obituaries and memorials is the `Memoriam` section, located under the `Community` top-level nav dropdown (alongside `History` and `Moving To`). See `COMMUNITY-SECTION-PLAN.md` for the full Community section direction.

"Memoriam" (or "In Memoriam") is the preferred public name. It is dignified, signals respect, and is distinct from the newspaper "Obituaries" framing that carries associations with paid classified advertising.

Death notices are free — basic community information that a local platform should provide at no cost. Memorial pages with media hosting (photos, video, extended galleries) may carry a modest fee tied to storage costs, as described in `MONETIZATION-PLAN.md`.

The homepage should include a small, understated block showing recent death notices (names and dates only), linking through to the full Memoriam section. The design should be the quietest element on the page — muted, respectful, not competing visually with events or marketplace content.

Over time, the Memoriam archive becomes part of community history, connecting naturally to the History surface under the same Community nav section and the broader "Verified Local Memory" direction.

## Strategic Fit

This system fits the broader Highlander Today vision if it is built as accountable community infrastructure rather than open publishing.

Obituaries and memorials can become one of the strongest expressions of the platform's local value:

- preserving community memory
- honoring ordinary people
- helping neighbors learn about services and loss
- building a durable local historical record

But that value only holds if the system is visibly trustworthy, respectful, and difficult to abuse.
