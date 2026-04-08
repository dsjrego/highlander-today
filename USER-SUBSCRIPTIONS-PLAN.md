# Highlander Today — User Subscriptions Plan

> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define how future paid memberships/subscriptions should fit into Highlander without overloading existing user/community/organization membership tables.

---

## Core Rule

Treat subscriptions as a dedicated billing/entitlements subsystem, not as extra columns bolted onto:

- `User`
- `UserCommunityMembership`
- `OrganizationMembership`

Those existing tables describe identity, trust, role, and organizational relationship.

Subscriptions should describe:

- what a user is paying for
- what plan/tier they are on
- when access starts and ends
- provider lifecycle state
- billing and payment history
- platform entitlements derived from the subscription

These are different concerns and should stay structurally separate.

---

## Current Repo Reality

The current schema already gives a good ownership/identity foundation:

- `User` is the person/account record
- `UserCommunityMembership` is the person’s role inside a community
- `OrganizationMembership` is the person’s relationship to an organization
- `StoreMember` is the person’s relationship to a store

None of those models currently represent billing, renewal, invoices, or plan lifecycle.

That is good. It means subscription work can be added cleanly as a new subsystem rather than trying to unwind mixed concerns later.

---

## Recommended Separation Of Concerns

Keep these responsibilities distinct:

### Identity and participation

Handled by existing membership/role tables:

- who the user is
- what community they belong to
- what trust level they have
- what organization/store roles they hold

### Billing and paid access

Handled by future subscription tables:

- whether the user has an active paid plan
- what tier they purchased
- what billing provider subscription it maps to
- whether renewal failed, paused, canceled, or expired
- what entitlements are active because of that subscription

### Authorization

Application code should derive paid access from active subscription/entitlement state, not by mutating role tables into pseudo-billing records.

Example:

- a user might remain a normal community member even after their paid subscription lapses
- a user might remain an organization member without continuing a paid supporter subscription

---

## Recommended Model Direction

Exact names can change, but the shape should stay roughly like this.

### `SubscriptionPlan`

Represents a product/tier the platform sells.

Suggested fields:

- `id`
- `communityId` or `null` for platform-wide plans
- `code`
- `name`
- `description`
- `planType`
- `billingInterval`
- `priceCents`
- `currency`
- `isActive`
- `createdAt`
- `updatedAt`

Example future uses:

- Highlander supporter membership
- organization premium tools
- creator monetization plan
- community-specific paid membership tiers

### `UserSubscription`

Represents one user’s subscription to one plan.

Suggested fields:

- `id`
- `userId`
- `communityId`
- `planId`
- `status`
- `provider`
- `providerCustomerId`
- `providerSubscriptionId`
- `startedAt`
- `currentPeriodStartsAt`
- `currentPeriodEndsAt`
- `canceledAt`
- `endsAt`
- `trialEndsAt`
- `createdAt`
- `updatedAt`

Important note:

- do not collapse provider state into a boolean like `isSubscribed`
- keep real lifecycle timestamps and status values

### `SubscriptionEntitlement`

Represents the feature access unlocked by a plan or subscription.

Suggested fields:

- `id`
- `subscriptionId`
- `key`
- `value` or structured config
- `startsAt`
- `endsAt`
- `createdAt`

Use this when paid access goes beyond a single on/off flag.

Examples:

- supporter badge
- premium organization tools
- extra form limits
- priority placement
- creator monetization enabled

### `SubscriptionPaymentEvent` or provider ledger model

Represents billing history/audit records from the payment provider.

Suggested fields:

- `id`
- `subscriptionId`
- `provider`
- `providerEventId`
- `eventType`
- `amountCents`
- `currency`
- `status`
- `occurredAt`
- `payload`

This supports auditability, support, and reconciliation without stuffing provider JSON into unrelated records.

---

## Status Direction

Subscription status should be separate from community or organization membership status.

Recommended starter statuses:

- `INCOMPLETE`
- `TRIALING`
- `ACTIVE`
- `PAST_DUE`
- `CANCELED`
- `EXPIRED`
- `PAUSED`

Do not reuse:

- `OrganizationMembershipStatus`
- `TrustLevel`
- community role enums

Those mean different things.

---

## Scope Direction

The first paid subscription work should probably support only one of these cleanly, not all at once:

1. community supporter memberships
2. organization premium features
3. creator monetization/subscriber support

The architecture should allow all three later, but implementation should start with one focused product loop.

---

## Likely First Product Fit

Given the current codebase, the cleanest first fit is probably:

- a Highlander supporter membership at the community/platform layer

Why:

- it attaches naturally to `User`
- it does not require organization ownership logic first
- it avoids coupling the first billing system to organization management before organization self-service is fully built
- it aligns with the existing donations/memberships direction in `CAPITAL-PLAN.md` and `MONETIZATION-PLAN.md`

Organization-paid tooling can still come later using the same subscription subsystem.

---

## Organization Relationship Rule

If an organization eventually pays for tools:

- do not overload `OrganizationMembership` with billing fields
- create organization-level subscription records
- let organization memberships control who can administer that organization’s subscription and paid features

That means:

- membership controls permission
- subscription controls paid access

They are related, but not the same record.

---

## Audit And Support Rule

Every subscription change should be traceable.

Future implementation should log:

- who initiated a subscription action when actor identity is known
- what changed
- old/new status
- provider event IDs
- timestamps

The current `activity_logs` infrastructure can likely store some of this, but provider event history should still have dedicated billing records too.

---

## Explicit Non-Goals For The Existing Membership Tables

Do **not** add fields like these directly onto `UserCommunityMembership` or `OrganizationMembership` unless they are later proven to be purely derived cache fields:

- `subscriptionStatus`
- `billingProviderId`
- `renewalDate`
- `priceCents`
- `planName`
- `paymentFailedAt`

That path will mix identity/role relationships with billing lifecycle and create cleanup problems later.

---

## Recommended Next Step

When the team is ready to implement paid memberships/subscriptions:

1. choose the first product loop
2. choose the provider direction
3. define the first plan and entitlement model
4. add dedicated Prisma models for plans, subscriptions, and payment history
5. wire access checks through entitlements rather than role tables

Until then, this document should be the canonical reference so future planning stays structurally consistent.
