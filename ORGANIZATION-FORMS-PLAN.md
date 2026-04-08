# Highlander Today — Organization Forms Plan

> **Status:** Product and architecture planning only. Not implemented.
> **Purpose:** Define an organization-linked form system that lets organizations build structured questionnaires, share them by link, require authenticated member-level access, collect responses, and review collated results without weakening the platform's trust and accountability model.

---

## Product Intent

Organizations need a way to gather structured input from community members without pushing the interaction off-platform to third-party form tools.

Examples:

- a church collecting volunteer interest
- a nonprofit taking program intake requests
- a borough gathering feedback on a project
- a school collecting sign-up preferences
- a civic group running a simple RSVP or preference survey

The system should support:

- organization-owned forms
- configurable questions
- question types for text entry, radio/select-one, and checkbox/select-many
- ordered question layout with drag-and-drop management
- shareable public links
- response access gated to signed-in users at `REGISTERED` or `TRUSTED` level
- stored answers tied to the responding user
- simple results collation for organization review

This should begin as a structured local-input tool, not as a general-purpose enterprise forms platform.

---

## Core Architectural Rule

Treat forms as a dedicated organization subsystem, not as ad hoc JSON blobs attached directly to `Organization`.

That means:

- a form is its own first-class record
- questions are first-class child records
- choice options are first-class child records
- submissions are first-class response records
- per-question answers are structured child records of a submission

Do not store the whole thing as one serialized object on the organization row.

The organization already acts as the ownership boundary. The form system should hang cleanly off that boundary with its own models, APIs, and management UI.

---

## Current Repo Fit

Relevant existing foundations:

- `Organization` and `OrganizationMembership` already provide the ownership boundary in [prisma/schema.prisma](/Users/dennisdestjeor/work/highlander-today/prisma/schema.prisma#L243)
- the organization management surface already exists at [src/app/admin/organizations/[id]/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/organizations/[id]/page.tsx#L1)
- the public organization detail page already exists at `/organizations/[slug]`
- trust gating already exists as a platform concept, and the helper in [src/lib/trust-access.ts](/Users/dennisdestjeor/work/highlander-today/src/lib/trust-access.ts#L1) shows the current pattern for checking trusted-capable access
- the repo already contains a native drag/reorder pattern in [src/app/admin/homepage/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/homepage/page.tsx#L201), so the first pass does not need a new drag-and-drop library by default

Important current product reality:

- organization self-claim and self-management are still not live
- practical first implementation therefore belongs in the admin organization surface first, with later reuse for organization-manager tooling when self-management exists

Implication:

- this feature can be designed now as organization-owned, but the first operational UI should likely be delivered under `/admin/organizations/[id]` before any later manager self-service rollout

---

## Recommended MVP Scope

The first implementation should support:

- multiple forms per organization
- form status control: draft vs published vs closed
- public visibility control for organization-page listing
- form title and optional description
- question creation, editing, deletion, and ordering
- question types:
  - short/long text entry
  - single-choice radio
  - multi-choice checkbox
- configurable options for choice questions
- required vs optional questions
- shareable canonical links per form
- response access gated to signed-in users meeting a configured minimum trust level
- one submission per user
- organization-side results view with answer counts and exported row-style review inside the app

The MVP should not yet include:

- anonymous responses
- branching/conditional logic
- matrix/grid questions
- file uploads
- scoring/quiz behavior
- email notifications and reminders
- external embeds
- public result dashboards
- PDF generation
- reusable question banks across organizations

---

## Access And Trust Rules

This feature should preserve the existing Highlander accountability model.

### Response access

Each form should carry a minimum responder access level:

- `REGISTERED`
- `TRUSTED`

Recommended rule:

- the share link can be opened by anyone
- the form body and submission action should require sign-in
- anonymous viewers should be redirected into auth and then returned to the form
- suspended users should never be allowed to submit

This preserves shareability without creating anonymous or unverifiable responses.

### Public visibility

Publication and visibility should be treated as separate concerns.

Recommended behavior:

- a form must be `PUBLISHED` before it can accept responses
- a published form may also be marked `isPubliclyListed = true` or `false`
- when `isPubliclyListed = true`, the form appears in a forms list on the public organization page
- when `isPubliclyListed = false`, the form does not appear on the organization page but remains accessible by direct link
- direct-link access still requires sign-in and the configured minimum trust level

This supports "quiet" forms that an organization wants to distribute only to people who already have the link.

### Organization management access

For the first implementation:

- form creation and management should live inside admin organization management
- org-linked forms should therefore be managed by staff/admin users who can already manage organizations

Later, once organization self-management exists:

- active organization owners/managers should be able to create and manage forms for their organization

### Suggested default

Default new forms to:

- `minimumTrustLevel = REGISTERED`
- `isPubliclyListed = false`
- `status = DRAFT`

`TRUSTED` should be available when the form is meant for more sensitive or higher-accountability input.

---

## Recommended Data Model Direction

Use one parent form record, one ordered question table, one ordered option table, one submission table, and one answer table.

### `OrganizationForm`

Suggested fields:

- `id`
- `organizationId`
- `createdByUserId`
- `updatedByUserId`
- `title`
- `slug`
- `description`
- `status`
- `isPubliclyListed`
- `minimumTrustLevel`
- `opensAt`
- `closesAt`
- `publishedAt`
- `closedAt`
- `createdAt`
- `updatedAt`

Recommended starter enums:

- `status`: `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`

Important notes:

- keep one canonical share URL per form, likely `/organizations/[slug]/forms/[formSlug]`
- prefer a human-readable per-organization slug over opaque public IDs in the route

### `OrganizationFormQuestion`

Suggested fields:

- `id`
- `formId`
- `prompt`
- `helpText`
- `type`
- `isRequired`
- `sortOrder`
- `createdAt`
- `updatedAt`

Recommended starter question types:

- `TEXT_SHORT`
- `TEXT_LONG`
- `SINGLE_CHOICE`
- `MULTIPLE_CHOICE`

This keeps UI labels aligned with real rendering behavior rather than using broad names like "radio" or "checkbox" in the database.

### `OrganizationFormQuestionOption`

Suggested fields:

- `id`
- `questionId`
- `label`
- `value`
- `sortOrder`
- `createdAt`
- `updatedAt`

Recommendation:

- keep `label` and `value` separate even if they initially default to the same text
- this leaves room for future display-label cleanup without corrupting stored answers

### `OrganizationFormSubmission`

Suggested fields:

- `id`
- `formId`
- `organizationId`
- `userId`
- `communityId`
- `submittedAt`
- `updatedAt`

Recommended unique rule for MVP:

- unique on `[formId, userId]`

This feature should assume one accountable response per user.

### `OrganizationFormAnswer`

Suggested fields:

- `id`
- `submissionId`
- `questionId`
- `textValue`
- `selectedOptionId`
- `createdAt`
- `updatedAt`

Recommended modeling rule:

- use one answer row per selected checkbox option
- use one answer row for a single-choice answer
- use one answer row with `textValue` for text answers

This is simpler than storing arrays in one column and makes aggregation/querying easier.

---

## Recommended Prisma Shape

The exact final schema can vary, but the relationship direction should look roughly like this:

```prisma
model OrganizationForm {
  id                     String                 @id @default(uuid()) @db.Uuid
  organizationId         String                 @db.Uuid
  createdByUserId        String                 @db.Uuid
  updatedByUserId        String?                @db.Uuid
  title                  String
  slug                   String
  description            String?
  status                 OrganizationFormStatus @default(DRAFT)
  isPubliclyListed       Boolean                @default(false)
  minimumTrustLevel      TrustLevel             @default(REGISTERED)
  opensAt                DateTime?
  closesAt               DateTime?
  publishedAt            DateTime?
  closedAt               DateTime?
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt

  organization           Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy              User                   @relation("organizationFormCreatedBy", fields: [createdByUserId], references: [id], onDelete: Cascade)
  updatedBy              User?                  @relation("organizationFormUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: SetNull)
  questions              OrganizationFormQuestion[]
  submissions            OrganizationFormSubmission[]

  @@unique([organizationId, slug])
  @@index([organizationId, status])
  @@map("organization_forms")
}

model OrganizationFormQuestion {
  id                     String                       @id @default(uuid()) @db.Uuid
  formId                 String                       @db.Uuid
  prompt                 String
  helpText               String?
  type                   OrganizationFormQuestionType
  isRequired             Boolean                      @default(false)
  sortOrder              Int                          @default(0)
  createdAt              DateTime                     @default(now())
  updatedAt              DateTime                     @updatedAt

  form                   OrganizationForm             @relation(fields: [formId], references: [id], onDelete: Cascade)
  options                OrganizationFormQuestionOption[]
  answers                OrganizationFormAnswer[]

  @@index([formId, sortOrder])
  @@map("organization_form_questions")
}

model OrganizationFormQuestionOption {
  id                     String                   @id @default(uuid()) @db.Uuid
  questionId             String                   @db.Uuid
  label                  String
  value                  String
  sortOrder              Int                      @default(0)
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt

  question               OrganizationFormQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  answers                OrganizationFormAnswer[]

  @@index([questionId, sortOrder])
  @@map("organization_form_question_options")
}

model OrganizationFormSubmission {
  id                     String                 @id @default(uuid()) @db.Uuid
  formId                 String                 @db.Uuid
  organizationId         String                 @db.Uuid
  userId                 String                 @db.Uuid
  communityId            String                 @db.Uuid
  submittedAt            DateTime               @default(now())
  updatedAt              DateTime               @updatedAt

  form                   OrganizationForm       @relation(fields: [formId], references: [id], onDelete: Cascade)
  organization           Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user                   User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  community              Community              @relation(fields: [communityId], references: [id], onDelete: Cascade)
  answers                OrganizationFormAnswer[]

  @@unique([formId, userId])
  @@index([organizationId, submittedAt])
  @@map("organization_form_submissions")
}

model OrganizationFormAnswer {
  id                     String                       @id @default(uuid()) @db.Uuid
  submissionId           String                       @db.Uuid
  questionId             String                       @db.Uuid
  selectedOptionId       String?                      @db.Uuid
  textValue              String?
  createdAt              DateTime                     @default(now())
  updatedAt              DateTime                     @updatedAt

  submission             OrganizationFormSubmission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  question               OrganizationFormQuestion     @relation(fields: [questionId], references: [id], onDelete: Cascade)
  selectedOption         OrganizationFormQuestionOption? @relation(fields: [selectedOptionId], references: [id], onDelete: SetNull)

  @@index([submissionId])
  @@index([questionId])
  @@index([selectedOptionId])
  @@map("organization_form_answers")
}

enum OrganizationFormStatus {
  DRAFT
  PUBLISHED
  CLOSED
  ARCHIVED
}

enum OrganizationFormQuestionType {
  TEXT_SHORT
  TEXT_LONG
  SINGLE_CHOICE
  MULTIPLE_CHOICE
}
```

---

## Route And URL Direction

Recommended public route:

- `/organizations/[slug]/forms/[formSlug]`

Recommended admin management route family:

- `/admin/organizations/[id]` with a new `Forms` tab

Recommended later manager route family:

- organization self-management route once that subsystem exists

Why the public route should live under organization pages:

- the form remains visibly attached to a real organization
- the share link is stable and understandable
- users get platform context and organization accountability cues
- future organization-site/custom-domain work can map the same form route into standalone org domains later

### Preview access on the public route

The public form route should support elevated preview access for authorized organization staff/admin viewers.

Recommended behavior:

- regular viewers only get normal access to published forms, subject to auth/trust/open-state rules
- organization admins/staff with management rights for that organization may open the same route for:
  - `DRAFT` forms
  - hidden published forms
  - closed forms
- preview states should be clearly labeled so staff can tell they are not seeing the same experience as a normal public viewer

This keeps one canonical route for both public access and staff preview, which is simpler than inventing a second preview-only route family.

### Public organization page integration

If a form is both:

- `PUBLISHED`
- `isPubliclyListed = true`

then it should appear in a forms list on `/organizations/[slug]`.

Recommended initial listing contents:

- form title
- short description if present
- link to the form detail/submission page

Recommended listing rules:

- for non-organization-admin/staff viewers, show only forms that are:
  - `PUBLISHED`
  - `isPubliclyListed = true`
  - currently open within their publish/window state
- do not show closed forms to regular public viewers on the organization page
- do not show `DRAFT`, `ARCHIVED`, or hidden forms on the organization page
- do not leak hidden-form titles in the public organization UI
- a hidden published form should still resolve normally when a signed-in eligible user has the direct link

Operational distinction:

- public organization-page listing is for currently open forms only
- organization admins/staff can still see closed and hidden forms in management/results surfaces

---

## MVP UI Direction

There are really three surfaces:

1. form management
2. form fill/submission
3. results review

### 1. Form management

Recommended first home:

- add a `Forms` tab inside the existing organization management experience

Recommended capabilities:

- form list for the organization
- create/edit form metadata
- add questions
- edit question type/prompt/help text/required state
- add/edit/remove options on choice questions
- drag reorder questions
- drag reorder options within a question
- publish/close/archive actions
- copy share link

Implementation recommendation:

- start with the repo's existing native drag patterns before adding a package
- only introduce a dedicated DnD library if keyboard accessibility or nested-sort complexity becomes unacceptable with the native pattern

### 2. Form fill/submission

Recommended behavior:

- clean public page inside the standard public shell
- organization name and form title visible at the top
- clear message if sign-in or higher trust is required
- plain sequential question rendering
- one submit action at the bottom
- confirmation state after successful submission

Recommended MVP rule:

- after submit, show a read-only confirmation summary rather than an edit-in-place workflow
- if the user already submitted, show a "response already recorded" state rather than reopening the form
- if the form is closed, resolve the form page normally and show a clear "this form is closed" state rather than `not found`
- authorized organization admins/staff may still open the same route for preview/review when the form is draft, hidden, or closed

### 3. Results review

Recommended first results surface:

- summary counts for each choice option
- total response count
- per-submission table with responder identity and submitted time
- row detail view showing all answers for one submission

For text questions:

- show responses as a review list
- do not try to auto-summarize with AI in v1

---

## Validation Rules

The backend should validate more than the UI.

Recommended hard rules:

- published forms must have at least one question
- choice questions must have at least two options before publish
- each question must have a stable `sortOrder`
- checkbox submissions may select multiple options, but only for `MULTIPLE_CHOICE`
- radio submissions may select exactly one option for `SINGLE_CHOICE`
- text responses must be non-empty when the question is required
- option IDs submitted must belong to the target question
- users may not submit to forms outside the active community context
- users may not submit to `DRAFT`, `ARCHIVED`, or closed-window forms
- users may submit only once per form

---

## Results And Reporting Direction

The phrase "collate results" should mean something modest and reliable in v1.

Recommended MVP collation:

- total submissions
- per-question response counts
- per-option counts and percentages for choice questions
- chronological submission list
- filter by date range later if needed

Avoid promising advanced analytics up front.

This feature is primarily about:

- collecting accountable responses
- making them reviewable
- preserving organization context

It is not yet a business-intelligence system.

---

## Relationship To Existing And Planned Systems

### Organization profiles

Forms should be organization-owned and visible from the organization context, which aligns with the current public `/organizations/[slug]` direction.

### Organization self-management

Do not block the architecture on self-management, but do design the permissions so the same APIs can later be reused by organization owners/managers when self-claim flows exist.

### Organization inbox / CRM

This form system should stay adjacent to, not merged into, the planned organization inbox/CRM subsystem in [ORGANIZATION-INBOX-CRM-PLAN.md](/Users/dennisdestjeor/work/highlander-today/ORGANIZATION-INBOX-CRM-PLAN.md).

Recommended relationship:

- form submissions are structured intake records
- inbox threads are communication/case records

Later, it may make sense for a submission to optionally open a CRM contact record or inbox case, but the first implementation should not make forms depend on the inbox subsystem.

### Directory and public organization pages

Public organization pages should expose forms only when the form is explicitly marked visible for public listing.

That means:

- visible published forms can appear as a section or CTA list on the organization page
- hidden published forms stay absent from the page but still work by direct link

---

## Suggested Rollout Phases

### Phase 1

- Prisma schema for forms/questions/options/submissions/answers
- admin `Forms` tab under organization management
- create/edit/publish/close forms
- public form route with auth + trust gating
- one submission per user, no edit/re-submit flow
- basic results summary and submission table
- public organization-page listing for forms marked visible

### Phase 2

- organization manager self-service once self-claim/self-management exists
- optional listing of active forms on public organization pages
- response export
- edit-after-submit or reopen behavior if truly needed

### Phase 3

- optional inbox/CRM linkage
- notifications/reminders
- more advanced reporting
- conditional logic only if real use cases justify the complexity

---

## Concrete Implementation Breakdown

This section turns the product direction above into a practical first-build slice for the current repo.

### 1. Prisma and schema work

Add these models:

- `OrganizationForm`
- `OrganizationFormQuestion`
- `OrganizationFormQuestionOption`
- `OrganizationFormSubmission`
- `OrganizationFormAnswer`

Add these enums:

- `OrganizationFormStatus`
- `OrganizationFormQuestionType`

Update these existing models with relation fields:

- `Organization`
- `User`
- `Community`

Recommended relation additions:

- `Organization.forms`
- `Organization.formSubmissions`
- `User.organizationFormsCreated`
- `User.organizationFormsUpdated`
- `User.organizationFormSubmissions`
- `Community.organizationFormSubmissions`

Recommended indexes:

- organization + status on forms
- form + sort order on questions
- question + sort order on options
- organization + submitted time on submissions
- form + user unique on submissions

Operational note:

- this repo uses `prisma db push`, not checked-in migrations
- any environment receiving the feature will need `npx prisma db push --schema prisma/schema.prisma`

### 2. Shared server-side library layer

Add a focused organization-forms library module, likely:

- `src/lib/organization-forms.ts`

Recommended responsibilities:

- load one organization form for admin management
- load one public form by organization slug + form slug
- determine whether the current viewer has organization-management preview rights
- compute whether a form is currently open
- normalize question/option ordering
- collate results summaries
- enforce single-submission rules

Recommended helper shape:

- `getOrganizationFormForAdmin`
- `getPublicOrganizationForm`
- `viewerCanManageOrganizationForm`
- `isOrganizationFormOpen`
- `buildOrganizationFormResultsSummary`

Keep form business rules in this shared layer rather than scattering them across routes and pages.

### 3. Permission model

The implementation needs three permission tiers:

1. organization form manager
2. eligible responder
3. ordinary viewer with no submission rights

#### Form manager

For phase 1, this should map to the same admin/staff users who can already manage organizations.

Capabilities:

- create forms
- edit metadata
- add/remove/reorder questions
- add/remove/reorder options
- publish
- hide/show from public organization-page listing
- close/archive
- view all results
- preview draft/hidden/closed forms on the public route

#### Eligible responder

Capabilities:

- open published forms when the form is link-accessible
- submit once if the form is open and the user meets the minimum trust level
- view post-submit confirmation
- view "already submitted" state on repeat visits

#### Ineligible viewer

Capabilities:

- open the route shell if link-access rules allow
- see auth/trust/closed-state messaging
- no submission capability

Important implementation rule:

- organization management rights and responder trust rights are separate checks
- an organization manager may preview a form because of management rights even when they would not otherwise satisfy ordinary public responder rules

### 4. API surface

Recommended first API family:

- `GET /api/admin/organizations/[id]/forms`
- `POST /api/admin/organizations/[id]/forms`
- `GET /api/admin/organizations/[id]/forms/[formId]`
- `PATCH /api/admin/organizations/[id]/forms/[formId]`
- `DELETE /api/admin/organizations/[id]/forms/[formId]`
- `POST /api/admin/organizations/[id]/forms/[formId]/publish`
- `POST /api/admin/organizations/[id]/forms/[formId]/close`
- `POST /api/admin/organizations/[id]/forms/[formId]/archive`
- `POST /api/admin/organizations/[id]/forms/[formId]/questions`
- `PATCH /api/admin/organizations/[id]/forms/[formId]/questions/[questionId]`
- `DELETE /api/admin/organizations/[id]/forms/[formId]/questions/[questionId]`
- `POST /api/admin/organizations/[id]/forms/[formId]/reorder`
- `GET /api/admin/organizations/[id]/forms/[formId]/results`
- `POST /api/organizations/[slug]/forms/[formSlug]/submit`

Recommended mutation boundaries:

- metadata edits and question edits should be separate from submission
- publish/close/archive should be explicit action endpoints, not silent side effects of generic patching
- reorder should be an explicit endpoint taking ordered IDs rather than many small sort-order calls

### 5. Admin UI breakdown

Recommended first home:

- add a `Forms` tab to [src/app/admin/organizations/[id]/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/organizations/[id]/page.tsx#L1)

Recommended subviews inside that tab:

- form list
- create/edit form details
- question builder
- results

#### Form list

Show:

- title
- status
- publicly listed yes/no
- minimum trust level
- submission count
- open/closed state
- quick actions

Recommended quick actions:

- edit
- copy link
- publish
- close
- archive
- preview

#### Form details editor

Fields:

- title
- slug
- description
- `isPubliclyListed`
- `minimumTrustLevel`
- `opensAt`
- `closesAt`

Recommended validation:

- slug uniqueness within organization
- close date not before open date
- hidden vs listed state editable independently of status

#### Question builder

Capabilities:

- add question
- choose type
- edit prompt/help text
- toggle required
- reorder questions
- manage options for choice questions
- reorder options within a question

Recommended editing rule:

- do not allow question type changes after submissions exist unless all existing answers for that question are first cleared or the question is duplicated/replaced

That rule prevents answer corruption.

#### Results view

Show:

- total submissions
- question-by-question summaries
- per-option counts/percentages
- raw text answers for text questions
- submission list with user name and submitted date
- row detail view for one respondent

### 6. Public route behavior

Recommended public page file:

- `src/app/organizations/[slug]/forms/[formSlug]/page.tsx`

Recommended rendering states:

- sign-in required
- higher trust required
- draft preview for staff
- hidden preview for staff
- closed state
- already submitted state
- active form state
- successful submission confirmation

Important rule:

- use one route with conditional state rendering, not separate public vs preview pages

### 7. Public organization page integration

Update the organization page loader used by `/organizations/[slug]` so it can also fetch visible/open forms.

Recommended selection rule for regular viewers:

- `status = PUBLISHED`
- `isPubliclyListed = true`
- current time within open window

Recommended page treatment:

- a compact `Forms` section on the organization page
- each row links to the canonical form route
- if no visible/open forms exist, omit the section entirely

Do not surface hidden, draft, or closed forms there.

### 8. Submission transaction behavior

Submission should be handled transactionally.

Recommended sequence:

1. load form, questions, and options
2. verify form is published and open, unless manager preview is being used only for viewing
3. verify viewer auth and trust requirements
4. verify the user has not already submitted
5. validate all answers against current question definitions
6. create `OrganizationFormSubmission`
7. create all `OrganizationFormAnswer` rows
8. return success payload with confirmation state

Important rule:

- do not partially save answers
- form submission should succeed or fail as one unit

### 9. Result collation implementation

Choice-question summary queries should compute:

- total answers per option
- percentage of total submissions

Text-question collation should compute:

- raw answer list ordered by submission time

Recommended constraint:

- keep aggregation server-side
- do not ship all answer rows to the client and calculate counts there

### 10. Audit and activity logging

This feature should write activity records for major management actions.

Recommended logged actions:

- form created
- form updated
- form published
- form closed
- form archived
- submission received

If the current generic activity-log system is reused, keep the resource model explicit enough that form activity can later be filtered per organization.

### 11. Testing and verification

Recommended minimum coverage:

- schema/client generation sanity
- create/edit/publish/close validations
- trust gating for `REGISTERED` vs `TRUSTED`
- hidden-form direct-link behavior
- organization-page list only shows visible/open forms
- single-submission enforcement
- question/option validation
- results summary counts
- staff preview access for draft/hidden/closed forms

Recommended verification commands once code exists:

```bash
npm run lint
npm run typecheck
```

Add targeted tests where practical for loader and validation logic, especially around submission integrity and visibility rules.

### 12. Recommended file plan

Likely files to add:

- `src/lib/organization-forms.ts`
- `src/app/organizations/[slug]/forms/[formSlug]/page.tsx`
- `src/app/api/organizations/[slug]/forms/[formSlug]/submit/route.ts`
- `src/app/api/admin/organizations/[id]/forms/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/publish/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/close/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/archive/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/reorder/route.ts`
- `src/app/api/admin/organizations/[id]/forms/[formId]/results/route.ts`
- admin UI components under `src/app/admin/organizations/[id]/`

Likely files to update:

- [prisma/schema.prisma](/Users/dennisdestjeor/work/highlander-today/prisma/schema.prisma#L1)
- [src/app/admin/organizations/[id]/page.tsx](/Users/dennisdestjeor/work/highlander-today/src/app/admin/organizations/[id]/page.tsx#L1)
- organization public-page loader and page under the existing `/organizations/[slug]` route

---

## Implementation Guidance

If this feature is started, recommended order:

1. finalize the data model and public permission rules
2. add Prisma models and regenerate the client
3. build server-side loaders and mutation APIs
4. add admin organization `Forms` management UI
5. add the public form route and submission flow
6. add results summary/review UI
7. add verification coverage for validation, permission gates, and aggregation

Important sequencing rule:

- do not begin with drag-and-drop polish
- begin with stable models, validation, and submission integrity

---

## Explicit Recommendation

This feature is worth doing, but the first implementation should stay deliberately narrow.

The right initial product is:

- organization-linked forms
- authenticated responders only
- minimum responder level of `REGISTERED` or `TRUSTED`
- simple question types
- one accountable submission per user, one time only
- separate public visibility control for whether a published form appears on the organization page
- modest collated results
- admin-managed first, organization-self-managed later

That keeps the system aligned with Highlander Today's trust model and current repo reality without drifting into a large generic survey builder before the surrounding organization-management stack is ready.
