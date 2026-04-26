# Memoriam — Launch Readiness Checklist

> **Purpose:** Practical pre-launch checklist for getting Memoriam ready to accept a first real submission in the Cambria Heights community. This is not a feature roadmap — it is an operational runbook for the founder-driven launch phase.

---

## What Is Now Built

### Submission & intake

- [x] Public submission form at `/memoriam/submit` (trusted users only)
- [x] Age auto-calculated from birth/death dates — no hard age entry required
- [x] Character limits with live counters on Factual (1,000 chars) and Short memorial (300 chars)
- [x] Multi-photo upload (up to 20 photos, R2-backed, `memoriam` context)
- [x] Per-photo captions
- [x] YouTube / Vimeo video URL fields (up to 5)
- [x] Memorial service stream link field
- [x] Verification contact collection (up to 5 contacts)
- [x] Submitter contact capture
- [x] Plain-language field names (no jargon: "Where this information comes from" instead of "Provenance note")
- [x] Submission posts to `/api/memoriam/submissions` and creates `MemorialPerson`, `MemorialPage`, `MemorialSubmission`, `MemorialPhoto`, and `MemorialVerification` records in one transaction

### Admin moderation

- [x] `/admin/memoriam` — submissions queue with status filtering
- [x] Submission review drawer: assign, status update, review notes
- [x] Memory moderation table: approve / reject / hide pending memories
- [x] Memorial pages table with per-page photo approval (approve/reject pending photos inline)
- [x] Steward assignment per memorial page (staff assigns via user ID)
- [x] "Manage" link per published page → `/memoriam/[slug]/manage`

### Public pages

- [x] `/memoriam` — public browse with search, type filtering (Notices / Lives), grouped by month
- [x] `/memoriam/[slug]` — full memorial detail page with:
  - Hero image
  - Photo gallery (approved photos in responsive grid with captions)
  - YouTube / Vimeo embeds (16:9 iframe)
  - Memorial service stream link
  - Body prose (biography + life story)
  - Service details
  - Community memories (approved, numbered)
  - Memory submission form
  - Provenance strip (born, died, published, stewardship)
  - "Manage memorial" link for stewards

### Steward self-service

- [x] `/memoriam/[slug]/manage` — steward dashboard (gated by active STEWARD or CO_STEWARD contributor record)
- [x] Tab 1 — Edit memorial text: title, short memorial, biography, life story, service details, family details
- [x] Tab 2 — Photos & videos: upload new photos, set hero image, remove photos, manage video URLs and service stream link
- [x] Tab 3 — Memories: approve or reject pending community memories directly (no staff needed)
- [x] Tab 4 — Stewards: view current contributors, invite co-stewards and family contributors

### API surface

- [x] `POST /api/memoriam/submissions` — create submission (photos + videos included)
- [x] `GET /api/memoriam/pages/[id]/photos` — list photos (staff/steward sees all; public sees approved)
- [x] `POST /api/memoriam/pages/[id]/photos` — add photo (steward or staff)
- [x] `PATCH /api/memoriam/photos/[id]` — update photo (approve/reject/hide/caption/hero)
- [x] `DELETE /api/memoriam/photos/[id]` — remove photo
- [x] `GET /api/memoriam/pages/[id]/contributors` — list stewards
- [x] `POST /api/memoriam/pages/[id]/contributors` — assign steward (staff) or invite co-steward
- [x] `PATCH /api/memoriam/pages/[id]/manage` — steward content edits + memory actions

### Data model

- [x] `MemorialPerson`, `MemorialPage`, `MemorialSubmission`, `MemorialContributor`, `MemorialVerification`, `MemorialMemory`, `MemorialPhoto`, `MemorialAuditLog`
- [x] `MemorialPage.videoEmbeds String[]`
- [x] `MemorialPage.serviceStreamUrl String?`
- [x] `HomepageBoxType.MEMORIAM`

---

## What Must Happen Before First Real Submission

### 1. Schema push (required)

```bash
npx prisma db push --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
```

Run against both local and production databases. The schema adds `videoEmbeds` and `serviceStreamUrl` to `memorial_pages`, and `MEMORIAM` to the `HomepageBoxType` enum. Without this, submissions will fail at runtime.

### 2. Trusted user pipeline (required)

The submission form requires `TRUSTED` user status. Before a family can submit:

- At least a handful of trusted users must exist in the Cambria Heights community
- The founder or admin must have vouched them through `/help-us-grow` or direct admin action
- If the family submitting is not yet a trusted user, they need to be vouched before they can reach the form

**Check:** can a real Cambria Heights resident who wants to submit get through the trust gate? If not, resolve this first — more important than any feature.

### 3. Wiring Memoriam into the navigation (required)

Navigation is DB-driven. Memoriam will not appear in the nav unless a `Category` with `contentModel = MEMORIAM` is created and linked to a parent nav item. Do this via `/admin/categories`:

- Create or confirm a top-level or child nav entry for `Memoriam`
- Set its `contentModel` to `MEMORIAM`
- Set `minTrustLevel` if you want it gated (or leave as `ANONYMOUS` for public visibility)

### 4. Homepage Memoriam box (optional for launch, recommended)

To show the "Recently Remembered" block on the homepage:

- Go to `/admin/homepage`
- Add a new homepage box with type `MEMORIAM`
- Set its sort order to place it appropriately (the vision calls for a quiet, understated placement, not the top slot)

The `RecentlyRemembered` component fetches its own data and returns null if there are no published memorials yet, so it is safe to add before any memorials exist.

### 5. Staff review workflow walkthrough (required before going live)

Before a family submits, the founder should do a dry-run end to end:

1. Submit a test memorial as a trusted user
2. Find it in `/admin/memoriam` submissions queue
3. Review, assign, and approve it
4. Confirm the memorial page is visible at `/memoriam/[slug]`
5. Assign yourself as steward
6. Open `/memoriam/[slug]/manage` and confirm all tabs work
7. Test memory submission and steward approval
8. Delete or unpublish the test record

---

## What Is Still Pending (Not Yet Built)

These are real gaps but not blockers for a first careful launch:

- **Photo print output** — families sometimes want a printable page; not built yet
- **Richer public search** — `/memoriam` has basic name/town/type search; no date-range or multi-filter yet
- **Email notification to steward** — when a memory is submitted, the steward gets no email alert yet; they must check the manage page manually
- **Co-steward invitation by email** — currently requires the inviter to know the invitee's user ID; an email-lookup path would be better
- **Steward transfer** — admin can assign a new steward but there is no built-in UI for transferring primary stewardship
- **Print-friendly memorial page** — not yet styled for print
- **Memoriam ↔ History linkage** — the long-term archive integration is still planned but not built
- **Data export / portability** — individual memorial export (PDF, JSON) is not yet built
- **Family dispute / identity-dispute workflow** — freeze and flag actions exist in the plan but are not yet surfaced as explicit UI actions for staff

---

## Operational Notes for Founder-Led Launch

- **Manual moderation is expected.** Every submission goes through the queue. You review, verify, and approve before anything publishes. This is correct for Phase 1 — do not shortcut it.
- **Photos are gated.** Photos submitted at intake are `PENDING` until you approve them in the admin memorial pages table. Steward-uploaded photos are auto-approved. This is intentional.
- **Steward assignment is manual.** After approving a memorial, you explicitly assign the family steward via the admin UI. The steward then self-manages through `/memoriam/[slug]/manage`. This is the right division for now.
- **The tone of your first memorials sets the standard.** How the first five pages look and feel will define what families expect. Take time with those records.
- **The trust gate is a feature, not a bug.** If a grieving family hits the wall because they are not a trusted user yet, that is a human conversation, not a bug report. Reach out, vouch them, and help them submit.

---

## Supporting Documents

- `OBITUARIES-PLAN.md` — full product/workflow specification for the memoriam subsystem
- `MEMORIAM-STRATEGY.md` — long-term vision and strategic positioning
- `MEMORIAM-MIGRATION.md` — public surface visual design migration notes ("Lives Lived" direction)
- `PROJECT-STATUS.md` — current implementation state and session notes
