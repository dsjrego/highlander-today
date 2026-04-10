# Historical Events and Community Timeline Plan

> **Last updated:** 2026-04-09
> **Status:** Strategic direction document. Not yet built.

## Purpose

This document defines the recommended direction for a dedicated historical-record and community-timeline system inside Highlander Today.

It is not an article feature, and it is not only a memoriam feature. It is a separate domain for preserving local historical records, private family history, selected public community memory, and future timeline-based discovery.

The system should support four related but distinct needs:

- preserve historical records in a durable repository
- generate article ideas from those records without turning articles into the system of record
- let families document their own history privately and choose what may be shared
- allow selected memoriam and life-history material to contribute to the broader community record over time

The core rule is simple:

- the timeline repository is the archive
- articles are editorial responses to the archive
- memoriam is a related stewardship surface for lives and family memory
- nothing family-submitted becomes public without explicit sharing choice and editorial review

## Why This Should Be Its Own System

Historical records should not live primarily inside the article system.

Articles are the wrong system of record for this domain because they are built for editorial narrative, publication status, preview, homepage promotion, and reader-facing presentation. Historical records need different primitives:

- date precision
- people and family relationships
- place-based indexing
- source tracking
- verification state
- privacy and sharing controls
- invitations for collaborative family contribution
- selective promotion into public history

If history is modeled as articles first, the result will be cluttered, expensive, and disconnected. The historical repository should exist on its own, with optional links to articles when editorial coverage makes sense.

## Product Goals

The system should let Highlander Today become a trustworthy local memory and history layer, not just a place for current news.

The product goals are:

- preserve local historical records beyond what fits in ordinary news coverage
- create a real "This Day in History" source pool for staff
- support town, county, and place-based public timelines
- support person-centered and family-centered private historical archives
- connect memoriam and life history to the broader community record without forcing all memorial material public
- keep public history curated, dignified, and resistant to abuse

## Core Principles

### Archive First

The system of record is a historical timeline repository, not an article draft list.

### Private First For Family Material

Family-submitted records, stories, and photos should be private by default. Families decide what may be shared publicly.

### Curated Public History

Public visibility always requires curation. Explicit family consent is necessary but not sufficient on its own.

### One Record, Many Surfaces

A single historical record may appear in different contexts over time:

- private family archive
- memoriam timeline
- public community timeline
- town history view
- "This Day in History" editorial queue
- one or more related articles

### Facts And Narrative Are Different

The system should separate:

- factual claims
- source and verification notes
- editorial interpretation
- community memory and personal storytelling

These are related, but they should not be collapsed into one uncontrolled text box.

## Domain Structure

The recommended domain is a set of related models rather than one oversized table.

High-level domains:

- `History` for canonical historical and timeline records
- `Memoriam` for death notices, memorial pages, stewards, and family memory
- `Articles` for editorial storytelling that may link to historical records
- `People / Places / Organizations` as reusable subjects over time
- `Media` for photos, scans, and uploaded artifacts

The important architectural rule is that these domains are related, not merged.

## Recommended Core Models

### `TimelineRecord`

This is the central historical record entity.

It represents a dated or approximately dated item that belongs in a timeline or historical repository.

Recommended fields:

- `id`
- `communityId`
- `title`
- `shortDescription`
- `fullNotes`
- `eventDate`
- `datePrecision`
- `approximateDateLabel`
- `monthDayKey`
- `recordType`
- `scope`
- `visibility`
- `verificationStatus`
- `editorialStatus`
- `createdByUserId`
- `primaryPlaceId` nullable
- `primaryMemoriamId` nullable
- `primaryArticleId` nullable
- `createdAt`
- `updatedAt`

Recommended `recordType` examples:

- `HISTORIC_EVENT`
- `LIFE_EVENT`
- `BIRTH_ANNOUNCEMENT`
- `MARRIAGE`
- `DEATH`
- `OBITUARY_REFERENCE`
- `BUSINESS_MILESTONE`
- `CHURCH_EVENT`
- `CIVIC_EVENT`
- `SCHOOL_EVENT`
- `MILITARY_SERVICE`
- `DISASTER`
- `PHOTO_RECORD`
- `ORAL_HISTORY_NOTE`

Recommended `scope` examples:

- `PERSON`
- `FAMILY`
- `TOWN`
- `COUNTY`
- `STATE`
- `NATIONAL`
- `INTERNATIONAL`

Recommended `datePrecision` examples:

- `EXACT_DATE`
- `MONTH_YEAR`
- `YEAR_ONLY`
- `APPROXIMATE`
- `UNKNOWN`

Recommended `visibility` examples:

- `PRIVATE`
- `FAMILY_ONLY`
- `SUBMITTED_FOR_PUBLIC_REVIEW`
- `PUBLIC`
- `ARCHIVED`

Recommended `verificationStatus` examples:

- `UNVERIFIED`
- `SOURCE_ATTACHED`
- `EDITOR_REVIEWED`
- `VERIFIED`
- `DISPUTED`

Recommended `editorialStatus` examples:

- `NONE`
- `IDEA`
- `RESEARCHING`
- `ASSIGNED`
- `ARTICLE_DRAFTED`
- `ARTICLE_PUBLISHED`

### `TimelineRecordPerson`

A join model linking people to timeline records with role semantics.

Recommended examples:

- `SUBJECT`
- `SPOUSE`
- `PARENT`
- `CHILD`
- `SIBLING`
- `PARTICIPANT`
- `OFFICIANT`
- `VETERAN`
- `GRADUATE`
- `HONOREE`

This allows a single record to belong to multiple people and later power both family history and public community views.

### `TimelineRecordPlace`

A join model linking records to one or more places.

This should eventually connect to a reusable place/location layer so records can appear in views such as:

- Patton timeline
- St. Mary's Church timeline
- Cambria County timeline
- cemetery timeline

### `TimelineRecordSource`

A record should support multiple sources rather than one loose citation field.

Recommended fields:

- `sourceType`
- `citationText`
- `sourceUrl`
- `publicationName`
- `sourceDate`
- `archiveReference`
- `notes`

Recommended `sourceType` examples:

- `NEWSPAPER`
- `CHURCH_RECORD`
- `CEMETERY_RECORD`
- `FUNERAL_HOME_RECORD`
- `GOVERNMENT_RECORD`
- `YEARBOOK`
- `FAMILY_SUBMISSION`
- `PHOTO`
- `LETTER`
- `ORAL_HISTORY`
- `STAFF_RESEARCH`

### `TimelineRecordMedia`

Uploaded images and documents related to a record.

Recommended fields:

- `assetId`
- `caption`
- `credit`
- `isPrimary`
- `visibility`
- `submittedByUserId`

Media should be independently permissioned because a family may choose to share one image publicly but keep others private.

### `HistoricalPerson`

This should eventually exist as a shared person entity for historical and memorial uses.

It does not need to be overbuilt in v1, but the architecture should anticipate it.

Recommended future direction:

- reusable person profile for historical subjects
- links to memorial pages when relevant
- optional family-relationship mapping
- optional aliases and maiden names

### `MemoriamProfile`

Memoriam remains its own subsystem, but it should be able to link to timeline records.

Examples of relationship:

- a memorial page may own many private life-history entries
- selected entries may be shared into the public historical timeline
- a public historical entry may link back to the memoriam page where appropriate

### `ArticleTimelineRecord`

This should be a many-to-many relationship between articles and timeline records.

That allows:

- one timeline record to inspire multiple articles
- one article to cover multiple historical records
- article pages to show related timeline context later

Do not overload article date fields to act as the historical-record system.

## Family History Model

The family-history portion should be private by default.

The product direction should be:

- a family or memorial steward can document a person's life history privately
- invited relatives, and later invited trusted friends, may contribute within controlled permissions
- each record or media item has its own sharing controls
- public sharing is per item, not all-or-nothing for the whole profile

This matters because families will often want to preserve much more material than they are comfortable publishing publicly.

Recommended contribution roles:

- `OWNER`
- `STEWARD`
- `FAMILY_CONTRIBUTOR`
- `INVITED_FRIEND_CONTRIBUTOR`
- `VIEWER`

Recommended invitation rules:

- invitations should be explicit, revocable, and attributable
- invited contributors should understand whether they are contributing to a private archive, a memorial page, or a public-review candidate
- invited contributors should not be able to publish directly to the public timeline

## Public Sharing Rules

Nothing should become public automatically because it exists in a family archive or memorial workflow.

Recommended public-sharing path:

1. A family steward or authorized contributor marks an individual record or media item as shareable.
2. The item moves to `SUBMITTED_FOR_PUBLIC_REVIEW`.
3. Staff reviews it for relevance, tone, evidence, privacy, and dignity.
4. Staff either approves it into the public timeline, requests revision, or rejects it.

The platform should support the idea that something may be:

- important to a family
- legitimate historical material
- not suitable for public publication in its current form

Those are different questions and should remain separate.

## Curation And Abuse Safeguards

Public curation is mandatory.

The system must explicitly guard against revenge posting, defamation, salacious gossip, humiliating storytelling, family disputes, and "airing grievances" under the cover of history or memorialization.

Examples of content that should not be allowed into the public timeline:

- sexual accusations framed as historical record without strong editorial basis
- vindictive relationship narratives
- abusive or insulting characterizations of private individuals
- unresolved family conflicts written as public memory
- speculative claims presented as fact
- private harm that has no broader community relevance and would mainly humiliate descendants or living relatives

Recommended moderation rules:

- public historical records should be written in neutral, dignified language
- family-submitted narrative should be reviewed more strictly than private storage
- factual claims should be separated from emotionally charged commentary
- sensitive records involving private individuals should require stronger editorial judgment
- disputed records should be reversible, with durable audit history

The system should prefer curation standards like:

- relevance
- dignity
- verifiability
- local significance
- appropriateness for broad public memory

Not every true family story belongs on a public community timeline.

## Relationship To Memoriam

Memoriam and historical records should be related but not identical.

Recommended distinction:

- `Memoriam` is the stewardship surface for death notices, memorial pages, family contributors, and life remembrance
- `History` is the broader timeline archive for community memory and place-based history

Areas of overlap:

- biography and life timeline
- places lived
- marriage, birth, death, military service, school history, church life
- family-submitted photos and documents
- community significance over time

Recommended rule:

- a memoriam page may contain many private or family-only timeline records
- only selected records are eligible for public historical publication
- once approved, those records may appear in community-history views in addition to memoriam

This lets Highlander Today preserve lives respectfully without forcing every memorial detail into public history.

## Relationship To Articles

Historical records should generate editorial opportunities, not become article clutter.

Recommended article relationship:

- timeline records can be flagged as article ideas
- staff can browse eligible records by calendar date, place, type, or significance
- an article may be created from one or more timeline records
- the article remains a separate editorial object
- the historical record remains the canonical archive entry

Recommended article workflow:

1. Staff enters or discovers a timeline record.
2. The record is researched and sourced over time.
3. The record becomes eligible for a daily "On This Day" queue through `monthDayKey`.
4. Staff may mark the record as an article idea.
5. If an article is created, the article links back to the record.
6. The public article may later show related timeline context.

This keeps editorial publishing connected to the archive without collapsing the two systems.

## Public Timeline Surfaces

The long-term system should support multiple timeline views over the same repository.

Examples:

- community-wide timeline
- town timeline
- county timeline
- institution timeline
- person timeline
- memoriam-linked life timeline
- "On This Day" daily feature

The key architectural principle is that these are views over shared records, not separate storage systems.

## Admin And Stewardship Surfaces

The admin/stewardship experience should be repository-first.

Recommended early admin surfaces:

- `Today`
- `Library`
- `Review Queue`
- `Places`
- `People`
- `Sources`
- `+ Record`

Recommended v1 simplification:

- `Today`
- `Library`
- `Review Queue`
- `+ Record`

Recommended row actions:

- `View`
- `Edit`
- `Research`
- `Manage Sources`
- `Create Article`
- `Submit For Public Review`
- `Approve`
- `Reject`

Family or memorial stewardship surfaces should be different from staff admin surfaces. Families need a respectful archive-management experience, not an editorial operations UI.

## "This Day In History" Direction

The "This Day in History" feature should be generated from the timeline repository, not from the article table.

Recommended logic:

- compute `monthDayKey` from historical date data
- filter by community relevance and public eligibility
- allow staff to view all candidates for the current day
- allow staff to sort by locality, significance, type, and editorial readiness
- allow article creation from one or more records

This allows staff to build daily historical coverage from a real repository rather than inventing it ad hoc each morning.

## Privacy And Permissions

The system needs more granular permissions than ordinary article workflows.

Recommended permission layers:

- platform-level moderation permissions
- family/archive stewardship permissions
- per-record visibility controls
- per-media visibility controls
- invitation and contributor permissions
- public-review approval permissions

Important rule:

- contributor access is not publication access

Someone invited by a family to contribute should be able to help document history without gaining authority to publish it publicly.

## Verification And Trust

Historical and memorial content should not depend entirely on one binary "trusted user" concept.

Recommended trust model:

- existing Highlander Today trust and role systems still matter
- public historical publication should also consider sources, steward authority, and editorial review
- family contribution legitimacy and public historical legitimacy are related but not identical

This is especially important for:

- death-related records
- disputed family details
- old photos with uncertain identities
- oral histories
- records about private individuals rather than widely known public figures

## Non-Goals

The first version should not try to become:

- a full genealogy platform
- an unrestricted social memorial wall
- a fully open public wiki
- an article substitute
- a newspaper-style paid obituary clone

The goal is a curated local memory and historical-record system that can grow into timelines, memoriam integration, and editorial support.

## Recommended Sequencing

### Phase 1: Historical Repository Foundations

Build the private/admin-side historical record system first:

- `TimelineRecord`
- sources
- media
- date precision
- place indexing
- editorial and verification statuses
- basic "This Day" queue

### Phase 2: Article Linkage

Add many-to-many links between timeline records and articles.

### Phase 3: Family And Memoriam Contribution

Add family/private archive controls, invitations, and per-item sharing permissions tied to memorial and family history workflows.

### Phase 4: Public Timeline Views

Launch curated public timeline surfaces for towns, places, and broader community history.

### Phase 5: Cross-Surface Historical Memory

Allow selected memoriam and family-history records to enrich the public timeline through controlled review and attribution.

## Canonical Product Conclusion

Highlander Today should treat historical records, memoriam, and articles as related models inside one broader community-memory system.

The recommended structure is:

- a dedicated historical/timeline repository as the archive
- memoriam as a related but distinct stewardship subsystem
- articles as optional editorial outputs linked back to historical records
- private family history as a first-class input layer with explicit sharing controls
- mandatory curation before any family-submitted material becomes public community history

This preserves dignity, reduces abuse risk, supports future timelines, and gives the platform a durable foundation for local memory that is broader than news and more accountable than an open public scrapbook.
