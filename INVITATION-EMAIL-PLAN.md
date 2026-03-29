# Invitation And Outbound Email Plan

## Purpose

Define the first-pass invitation and outbound email system before implementation so trust onboarding can become lower-friction without weakening Highlander Today's accountability model.

This plan covers:

- member-to-member invitations by email
- outbound email provider direction
- quota-aware send queue behavior
- in-system vouch prompts triggered by accepted invitations
- schema, API, and UI expectations for the first rollout

## Product Intent

The trust system should not force a newly registered resident to leave the platform and awkwardly ask someone externally to vouch for them. The product should help existing trusted members recognize and sponsor people they actually know.

The invitation system is meant to:

- reduce onboarding friction
- keep trust relationships attributable inside the product
- prompt trusted members at the right time to vouch
- avoid treating email invitation itself as proof of identity

Invitation is evidence of prior relationship. It is not equivalent to trust.

## Core Principles

1. Registration remains open.
2. Invitation does not auto-promote a user to `TRUSTED`.
3. Vouching remains an explicit action by a `TRUSTED` user.
4. The system should support both immediate sends and queued sends when daily email quota is exhausted.
5. Queue overflow must defer, not drop, unsent invites.
6. Users should be told clearly whether invites were sent now or queued for later delivery.
7. Internal product notifications/messages should be used alongside email, not replaced by email.

## Recommended First-Phase Product Behavior

### Invitation Flow

1. A `TRUSTED` user enters one or more email addresses to invite.
2. The system creates invite records immediately for each address.
3. The system attempts to send invitation emails until the configured daily provider cap is reached.
4. Any remainder stays queued for the next send window.
5. If the invited person registers using the invited email address, the inviter receives an in-system message asking whether they want to vouch for that person.
6. The inviter may choose `Vouch now`, `Not now`, or ignore the prompt.

### Registration Matching

- Matching should be based on exact normalized email equality.
- A user who registers through an invitation link should still be matched against the invited email on record.
- If multiple trusted users invited the same email address, each matching inviter may receive a post-registration prompt.

### Trust Outcome

- Invitation alone does not change trust level.
- A successful explicit vouch still uses the existing vouching system.
- Existing trust limits, audit logging, and identity-lock rules remain in force.

## Outbound Email Provider Direction

### Cloudflare

Cloudflare Email Routing is useful for inbound routing/forwarding and address management, but not as the outbound mail sender. It should be treated as DNS/inbound support only.

### Free/Low-Cost First Option

The initial implementation should assume a provider with a free tier around `300 emails/day`, since current community scale does not justify more complexity yet.

Practical first option:

- `Brevo` for a first free-tier rollout if the free daily cap remains suitable

Reasoning:

- the expected community scale is small
- a hard daily limit is acceptable initially
- the app can enforce its own quota and queue overflow

Fallback/provider abstraction should remain possible so the project can move later to:

- `Resend` for easier developer ergonomics
- `Amazon SES` for lower long-term cost at scale

## Required System Behavior For Daily Send Limits

If a member submits more invites than the provider can send that day:

- create all invite records immediately
- send only up to the daily cap
- queue the remainder
- never silently drop excess invites
- surface partial-send results in the UI

Example:

- member submits `10` invites
- daily remaining capacity is `7`
- `7` are sent now
- `3` are stored and marked for later delivery

Expected user feedback:

- `7 invitations sent now`
- `3 invitations queued for the next delivery window`

## Proposed Data Model

### `Invite`

Represents the member relationship and acceptance lifecycle.

Suggested fields:

- `id`
- `inviterUserId`
- `invitedEmail`
- `token`
- `communityId`
- `message` optional personal note
- `status` (`PENDING`, `SENT`, `ACCEPTED`, `EXPIRED`, `CANCELLED`)
- `sentAt`
- `acceptedAt`
- `acceptedUserId` optional once registration occurs
- `expiresAt`
- `createdAt`
- `updatedAt`

Suggested constraints:

- index on `invitedEmail`
- index on `inviterUserId`
- unique guard for duplicate live invites as needed

### `OutboundEmail`

Represents actual delivery attempts and queue state.

Suggested fields:

- `id`
- `type` (`INVITATION`, later reusable for other transactional email)
- `inviteId` optional relation
- `toEmail`
- `subject`
- `provider`
- `providerMessageId` optional
- `status` (`QUEUED`, `SENT`, `FAILED`, `DEFERRED`, `CANCELLED`)
- `attemptCount`
- `lastAttemptAt`
- `scheduledFor`
- `sentAt`
- `failureReason` optional
- `createdAt`
- `updatedAt`

Design note:

- `Invite` and `OutboundEmail` should remain separate so product state is not coupled to delivery state.

## Notification And Messaging Behavior

When an invited email registers:

- find matching active invites by normalized email
- mark those invites accepted
- attach the newly created `acceptedUserId`
- send an internal message or notification to each trusted inviter

Prompt copy should be direct:

- `This person you invited has joined Highlander Today. Do you know them well enough to vouch for them?`

Actions:

- `Vouch now`
- `Not now`
- ignore

This should reuse existing internal messaging where possible before inventing a separate notification system.

## Abuse Prevention And Guardrails

Initial rollout should include:

- only `TRUSTED` users may send invites
- per-user daily and rolling invite caps
- duplicate invite suppression for the same email
- resend cooldowns
- audit logging for invite creation, send, cancel, accept, and vouch-from-invite actions
- queue processing that respects configured global provider limits

Future options:

- allow users to block further invites to their email
- moderator/admin visibility into invite abuse patterns
- domain-level suppressions or hard bounces

## UX Expectations

### Sender Experience

The sender should see:

- which invites were sent immediately
- which invites were queued
- which invites were already pending
- whether an invited person later registered
- whether the invite expired or failed

### Recipient Experience

The recipient email should contain:

- who invited them
- the community/site name
- a clear CTA to join or register
- a plain explanation that joining does not automatically grant trusted status

### Post-Registration Experience

The newly registered user should not be told they are already trusted merely because they came through an invite. The product can explain that a trusted member who knows them may now vouch for them.

## API And Background Work Expectations

### Likely API Surface

- create invites
- list current user's invites
- cancel queued/pending invites
- accept invite token / inspect invite token
- process send queue
- handle provider webhook events later if needed

### Queue Processing

The system needs a scheduled send worker or cron-style job that:

- checks configured daily usage
- sends queued emails until quota is exhausted
- marks overflow as still queued for the next window
- retries failures with bounded retry logic

The first rollout can be simple. It does not need a complex job system if a straightforward scheduled task is enough.

## Rollout Recommendation

### Phase 1

- choose first outbound provider
- add invite and outbound-email tables
- allow trusted users to create invites
- send invitation emails within a configured daily cap
- queue overflow
- mark invites accepted on matching registration
- send internal post-registration vouch prompts to inviters

### Phase 2

- add sender-facing invite management UI
- add retry/cancel controls
- add admin reporting for invite volume, queue state, and failures

### Phase 3

- consider provider abstraction improvements
- add richer notification surfaces
- consider shared recognition when multiple trusted users invited the same address

## Open Decisions

- whether to start with `Brevo` or another provider
- whether one vouch remains sufficient after invitation or whether invited users should still need the same standard threshold
- how long invites remain valid before expiration
- whether multiple inviters for the same email should all receive the same prompt or whether one should be prioritized
- whether invite sending should live in profile settings, directory, or a dedicated trust/invite surface

## Implementation Guidance

- keep invitation state separate from outbound email delivery state
- do not auto-trust on invite acceptance
- prefer reusing the existing in-system messaging infrastructure for post-registration prompts
- keep provider-specific code behind a thin mailer abstraction from the start
- make quota limits configurable in environment variables rather than hardcoding them

## Summary

The recommended first implementation is a quota-aware invitation system where `TRUSTED` members can invite people by email, the app sends as many invites as the daily provider cap allows, queues the rest automatically, and prompts inviters in-system to vouch once those invitees register. This lowers onboarding friction without collapsing the existing trust model.

## Decision Note: Email Is Not The Primary Trust Bootstrap

Session conclusion after wiring Brevo and testing a live send:

- outbound email is technically working
- Brevo accepted and delivered the test send
- the first real test landed in Gmail spam rather than inbox
- this reinforces that email deliverability should not be treated as the primary bootstrap path for the trust system

Implications for product direction:

- do not depend on email invites as the main way new members become known and vouched
- use email as optional supporting infrastructure only
- prioritize in-product trust mechanisms that do not require mailbox-provider cooperation

Recommended trust-first alternatives:

- visible opt-in `new member` / `seeking verification` presence
- in-system vouch requests sent from registered users to known trusted users
- trusted-user review/discovery surfaces inside the app

Reasoning:

- Highlander Today's likely early audience is small-community and older-skewing
- asking users to retrieve onboarding emails from spam is not acceptable as a core flow
- the product should not rely on external mailbox reputation systems to make local trust formation possible
