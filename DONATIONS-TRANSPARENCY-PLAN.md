# Donations and Transparency Plan

> Status: proposed
> Date: 2026-03-20
> Scope: product/implementation planning only; no code has been shipped yet

## Recommended Provider

The recommended third-party payment provider for Highlander Today is `Stripe`.

### Why Stripe is the preferred choice

- it is the strongest long-term fit for a platform that wants donations now but may also add service revenue, sponsorships, or other inbound payment flows later
- it allows Highlander Today to keep the public funding/transparency experience on its own site instead of outsourcing the product narrative to a fundraising platform
- it supports a low-friction launch path through hosted payment links or hosted checkout
- it has a mature webhook model for automation once manual entry is no longer sufficient
- it minimizes platform lock-in compared with donation-specific platforms

### Recommended launch posture with Stripe

1. Start with Stripe-hosted donation collection using Payment Links or Checkout.
2. Record successful donations locally as `FundingTransaction` records.
3. Apply the active allocation policy into `FundingAllocation` rows for the three public funds.
4. Show public donor names or `Anonymous` based on the local display preference stored by Highlander Today.
5. Add recurring support and richer automation only after the basic transparency workflow is stable.

### Why GoFundMe is not the primary recommendation

- GoFundMe is better suited to running a fundraiser on GoFundMe's platform than to serving as the payment backbone for Highlander Today's own transparency and reporting system
- it offers less product/control alignment for a platform that wants donations plus first-party public accounting and future non-donation revenue tracking
- even where fees are competitive, the strategic fit is weaker because the donor experience and public fundraising narrative live more on the third-party platform than on Highlander Today

### Why Givebutter is not the primary recommendation

- Givebutter is a stronger alternative than GoFundMe if the immediate goal is the fastest possible donation-specific launch with built-in fundraising UX
- however, it is still optimized around fundraising as a product category rather than acting as a general payment foundation for Highlander Today's broader future model
- it remains a reasonable fallback option if time-to-launch is more important than long-term architectural fit

## Purpose

This feature is not just a donation button. It is a public transparency layer for platform funding so Highlander Today can be presented as accountable local infrastructure rather than an opaque private service.

The initial goal is to:

- accept donations through a third-party provider
- record donations locally for reporting
- allow public or anonymous donor display
- track expenditures at a category level
- show clear public summaries of money received and money spent

The first version should optimize for operational simplicity, public clarity, and trust. It should avoid pretending to be a full accounting system.

## Product Framing

The public story should be:

- Highlander Today is supported by the community and by future earned revenue
- money is reported publicly at an aggregated level
- donors may choose to be publicly named or remain anonymous
- expenditures are shown by category to make platform stewardship legible

The feature should avoid implying:

- charitable tax deductibility unless the legal structure supports it
- transaction-level public accounting for every payment
- permanent fixed allocation percentages unless the business is committed to them long term

## Recommended MVP

### Public pages

1. `Support Highlander Today`
   - explains why donations are being requested
   - links to the third-party donation flow
   - explains that donations support platform operations, growth, and future staffing

2. `Transparency`
   - total donations received
   - total expenditures recorded
   - current net balance
   - fund balances
   - recent public donations
   - monthly expenditures by category
   - simple explanation of what is and is not included

### Admin surfaces

1. Donation management
   - record donation manually or via webhook sync
   - donor display name
   - anonymous/public toggle
   - amount
   - received date
   - external provider and transaction id
   - message or note
   - status

2. Expenditure management
   - amount
   - expenditure category
   - optional linked fund
   - public description
   - internal notes
   - spent date
   - optional attachment/receipt metadata later

3. Funding policy management
   - default allocation percentages across funds
   - effective date range for policy changes
   - admin-visible note explaining why the allocation changed

## Fund Structure

The initial public fund buckets should be:

- `COMMUNITY_SUPPORT`
- `GROWTH_FUND`
- `TEAM_SUPPORT`

Example initial allocation policy:

- 34% to `COMMUNITY_SUPPORT`
- 33% to `GROWTH_FUND`
- 33% to `TEAM_SUPPORT`

This should be stored as a policy, not hardcoded into product copy. The system should support changing the policy later without rewriting historical allocations.

## Recommended Data Model

These names are intentionally Prisma-friendly and consistent with the current codebase style.

### Core enums

- `FundingSourceType`
  - `DONATION`
  - `SERVICE_REVENUE`
  - `SPONSORSHIP`
  - `GRANT`
  - `OTHER`

- `DonationStatus`
  - `PENDING`
  - `SUCCEEDED`
  - `FAILED`
  - `REFUNDED`
  - `CANCELED`

- `FundType`
  - `COMMUNITY_SUPPORT`
  - `GROWTH_FUND`
  - `TEAM_SUPPORT`

- `ExpenditureCategory`
  - `STAFF_PAY`
  - `MARKETING`
  - `HOSTING_INFRASTRUCTURE`
  - `SOFTWARE_TOOLS`
  - `COMMUNITY_OPERATIONS`
  - `LEGAL_ACCOUNTING`
  - `CONTRACTORS`
  - `OTHER`

### Suggested models

#### `FundingTransaction`

Represents inbound money, whether from donations now or service revenue later.

- `id`
- `communityId` nullable
- `sourceType`
- `provider` nullable
- `externalTransactionId` nullable
- `grossAmountCents`
- `feeAmountCents` nullable
- `netAmountCents` nullable
- `currencyCode`
- `status`
- `displayName` nullable
- `isAnonymous`
- `publicMessage` nullable
- `internalNote` nullable
- `receivedAt`
- `createdByUserId` nullable
- `createdAt`
- `updatedAt`

#### `FundingAllocation`

Stores how a funding transaction is split among funds.

- `id`
- `fundingTransactionId`
- `fundType`
- `amountCents`
- `allocationPolicyId` nullable

#### `AllocationPolicy`

Stores the default split in effect at a point in time.

- `id`
- `name`
- `communitySupportBps`
- `growthFundBps`
- `teamSupportBps`
- `isActive`
- `effectiveStartsAt`
- `effectiveEndsAt` nullable
- `note` nullable
- `createdByUserId`
- `createdAt`

Use basis points rather than floats so percentages remain exact.

#### `ExpenditureRecord`

- `id`
- `communityId` nullable
- `fundType` nullable
- `category`
- `amountCents`
- `currencyCode`
- `publicDescription`
- `internalNote` nullable
- `spentAt`
- `createdByUserId`
- `createdAt`
- `updatedAt`

#### Optional later model: `FinancialAttachment`

Do not ship this in MVP unless receipts are required immediately.

## Reporting Rules

The public reporting layer should show aggregates, not raw accounting detail.

### Publicly visible

- total funds received
- total funds spent
- current net balance
- balance by fund
- recent donations with anonymous handling
- expenditures by category
- monthly rollups

### Admin-only

- provider ids
- internal notes
- exact fee details if needed
- donor email or other processor metadata
- receipts or attachments

### Privacy rule

Anonymous means anonymous to the public, not to authorized admins handling records.

## Third-Party Donation Flow

Recommended first approach:

1. Use Stripe as the third-party donation processor.
2. Link to it from the public support page.
3. Record donations locally.
4. Add webhook automation when operationally ready.

### Integration order

1. Manual entry fallback
   - fastest path to launch
   - acceptable if donation volume is low

2. Webhook sync
   - best medium-term path
   - reduces reconciliation work

3. Admin reconciliation tools
   - needed only if volume or refund complexity increases

The local system should be designed so manual entry and webhook entry both create the same `FundingTransaction` shape.

## Community and Multi-Tenant Rules

The transparency model should work for both:

- home-community public support
- future earned revenue from other communities

Recommended rule:

- allow `communityId` to be nullable on financial records
- use nullable for platform-wide/shared money
- use a specific `communityId` when a transaction or expense clearly belongs to one tenant

This supports future public reporting such as:

- platform-wide totals
- founding-community support
- other-community service revenue

without forcing all accounting into a community bucket too early.

## UI and Messaging Guidance

### Public copy should emphasize

- community support
- stewardship
- transparency
- visible categories of use

### Public copy should avoid

- overpromising exact allocation permanence
- legal/tax statements without review
- guilt-based fundraising language

### Good public framing

"Support the platform and see how funds are used."

This is stronger than a generic donation ask because it aligns with the broader trust model.

## Launch Recommendation

Donation support should not be treated as a hard requirement for initial launch readiness.

Recommended position:

- do not block launch on donations/transparency
- do not ship a donation ask before the platform shows real local value and visible activity
- prepare the data model and product plan now
- introduce donations once the home community can reasonably understand what they are supporting

Reasoning:

- asking for money before the core local loops feel real weakens credibility
- the launch priority should remain dense local usage and visible participation
- transparency works best when there is something concrete to fund and report

Practical threshold for enabling donation support:

- the home community has visible activity across at least a few core surfaces
- the product already looks maintained and operational
- there is a clear support page explaining what donations fund
- there is at least a basic public transparency page ready at launch of the donation ask

## Suggested Delivery Phases

### Phase 1: planning and schema

- add Prisma enums/models
- define admin permissions
- add activity logging for financial record creation/update
- decide provider and legal/public copy constraints

### Phase 2: internal-only finance management

- admin CRUD for donations
- admin CRUD for expenditures
- fund allocation policy support
- internal summary calculations

### Phase 3: public transparency

- support page
- transparency page
- public donor list with anonymous handling
- monthly category summaries

### Phase 4: automation

- webhook ingestion from provider
- duplicate protection using provider transaction ids
- refund/correction handling

### Phase 5: broader finance visibility

- earned revenue support
- per-community breakdowns
- downloadable public summaries

## Open Questions

- Which third-party provider should be used first?
- Should donations initially be platform-wide only, or attributable to the founding community?
- Should processor fees be shown publicly or only net received?
- Should the public dashboard show current balance, or only raised/spent totals?
- Will staff pay and contractor pay be one category or two?

## Recommendation Summary

Proceed with planning now, but do not force donation support into the first public launch unless the platform already has enough real usage that a donation ask feels earned.

When it ships, the first version should be:

- third-party donation processing
- simple internal financial records
- three-fund allocation policy
- public aggregate transparency
- anonymous donor support

That is enough to be credible without overbuilding.
