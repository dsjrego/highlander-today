# Highlander Today — Organization Site Plan

> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define how public organization profiles should evolve into lightweight organization websites, including custom-domain support, without splitting into a separate product model.

---

## Product Intent

The public organization profile should become the canonical public presence for an organization on Highlander Today.

That presence should support two access patterns over time:

- a Highlander-hosted route such as `/organizations/[slug]`
- an organization-mapped hostname such as `example.org` or `www.example.org`

These should not become two separate systems.

The same underlying `Organization` record, public content, moderation rules, and rendering pipeline should drive both experiences.

The custom domain is an alternate entry point, not a separate website builder product.

---

## Core Architectural Rule

Treat the directory as a discovery layer and the organization page as the canonical destination.

- `/directory` helps people find organizations
- `/organizations/[slug]` is the canonical Highlander route for the organization page
- custom domains should resolve to that same organization page renderer

Do not build a temporary "directory detail page" now and a separate "website" system later.

---

## Model Boundaries

Preserve three distinct layers:

1. `Community`
   The Highlander tenant/site context.

2. `Organization`
   The public entity being represented.

3. `OrganizationDomain`
   The alternate hostname routing and verification layer for an organization.

Recommended separation of responsibilities:

- `Organization` stores core identity, classification, approval state, and public facts
- `OrganizationDomain` stores hostnames, verification state, primary-domain behavior, and SSL/provisioning state
- future presentation controls should live in a separate settings model rather than being mixed into routing or core identity

This keeps organization facts, domain infrastructure, and page presentation from becoming coupled.

---

## Current Schema Fit

The current schema already supports the right underlying direction:

- `Organization` for core identity and publication
- `OrganizationMembership` for accountable people and manager/owner relationships
- `OrganizationLocation` for public addresses, service points, and hours
- `OrganizationDepartment` for structured subdivisions
- `OrganizationContact` for public contacts and role-specific contact points

This means the next step is not inventing a new abstraction.

The next step is adding a public read surface that uses these records cleanly, then adding routing/domain layers on top.

---

## Recommended Data Model Additions

### Keep on `Organization`

Keep organization facts and basic public-profile content here:

- `name`
- `slug`
- `description`
- `logoUrl`
- `bannerUrl`
- `websiteUrl`
- `contactEmail`
- `contactPhone`
- `directoryGroup`
- `organizationType`
- approval/publication fields

Small profile-specific additions can also live here if needed:

- `tagline`
- `primaryCtaLabel`
- `primaryCtaUrl`
- `missionSummary`

Do not overload `Organization` with domain-management or complex presentation-builder fields.

### Add `OrganizationDomain`

Recommended model direction:

```prisma
model OrganizationDomain {
  id                 String                   @id @default(uuid()) @db.Uuid
  organizationId     String                   @db.Uuid
  hostname           String                   @unique
  isPrimary          Boolean                  @default(false)
  status             OrganizationDomainStatus @default(PENDING)
  verificationToken  String?
  verifiedAt         DateTime?
  sslStatus          OrganizationSslStatus    @default(PENDING)
  redirectToPrimary  Boolean                  @default(true)
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}
```

Recommended enums:

```prisma
enum OrganizationDomainStatus {
  PENDING
  VERIFIED
  FAILED
  DISABLED
}

enum OrganizationSslStatus {
  PENDING
  ACTIVE
  FAILED
}
```

Why a dedicated model instead of a single `customDomain` field:

- supports both apex and `www` hostnames
- supports verification and provisioning state
- supports primary-domain rules and redirect behavior
- keeps routing concerns out of the base organization record

### Future `OrganizationSiteSettings`

If and when presentation settings expand, use a separate model such as:

```prisma
model OrganizationSiteSettings {
  organizationId         String  @id @db.Uuid
  headline               String?
  subheadline            String?
  themePreset            String?
  accentColor            String?
  showHighlanderBranding Boolean @default(true)
  showGlobalNav          Boolean @default(true)
  showGlobalFooter       Boolean @default(true)

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

This should remain optional until real presentation needs justify it.

---

## Routing Strategy

There should be one organization-page rendering pipeline and multiple entry points.

### Entry points

- Highlander route: `/organizations/[slug]`
- Organization hostname: `/` on `example.org`

### Request resolution order

On each request:

1. Read the `Host` header.
2. Determine whether the host is a community/tenant hostname.
3. If it is not a community hostname, check whether it matches an `OrganizationDomain`.
4. If an organization domain is matched, resolve the linked organization and its community context.
5. Render the same public organization page with the correct shell mode.

Important distinction:

- community domain resolution chooses the Highlander site/tenant
- organization domain resolution chooses a specific organization public presence inside that ecosystem

Do not merge these two concepts into a single domain table.

---

## Shell Modes

The same organization page should support at least two shell modes:

- `platform`
- `standalone`

### `platform`

Used when the organization page is being viewed on a Highlander community domain.

Characteristics:

- Highlander global nav is present
- Highlander footer is present
- page sits naturally inside the broader community product
- directory, events, and other platform links behave normally

### `standalone`

Used when the request arrives on an organization-mapped hostname.

Characteristics:

- organization page can suppress or reduce Highlander global chrome
- page may use a more organization-forward header/hero treatment
- Highlander attribution can remain present but secondary
- the experience should feel like an organization site powered by Highlander, not like an unrelated tenant app shell

This shell separation should be designed before visual polish work begins, even if the first public launch only uses the `platform` shell.

---

## Public Page Direction

The public organization page should start as a structured, high-trust presence page rather than a freeform site builder.

### Recommended v1 sections

- organization identity header
- description / about
- core contact information
- primary public location
- additional locations
- departments
- public contacts
- upcoming events linked via `organizationId`
- optional public member roster when enabled

This already creates a useful public presence for government offices, churches, nonprofits, schools, and businesses without introducing a general CMS problem.

### Recommended later sections

- featured links
- service areas / municipalities served
- recurring schedules or office hours
- announcement or pinned update areas
- related articles
- jobs or opportunities
- marketplace/store tie-ins where relevant

These should be additive sections on the same canonical organization page.

---

## Content Reuse Rule

Whenever possible, the organization page should aggregate existing Highlander content rather than duplicating it.

Examples:

- events should come from `Event.organizationId`
- future jobs/help-wanted relationships should point back to the organization
- future article relationships should allow organization-linked coverage or official posts
- future marketplace/store relationships can be surfaced if the organization is a business

The organization page should become a unifying public surface for related platform activity.

This is better than making managers re-enter the same information into a parallel "website" layer.

---

## Governance And Moderation

Custom domains and self-managed organization pages should preserve Highlander accountability rules.

Recommended rules:

- only approved organizations can publish public pages
- only approved organizations should be eligible for custom-domain attachment
- one or more accountable trusted people should remain attached to each managed organization
- domain attachment should require staff approval initially
- ownership claims should continue to be reviewable
- visible roster/contact publication should remain organization-level and field-level controlled

Domain mapping should not weaken moderation, auditability, or trust requirements.

---

## Phased Rollout

### Phase 1 — Canonical Public Organization Page

Goal:

- launch `/organizations/[slug]` as the canonical public page

Scope:

- approved-only public view
- render core organization data and existing structured child records
- link from `/directory` into the organization page
- support only Highlander-hosted access

Not yet included:

- self-claim flow
- organization-manager editing
- custom domains
- standalone shell

### Phase 1.5 — Management Foundations

Goal:

- let organizations maintain their public presence through accountable managers

Scope:

- richer organization edit surfaces
- claim/request-management workflow
- moderation review for major edits
- clearer publication controls for roster, contacts, locations, and departments

### Phase 2 — Domain-Ready Architecture

Goal:

- introduce domain-routing infrastructure without making it self-serve yet

Scope:

- add `OrganizationDomain`
- add host resolution logic for organization domains
- add `platform` and `standalone` shell support in the page renderer
- allow manual/admin-managed domain attachments for controlled rollout

### Phase 3 — Self-Serve Domain Mapping

Goal:

- let verified organization managers connect their own domains

Scope:

- DNS verification flow
- hostname validation
- SSL/provisioning state UI
- primary-domain and redirect controls
- support docs and admin review flow where needed

### Phase 4 — Lightweight Organization Site Features

Goal:

- expand the public organization page into a stronger standalone presence

Scope:

- presentation settings
- featured homepage sections
- stronger org-branded hero treatment
- optional navigation refinements for standalone org domains

This should remain a structured presence system, not a generic page-builder unless later evidence strongly justifies one.

---

## What To Avoid

- Do not treat `websiteUrl` as equivalent to a mapped custom domain.
- Do not build separate data models for directory profiles and organization websites.
- Do not merge community-domain tenancy and organization-domain routing into the same abstraction.
- Do not start with a general page-builder.
- Do not make marketplace store pages the master organization abstraction.

The store model may remain useful for commerce, but the organization page should be broader and more canonical.

---

## Current Decision Summary

- The directory remains a discovery layer, not the canonical organization page.
- `/organizations/[slug]` should become the canonical public organization route.
- Custom domains should resolve to the same underlying organization page, not a second website system.
- `Community`, `Organization`, and `OrganizationDomain` should remain distinct architectural layers.
- Domain management should use a dedicated related model, not a single `customDomain` field on `Organization`.
- Public organization pages should support both `platform` and `standalone` shell modes.
- The first public organization page should be structured and data-driven, not a page-builder.
- Existing org child models should power the initial presence system.
- Organization pages should aggregate related Highlander content whenever possible.
- Self-management and domain features should follow moderation/accountability rules rather than bypass them.
