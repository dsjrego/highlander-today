# Admin Content Reference Plan

## Purpose

This document defines the internal admin-facing documentation/reference system for Highlander Today's content models, section structure, and taxonomy rules.

The public product already spans multiple kinds of content:

- `Article` for editorial and informational content
- `Event` for time-bound happenings
- `HelpWantedPost` for hiring and jobs
- `MarketplaceListing` and `Store` for local commerce

As the category system and main navigation become more configurable, admins need an in-product reference that explains what these models are for and how they should be used. This should not live only in developer docs like `PROJECT-STATUS.md`, because operational admins making taxonomy decisions may never read those files.

## Problem

Admin category management is drifting toward information architecture work, not just naming work.

If admins can create or edit categories/subcategories without understanding the underlying model boundaries, they will make reasonable but conflicting decisions, for example:

- creating article categories for things that should be events or jobs
- assuming a top-level section implies a single storage model
- creating nav labels that do not correspond to a real content source
- treating `Community` and `Local Life` as interchangeable taxonomy buckets instead of different discovery surfaces

This creates taxonomy drift, unclear submission flows, weak moderation boundaries, and brittle navigation logic.

## Core Direction

Add a read-only internal documentation surface inside admin that explains:

- what content models currently exist
- what each model is intended to represent
- how `Local Life` and `Community` differ
- how categories/subcategories should relate to models
- where future content types are planned but not yet built

This is an internal reference system, not a public help center and not a developer-only architecture note.

## Product Framing

The key distinction is not "articles versus not articles." The distinction is user-facing purpose.

### Local Life

`Local Life` is the current, active, discovery-heavy surface for things happening now or things people use operationally in day-to-day local life.

Examples:

- local news articles
- events
- help wanted
- marketplace/store discovery
- future real estate listings

This surface is mixed-model by nature.

### Community

`Community` is the place-based, informational, identity, memory, and orientation surface for understanding the area beyond today's activity.

Examples:

- history
- moving to the area
- what to do
- memoriam

This surface is likely article-heavy, but should not be permanently locked to articles only.

## Model Guidance

The admin reference should explain the difference between:

### Top-level section

A user-facing discovery surface such as `Local Life` or `Community`.

This defines purpose and grouping, not storage by itself.

### Subcategory / subsection

A thematic bucket within a section such as `History`, `Events`, `Help Wanted`, or `Memoriam`.

This is where content-source rules should usually attach.

### Content model

The actual object type used by the system, such as:

- `Article`
- `Event`
- `HelpWantedPost`
- `MarketplaceListing`
- future `RealEstateListing`

The admin reference should make clear that a subcategory may be:

- primarily one model
- exclusively one model
- multi-model in a future phase

## Current Model Registry Direction

The first version of the admin reference should include a simple model registry with plain-English guidance.

### Article

Use for editorial, explanatory, historical, guide, memory, and general informational content.

Likely homes:

- most of `Community`
- `Local News`
- `History`
- `Moving To`
- `What To Do` editorial guides
- `Memoriam` if memorials/death notices remain article-based

### Event

Use for time-bound happenings with dates, timing, venue, and event-specific discovery needs.

Likely homes:

- `Local Life -> Events`
- future event-driven subsections elsewhere if needed

### HelpWantedPost

Use for jobs and hiring.

Likely homes:

- `Local Life -> Help Wanted`

### MarketplaceListing / Store

Use for goods, services, local sellers, storefronts, and commerce discovery.

Likely homes:

- `Local Life -> Market`
- future service/provider discovery

### Planned but not yet built

The reference should also show planned domains that are not yet first-class models, so admins know they should not invent around them prematurely.

Examples:

- `Real Estate`
- `Directory / Organization`
- creator/show network content
- obituary or memorial-specific models if the article-first approach changes later

## Admin UX Direction

The internal documentation system should be visible from the places where admins make taxonomy decisions.

### Dedicated admin page

Add a read-only page such as:

- `Admin -> Content Architecture`
- or `Admin -> Content Models`

This page should explain the current system in concise operational language, not raw schema language.

### Contextual links

Link to the reference page from:

- category management
- future nav management
- content moderation surfaces where model boundaries matter

### Inline guidance

The category editor should eventually show short helper text such as:

- "Use `Article` for history, guides, and most Community content."
- "Use `Event` for scheduled happenings."
- "Use `Help Wanted` for jobs, not general announcements."

## What This Page Is Not

The admin reference page should not:

- expose database internals or Prisma details
- allow admins to create arbitrary new object models
- promise future models that are not committed
- replace developer planning docs

It should translate platform architecture into operational guidance.

## Recommended Content Structure

The first version of the admin reference page should include:

1. A short explanation of `Local Life` versus `Community`
2. A list of current content models and what each one is for
3. Examples of correct category-to-model mapping
4. A short "planned but not live" section
5. Links to relevant planning docs when appropriate

## Relationship to Categories and Navigation

This document assumes the platform may move toward a more configurable navbar and category-driven information architecture.

If that happens, admins will need guidance on three separate concepts:

- section purpose
- subcategory meaning
- content source/model

The admin reference system should help prevent the common mistake of treating those three concepts as the same thing.

## Rollout Recommendation

Phase 1:

- create the planning document
- add it to `PROJECT-STATUS.md`
- align future admin work around this reference concept

Phase 2:

- ship a read-only admin documentation page
- link it from category management

Phase 3:

- add inline guidance and model labels to category/nav configuration tools

## Summary

Highlander Today needs an internal admin reference system because taxonomy management is becoming architecture work.

The admin should be able to understand:

- what kinds of content exist
- what each one is for
- why `Local Life` and `Community` are different
- how categories should map to real content models

Without that, future taxonomy and navbar configuration will drift away from the actual product model.
