# Highlander Today — Organization Inbox And CRM Plan

> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define a separate organization-facing messaging and contact-history system for businesses, government offices, churches, schools, nonprofits, and other organizations without overloading the existing peer-to-peer direct-message model.

---

## Product Intent

Organizations need a communication system that behaves like accountable local service infrastructure, not like private person-to-person chat.

That means:

- an outside user should be able to message an organization
- the message should enter a shared organizational inbox
- access should be based on durable organization mailboxes/roles rather than one specific staff member
- history should remain with the organization if a staff member leaves
- authorized members should be able to see organization-scoped communication history for the person contacting them

This should be treated as a second message domain, not an extension of the existing private messaging system.

---

## Core Architectural Rule

Do not glue organization inbox behavior onto the current user-to-user conversation tables.

The current direct-message system is built around:

- one person messaging another person
- a small participant set
- one "other participant" display assumption
- person-level block and access logic

Organization communication has different semantics:

- shared mailbox access
- role continuity when staff changes
- assignment without ownership transfer
- organization-side workflow state
- organization-scoped contact history
- future structured service records such as billing and payments

These should live in a dedicated subsystem with its own models, APIs, and admin UI.

---

## Product Model

The system should be understood as four connected layers:

1. `Organization`
   The entity receiving and managing communication.

2. `OrganizationMailbox`
   A durable role-based inbox inside the organization such as `General`, `Admissions`, `Permits`, `Support`, `Office`, or `Pastor`.

3. `OrganizationInboxThread`
   A conversation or case associated with one mailbox and one outside contact/person.

4. `OrganizationContactProfile`
   The organization-scoped relationship/history record for a person who has communicated with that organization.

This creates two primary staff views:

- `Inbox view`
  For triage, assignment, open/closed handling, and replies.

- `Contact history view`
  For reviewing the full history of a person’s communication with that organization across threads and later structured records.

---

## Why Role-Based Mailboxes Matter

Mailbox access should belong to a role/inbox, not to a single person.

Example:

- A borough has a `General Office` mailbox.
- Today, Alice handles it.
- Alice leaves.
- Bob is assigned to that mailbox.
- Bob immediately sees the mailbox history because the history belongs to the mailbox and organization, not Alice.

This avoids:

- orphaned conversations
- staff-specific silos
- manual thread transfer work
- loss of institutional memory

Mailbox access and thread assignment should be distinct concepts.

- `Mailbox access` controls who may read and reply in that mailbox.
- `Thread assignment` indicates who is currently handling a thread.

Access is durable. Assignment is operational.

---

## Recommended MVP Scope

The first implementation should support:

- user-to-organization messaging from public surfaces
- one default mailbox per organization: `General`
- optional additional mailboxes created by org admins
- role-based mailbox access for org members
- thread list and thread detail inside `/admin/organizations/[id]`
- organization-side replies
- thread status: `OPEN`, `CLOSED`
- optional assignee per thread
- org-scoped contact history for the outside person
- internal notes
- basic tags/case types

The MVP should not yet include:

- automation rules
- SLAs/escalation timers
- email sync or external mailboxes
- canned responses
- payment processing
- complex reporting dashboards
- cross-organization shared CRM records

---

## Future-Aware Constraint: Payments

There is no payment subsystem today, but this design should leave room for one.

That means the CRM/contact-history system should not assume that all customer records are "just messages."

It should be able to grow into a timeline that includes:

- inbox threads
- internal notes
- complaints
- membership/customer service requests
- billing records
- payment records
- refunds or disputes

The correct boundary is:

- messaging/inbox records are one class of interaction
- payments and billing should later be separate structured record types linked to the same organization-scoped contact profile

Do not model future payments as freeform messages.

---

## Recommended Data Model Direction

### `OrganizationMailbox`

A durable inbox/role within an organization.

Suggested fields:

- `id`
- `organizationId`
- `name`
- `slug`
- `description`
- `isDefault`
- `isPublic`
- `sortOrder`
- `createdAt`
- `updatedAt`

Purpose:

- represents a role or inbox, not a person
- can optionally be exposed publicly later
- supports continuity when membership changes

### `OrganizationMailboxMembership`

Maps active organization members to mailbox access.

Suggested fields:

- `id`
- `mailboxId`
- `organizationMembershipId`
- `accessLevel`
- `createdAt`
- `updatedAt`

Recommended access levels:

- `VIEWER`
- `RESPONDER`
- `MANAGER`

Purpose:

- controls who can see/respond/manage the mailbox
- keeps access tied to org membership, not arbitrary user IDs

### `OrganizationContactProfile`

One per organization-person relationship.

Suggested fields:

- `id`
- `organizationId`
- `userId`
- `displayNameSnapshot`
- `emailSnapshot`
- `phoneSnapshot`
- `status`
- `tags`
- `lastContactAt`
- `createdAt`
- `updatedAt`

Purpose:

- becomes the organization-scoped CRM/contact record
- owns cross-thread history for that person within the organization
- later becomes the anchor for structured billing/payment/service data

Important rule:

- this is organization-scoped, not global across the whole platform

### `OrganizationInboxThread`

The conversation/case record.

Suggested fields:

- `id`
- `organizationId`
- `mailboxId`
- `contactProfileId`
- `subject`
- `status`
- `priority`
- `caseType`
- `assignedOrganizationMembershipId`
- `openedByUserId`
- `lastMessageAt`
- `lastExternalMessageAt`
- `lastInternalMessageAt`
- `closedAt`
- `closedByUserId`
- `createdAt`
- `updatedAt`

Recommended starter enums:

- `status`: `OPEN`, `CLOSED`
- `priority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`

Purpose:

- supports inbox triage and operational handling
- separates workflow state from individual messages

### `OrganizationInboxMessage`

Visible messages within a thread.

Suggested fields:

- `id`
- `threadId`
- `authorUserId`
- `authorOrganizationMembershipId` nullable
- `direction`
- `body`
- `createdAt`
- `updatedAt`

Recommended direction values:

- `INBOUND`
- `OUTBOUND`

Purpose:

- captures user-originated and organization-originated messages
- lets the organization reply as the organization while still retaining internal authorship/audit data

### `OrganizationInboxInternalNote`

Staff-only notes on a thread or contact profile.

Suggested fields:

- `id`
- `organizationId`
- `threadId` nullable
- `contactProfileId` nullable
- `authorOrganizationMembershipId`
- `body`
- `createdAt`
- `updatedAt`

Purpose:

- preserves internal context without exposing it to the outside user

### Optional Later: `OrganizationContactTimelineEvent`

Not required in MVP, but likely useful later if the CRM expands.

This would unify timeline items such as:

- inbox thread opened
- note added
- complaint logged
- payment recorded
- refund issued

Do not build this first unless the initial implementation needs it.

---

## Example Prisma Direction

This is illustrative, not final:

```prisma
model OrganizationMailbox {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  name           String
  slug           String
  description    String?
  isDefault      Boolean  @default(false)
  isPublic       Boolean  @default(false)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  memberships  OrganizationMailboxMembership[]
  threads      OrganizationInboxThread[]

  @@unique([organizationId, slug])
  @@index([organizationId])
}

model OrganizationMailboxMembership {
  id                       String   @id @default(uuid()) @db.Uuid
  mailboxId                String   @db.Uuid
  organizationMembershipId String   @db.Uuid
  accessLevel              String
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  mailbox                OrganizationMailbox    @relation(fields: [mailboxId], references: [id], onDelete: Cascade)
  organizationMembership OrganizationMembership @relation(fields: [organizationMembershipId], references: [id], onDelete: Cascade)

  @@unique([mailboxId, organizationMembershipId])
  @@index([organizationMembershipId])
}

model OrganizationContactProfile {
  id                  String   @id @default(uuid()) @db.Uuid
  organizationId      String   @db.Uuid
  userId              String   @db.Uuid
  displayNameSnapshot String?
  emailSnapshot       String?
  phoneSnapshot       String?
  status              String?
  tags                String[]
  lastContactAt       DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  threads      OrganizationInboxThread[]

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

model OrganizationInboxThread {
  id                             String   @id @default(uuid()) @db.Uuid
  organizationId                 String   @db.Uuid
  mailboxId                      String   @db.Uuid
  contactProfileId               String   @db.Uuid
  openedByUserId                 String   @db.Uuid
  assignedOrganizationMembershipId String? @db.Uuid
  subject                        String?
  status                         String
  priority                       String?
  caseType                       String?
  lastMessageAt                  DateTime?
  lastExternalMessageAt          DateTime?
  lastInternalMessageAt          DateTime?
  closedAt                       DateTime?
  closedByUserId                 String?  @db.Uuid
  createdAt                      DateTime @default(now())
  updatedAt                      DateTime @updatedAt

  organization Organization             @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  mailbox      OrganizationMailbox      @relation(fields: [mailboxId], references: [id], onDelete: Cascade)
  contact      OrganizationContactProfile @relation(fields: [contactProfileId], references: [id], onDelete: Cascade)
  openedBy     User                     @relation("organizationThreadOpenedBy", fields: [openedByUserId], references: [id], onDelete: Cascade)
  assignedTo   OrganizationMembership?  @relation("organizationThreadAssignee", fields: [assignedOrganizationMembershipId], references: [id], onDelete: SetNull)
  messages     OrganizationInboxMessage[]
  notes        OrganizationInboxInternalNote[]

  @@index([organizationId, status])
  @@index([mailboxId, status])
  @@index([contactProfileId])
}

model OrganizationInboxMessage {
  id                           String   @id @default(uuid()) @db.Uuid
  threadId                     String   @db.Uuid
  authorUserId                 String   @db.Uuid
  authorOrganizationMembershipId String? @db.Uuid
  direction                    String
  body                         String
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt

  thread   OrganizationInboxThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  author   User                    @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  authorMembership OrganizationMembership? @relation(fields: [authorOrganizationMembershipId], references: [id], onDelete: SetNull)

  @@index([threadId, createdAt])
}
```

---

## Public Entry Points

Recommended public entry points:

- directory organization rows
- public organization page `/organizations/[slug]`

User flow:

1. Signed-in user clicks `Message Organization`.
2. User writes a message.
3. System creates or reuses the organization contact profile.
4. System creates a new thread in the organization’s default public mailbox unless a specific public mailbox was chosen.
5. Organization staff handle the thread from org admin inbox surfaces.

Important launch rule:

- require authentication for sending organization messages

This preserves accountability and avoids building anonymous abuse handling into v1.

---

## Admin Surfaces

### `/admin/organizations/[id]`

Add new tabs over time:

- `Inbox`
- `Mailboxes`
- `Contacts`

Recommended MVP sequence:

1. `Inbox`
   - thread list
   - filters by mailbox/status/assignee
   - thread detail and reply

2. `Contacts`
   - organization-scoped people list
   - contact detail showing prior threads and notes

3. `Mailboxes`
   - create/edit mailboxes
   - manage mailbox membership/access

### Inbox View

Must support:

- thread subject/contact
- mailbox
- latest message preview
- open/closed state
- assignee
- unread indicator
- reply
- add internal note

### Contact View

Must support:

- person identity
- tags / case type markers
- all prior threads with the organization
- internal notes
- future extensibility for billing/payment history

---

## Permissions

Recommended baseline:

- outside users need ordinary messaging permission plus authentication
- organization inbox access should be limited to active organization members who have mailbox membership
- mailbox management should be limited to higher organization roles such as `OWNER`, `MANAGER`, and possibly `ADMINISTRATOR`

Recommended authority split:

- `OWNER` / `MANAGER`
  Can create mailboxes, manage mailbox membership, assign threads, close/reopen threads.

- `RESPONDER`
  Can view mailbox threads and reply.

- `VIEWER`
  Can read but not reply.

The implementation should not assume every organization member automatically gets inbox access.

---

## Identity And Presentation Rules

To the outside user, the conversation should be with the organization.

Recommended UI language:

- thread appears as communication with `Organization Name`
- replies may optionally include a secondary attribution such as `Replied by Jane Doe from Organization Name`

Internally, the system should still store the authoring organization membership for auditability.

Do not collapse external identity and internal authorship into the same thing.

---

## Contact History Rules

The contact-history surface should be organization-scoped.

That means:

- Organization A can see a person’s history with Organization A
- Organization B should not automatically see that same history
- platform admins may later get broader access, but ordinary organization staff should not

This protects privacy boundaries while still giving each organization operational continuity.

---

## Thread Workflow Rules

Recommended MVP workflow:

- new thread enters a mailbox as `OPEN`
- optionally assign to one organization member
- any mailbox responder can reply
- close when resolved
- reopen if either side replies after closure, or require explicit reopen depending on final UX choice

Questions still to confirm before implementation:

1. Should users be able to reopen a closed thread automatically by sending another message?
2. Should multiple mailbox responders be able to reply without assignment?
3. Should mailbox access imply access to all historical threads in that mailbox?
4. Should thread assignment be required or optional?

Recommended defaults:

- yes, any responder can reply
- yes, mailbox access includes mailbox history
- assignment is optional

---

## Relationship To Existing Direct Messages

Preserve the current direct-message system for:

- person-to-person messaging
- profile messaging
- trust bootstrap and vouch flows
- admin messaging to individual users

Use the new organization inbox domain for:

- person-to-organization communication
- organization service requests
- business/government/general office messaging
- organization-side customer/member communication history

These systems may coexist in the product, but should not share the same conversation tables.

---

## Recommended Delivery Phases

### Phase 1 — Foundations

- add mailbox, mailbox-membership, contact-profile, thread, message, and note models
- create one default `General` mailbox for each organization
- seed mailbox access for owner/manager-level org members

### Phase 2 — Public Messaging Entry

- add `Message Organization` actions on directory organization rows and organization profile pages
- create inbound threads in the default public mailbox

### Phase 3 — Admin Inbox MVP

- add `/admin/organizations/[id]` inbox tab
- thread list
- thread detail
- reply
- close/reopen
- assign

### Phase 4 — Contact History MVP

- add organization-scoped contacts view
- show all prior inbox threads and internal notes for that person within that organization

### Phase 5 — Mailbox Management

- create/edit additional mailboxes
- assign mailbox membership and access levels
- expose optional public mailbox routing later if justified

### Phase 6 — CRM Expansion

- case types
- better tagging
- reporting
- timeline events
- structured billing/payment/service records

---

## Open Questions

These should be locked before implementation starts:

1. Which organization roles should automatically get initial mailbox access?
2. Should `ADMINISTRATOR` be treated like `MANAGER` for inbox-management purposes?
3. Should the outside user ever choose a mailbox publicly, or should launch always route to `General`?
4. Should outbound replies show only the organization name, or organization name plus responding staff member?
5. Should closed threads reopen automatically when the user replies?
6. Should contact profiles support non-user contacts later, or only registered users at first?
7. Should internal notes live only on threads at first, or also directly on contact profiles in MVP?

---

## Recommendation Summary

Build this as a separate organization inbox and CRM subsystem.

Start with:

- shared role-based mailboxes
- organization-scoped contact profiles
- inbox threads and messages
- internal notes
- assignment
- open/closed workflow

Keep future payments in mind by ensuring that contact history can later hold structured billing/payment records linked to the same organization-scoped contact profile rather than treating them as freeform messages.
