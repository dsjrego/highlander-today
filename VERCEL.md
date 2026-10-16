# Vercel Setup And Deployment Guide

## News-section release — 2026-10-16

Owner authorized commit, push and production deployment. Top-level Article navigation items render automatic news sections: newest published section article as hero, recent headlines, optional subsection filters and pagination, without curation. Direct/descendant assignments are tenant-scoped; trust/archival/publication boundaries retained. National is already configured as an active top-level Article section (production read-only check); no category/schema/environment/dependency changes required. Sports and Medicine can use the same Article model. Existing dedicated routes retained. Exact Node22.23.2 release: clean npm ci, lint/typecheck, 400 unit tests/71 suites, Next15.5.26 production build and both isolated PostgreSQL/Chromium cases pass (9.5s), including main-content Axe, keyboard/mobile navigation, tenant isolation and Local Life compatibility. Fresh migrations pass; only the three inherited Reporter morning-slate naming differences remain. Audits retain deployed baseline 11 runtime/45 full findings. Unrelated worktree hardening/documentation relocation/dependency changes excluded. Deployment evidence is recorded separately after push; rollback reference 21bccfb.


## Candidate assignment autosave release — 2026-10-15

Owner authorized commit, push and deploy. Reporter selection saves immediately and keeps Candidates open; the extra assignment icon and automatic navigation are removed. Pending controls are disabled, screen-reader feedback announces saving/success, and errors reset selection for retry. Relative positioning contains the hidden status within the scrolling table. Existing assignment permissions/tenancy and human publication boundaries remain. No API, schema, dependency, environment or cron changes. Unrelated local edits/documentation relocation excluded.

Broader primary-tree build/typecheck/lint/standards, 14 targeted units and three disposable-PostgreSQL/Chromium cases pass. Exact release clean npm ci --include=dev, lint, standalone typecheck and 375 unit tests (69 suites) pass. Runtime/full audit inventory remains the deployed baseline 11/45 findings; dependencies unchanged and remediation remains separate. Fresh test schema migrations apply; only three inherited morning-slate FK/index naming differences remain. Exact production build (Next15.5.26) and all three disposable-PostgreSQL/Chromium cases pass (15.9s), including autosave/pending/error/retry/reload, assignment/publication and compact desktop/mobile dismissal/Axe checks. Paid inference stubbed; no production writes. Push/deployment pending. Rollback: `7a75fb4` / `4qbfNi86AqYmw2bCtbe3QQXD6QKv`.

## Candidate dismissal release — 2026-10-15

Owner authorized commit, push and deployment. Candidates now have compact inline assignment/view/dismiss icons, hidden accessible labels, no redundant readiness column, and expandable summary previews. Additive migration `20261015000000_reporter_candidate_dismissal` adds nullable `dismissedAt`; migration must precede application deployment. Tenant/edit permissions, retained sources/linked assignments, idempotent audit and refresh/assignment guards preserve the reporting boundaries. Admin guidelines adopt the density clarification. Unrelated local hardening, dependencies and documentation relocation are excluded.

Broader primary-tree checks passed: typecheck/scoped lint/standards, 12 targeted units, fresh migration/diff, production build and two isolated PostgreSQL/Chromium workflow cases including mobile row density, Axe, pending/error recovery and durable dismissal. Exact clean installation/lint/typecheck and375 units (69 suites) pass; fresh migration rehearsal matches candidate change, with only three inherited morning-slate physical-name differences outside scope. Runtime/full audits retain baseline11/45 findings. Fresh logical backup/restore verifies93 tables/3,912 rows and fingerprints; protected recovery receipt `~/.local/share/highlander-today/recovery/758c6814/receipt.json`. Production preflight confirms only new dismissal migration pending; exact production build and both PostgreSQL/Chromium workflow cases pass (11.9s), including assignment/publication, error/pending behavior, durable dismissal, preserved records, tenant boundary, Axe and <=65px rows at desktop/mobile widths. Migration/deployment checks pending. Rollback application `7916340` remains compatible with the additive column.

## Admin viewport follow-up — 2026-10-14

Native production inspection after the shared admin release found a 7px horizontal spill with a reserved 15px browser scrollbar. The admin main now uses the normal containing width; removed its obsolete viewport-wide negative-margin breakout. Browser checks explicitly reserve scrollbar space and compare document scrollWidth against clientWidth. No API, data, dependency, schema or environment changes. Follow-up lint/typecheck/production build and all ten isolated admin/archive/analytics browser cases passed, including a reserved native scrollbar. The test suite disables Chromium’s default hide-scrollbars switch and checks visible clientWidth. Deployment is tracked with the main admin release.

## Admin interface release — 2026-10-14

Owner authorized commit, push and production deployment of the compact admin interface. Release uses shared table/section/summary/action/tooltip/chrome primitives, compact sidebar icons/mobile navigation, dashboard/store/trust tables and aligned bans/audit screens. Existing permissions, status confirmations and Reporter publication boundaries remain intact. No API/schema/dependency/environment/cron changes. Scope excludes unrelated local hardening and documentation migration; baseline production is a8f9f2d / GimoU6uqZUUBuVFagp34YAF36Kwv (rollback).

Exact release verification passed under Node 22.23.2: clean npm ci --include=dev, lint/typecheck, 367 unit tests, production build and ten isolated admin/store/archive/analytics browser cases. Runtime/full audits retain the deployed baseline (11/45 findings); dependency remediation remains separate.

Exact release checks are run under Node 22.23.2 after npm ci --include=dev; isolated database/browser checks require localhost highlander_today_test and blank paid-model keys. New browser coverage verifies numeric/status styles, hover/focus/Escape help, responsive navigation, one expanded store detail row, filtering, failed-update note retention, cancelled/approved/suspended/rejected state and approval audit reason. Public/admin chrome transitions and existing archive/analytics suites guard shared behavior. Deployment occurs through the existing main Git integration; READY status, artifact/domain correspondence, CI and public/access smoke checks must be verified separately. Authenticated production writes are not part of the smoke check.


## Assigned Stories archive release — 2026-10-14

Owner authorized commit, push and deployment. Adds Archive beside the Assigned Stories next action, hides archived assignments from All active statuses and counts, and retains access through the Archived filter and View story. Reuses existing tenant/role-checked status updates; sources, notes, drafts and linked articles are preserved. No schema, dependency, environment or cron changes. Release is isolated from unrelated primary-worktree changes, including Reporter-page accessibility work.

Exact release under Node 22.23.2 passed clean npm ci with developer tooling, lint, typecheck, 367 unit tests (68 suites), production build (Next 15.5.26) and both PostgreSQL/Chromium archive cases (11.5s); deployment and live results are maintained in the local canonical operations runbook. Rollback baseline: `e2fb654` / Vercel `DnXvZ38ApjJyoGSsLmsbKD84ggYa`. Existing runtime audit baseline is 11 findings (7 high, 4 moderate), and full audit retains 45 (1 critical, 35 high, 9 moderate); dependency remediation remains separate from this UI release.

## Purpose

This file is the single operator-facing reference for Highlander Today’s Vercel setup.

Use it for:

- production environment-variable setup
- auth configuration
- upload/storage configuration
- reporter scheduler / cron configuration
- deployment and redeploy steps
- production verification

If `README.md` and this file overlap, use this file for Vercel-specific operator work and use `README.md` for broader repo setup.

## Current Production Baseline

Current intended production assumptions:

- app hosting: `Vercel`
- production domain: `https://highlander.today`
- secondary public hostname: `https://www.highlander.today`
- DNS: `Cloudflare`
- uploads: `Cloudflare R2`
- production upload CDN/base URL: `https://cdn.highlander.today`
- active launch auth providers: `credentials` + `Google OAuth`
- Facebook OAuth: intentionally deferred
- reporter morning-desk scheduler: `Vercel Cron`

## Before You Start

Make sure you have:

- access to the correct Vercel account/team
- access to the correct Vercel project
- access to the production env vars area
- access to the Google Cloud project for OAuth
- access to Cloudflare / R2 if upload settings need to be changed

## Vercel Project Checklist

In Vercel, confirm:

1. The correct project is selected.
2. Production is connected to the correct repository and branch.
3. The production domain is `highlander.today`.
4. Any redeploy you expect to use is happening against the production deployment, not only a preview deployment.

## Production Environment Variables

These are the main variables Vercel production needs.

### Required For Auth

```env
NEXTAUTH_URL=https://highlander.today
NEXTAUTH_SECRET=<strong-random-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Rules:

- `NEXTAUTH_URL` must be exactly `https://highlander.today`
- `NEXTAUTH_SECRET` should be a strong random secret
- Google values must match the production Google OAuth app

### Required For Uploads

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=highlander-today
R2_PUBLIC_URL=https://cdn.highlander.today
```

Rules:

- `R2_PUBLIC_URL` must be the final public asset base URL
- it should not be the private R2 API endpoint
- `R2_ACCOUNT_ID` is enough for the app to derive the S3-compatible endpoint automatically

### Recommended For Login Geolocation

```env
MAXMIND_ACCOUNT_ID=...
MAXMIND_LICENSE_KEY=...
```

If these are missing:

- login still works
- geolocation enrichment is skipped

### Required For Transactional Email

```env
BREVO_API_KEY=...
EMAIL_FROM=hello@highlander.today
EMAIL_FROM_NAME=Highlander Today
```

If these are missing:

- invitation and transactional sending will be disabled

### Required For Reporter Scheduler

```env
CRON_SECRET=<strong-random-secret>
REPORTER_SCHEDULER_TOKEN=<optional-secondary-secret>
```

Rules:

- `CRON_SECRET` is the important Vercel cron variable
- Vercel cron will automatically send `Authorization: Bearer <CRON_SECRET>`
- `REPORTER_SCHEDULER_TOKEN` is optional for non-Vercel or manual bearer-token calls

### Required For Reporter Analysis And Drafting

```env
OPENAI_API_KEY=...
REPORTER_MODEL_PROVIDER=openai
REPORTER_MODEL_NAME=gpt-5.6
REPORTER_MODEL_REASONING_EFFORT=medium
```

These settings apply to reporter source-packet analysis, article drafting, and the model-assisted interview flow. Candidate ingestion, clustering, and scoring remain deterministic.

## Step-By-Step: Add Or Update Vercel Environment Variables

1. Sign in to `https://vercel.com`.
2. Open the Highlander Today project.
3. Go to `Settings`.
4. Open `Environment Variables`.
5. Add or update each required variable.
6. Set them for `Production`.
7. Save the changes.
8. Redeploy production after saving.

Important:

- Vercel will not apply new env values to an already-running production deployment until you redeploy.

## Production Auth Setup

Highlander Today production auth currently uses:

- credentials login
- Google OAuth

### Required Vercel Auth Variables

```env
NEXTAUTH_URL=https://highlander.today
NEXTAUTH_SECRET=<strong-random-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Google OAuth Production Settings

Use this redirect URI in Google Cloud:

- `https://highlander.today/api/auth/callback/google`

Recommended allowed origins / domains:

- `https://highlander.today`
- `https://www.highlander.today`

### Production Auth Operator Checklist

1. Confirm `NEXTAUTH_URL` is exactly `https://highlander.today`.
2. Confirm `NEXTAUTH_SECRET` is present.
3. Confirm the Google client ID and secret in Vercel match the intended production app.
4. In Google Cloud Console, confirm the production redirect URI is present.
5. Redeploy production.
6. Test credentials login on `https://highlander.today/login`.
7. Test Google login on `https://highlander.today/login`.

## Production Upload Setup (Cloudflare R2)

Production uploads are already designed to use Cloudflare R2.

### Required Upload Variables

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=highlander-today
R2_PUBLIC_URL=https://cdn.highlander.today
```

### Fresh-Environment Operator Sequence

1. Create the R2 bucket, for example `highlander-today`.
2. Create an R2 API token with object read/write access scoped to that bucket.
3. Save the access key ID and secret.
4. Attach the public custom domain to the bucket.
5. Create the needed DNS record in Cloudflare.
6. Add the five upload variables to Vercel Production.
7. Redeploy production.
8. Test a production upload from a wired form.
9. Confirm the returned URL uses `R2_PUBLIC_URL` and not `/uploads/...`.

### Common Upload Failure

If production says:

- `Upload storage is not configured for production`

then at least one required R2 variable is missing or incorrect in Vercel.

## Reporter Scheduler / Vercel Cron

Highlander Today includes a Vercel cron configuration for the complete reporter morning-desk pipeline. One authenticated run fetches due public sources, refreshes durable story candidates, evaluates the daily coverage goal, creates a reporter run for the selected lead, and generates editor-reviewable analysis/article drafts when the source packet already clears the deterministic readiness gates.

### Current Scheduled Path

The scheduled route is:

```text
/api/admin/reporter/daily-coverage/run/highlander-today
```

### Current Schedule

The repo `vercel.json` currently schedules it:

- once per day at `10:15 UTC`

This daily cadence was chosen because Vercel Hobby plans only allow daily cron execution.

### Important Behavior

- Vercel cron invokes route handlers with `GET`
- the route is already coded to accept that
- the route uses `CRON_SECRET` bearer auth automatically

### Scheduler Setup Steps

1. Add `CRON_SECRET` to Vercel Production.
2. Optionally add `REPORTER_SCHEDULER_TOKEN` if you want a second manual bearer-token path.
3. Redeploy production so Vercel reads `vercel.json`.
4. In Vercel, open `Settings`.
5. Open `Cron Jobs`.
6. Confirm the cron job appears for `/api/admin/reporter/daily-coverage/run/highlander-today`.
7. After the first scheduled run, verify the morning decision and ranked candidates in `/admin/reporter` and the full source/candidate detail in `/admin/reporter/sources`.

### Manual Testing

You do not need to wait for the cron.

You can test the same runner manually:

- source fetching alone can still be tested with `Run Due Sources` in `/admin/reporter/sources`
- the complete morning pipeline can be tested by calling `/api/admin/reporter/daily-coverage/run/highlander-today` with bearer auth

### If The Cron Job Does Not Appear

Check these in order:

1. Was the updated code pushed to the production branch?
2. Did production deploy after the code landed?
3. Does `vercel.json` exist in the repo root?
4. Are you looking at the correct Vercel project?
5. Are you looking at the production project settings, not only a preview deployment?

## Deployment Commands And Preflight

Use the repo-side env check before production deployment work:

```bash
npm run deploy:check-env -- --mode production --env-file .env
```

This checks:

- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- MaxMind presence
- R2 presence
- email presence
- `CRON_SECRET`
- `REPORTER_SCHEDULER_TOKEN`

### Main Verification Commands

Before or around deployment, the main verification sequence is:

```bash
npm run lint
npm run test:unit
npm run typecheck
npm run build
```

## Step-By-Step: Redeploy On Vercel

1. Push the intended code to the production branch.
2. Sign in to Vercel.
3. Open the Highlander Today project.
4. Open `Deployments`.
5. Find the latest production deployment.
6. Use the deployment menu.
7. Click `Redeploy`.
8. Wait for the deployment to finish.
9. Verify the deployment status is successful.

Use this after:

- changing env vars
- changing `vercel.json`
- changing auth setup
- changing upload/storage settings

## Production Smoke Test Checklist

After deployment, verify these:

### Site / Domain

- `https://highlander.today` loads
- `https://www.highlander.today` resolves correctly if expected

### Auth

- credentials login works
- Google login works
- no callback URL mismatch appears

### Uploads

- upload a test image from a wired form
- confirm the returned URL uses the CDN/R2 public host

### Reporter Scheduler

- confirm cron appears in Vercel settings
- manually test `Run Due Sources` in `/admin/reporter/sources`
- after the scheduled run, confirm source health / fetch records update

### Email

- if applicable, verify any protected email test route or live invitation flow

## Database / Production Schema Reminder

Vercel deployment does not automatically guarantee that the production database schema is current.

Important rule:

- `prisma db push` is environment-specific

That means:

- running it locally updates local DB only
- running it in the production environment updates production DB only

When the deployed code depends on new Prisma schema changes, make sure the intended production database has been updated before treating the deploy as complete.

## Known Deferred / Non-Launch Items

These should stay visible:

- Facebook OAuth remains intentionally deferred
- reporter scheduling is a bounded one-pass morning pipeline, not a durable background queue; failed runs remain visible through the cron response and reporter source/decision state
- broader production hardening such as multi-instance persistent rate limiting is still a future concern

## Troubleshooting Quick Reference

### Auth failure after deploy

Check:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- Google redirect URI
- whether production was redeployed after env changes

### Upload failure after deploy

Check:

- all `R2_*` vars
- `R2_PUBLIC_URL`
- whether production was redeployed after env changes

### Cron appears but route does not work

Check:

- `CRON_SECRET`
- route path in `vercel.json`
- production deploy completed successfully
- `/admin/reporter/sources` shows fetch history or errors

### Cron does not appear at all

Check:

- code with `vercel.json` actually reached production
- the deploy happened after that code landed
- you are viewing the correct Vercel project

## File Maintenance Rule

Keep this file focused on Vercel operator setup.

When Vercel-facing requirements change:

- update `VERCEL.md`
- update `.env.example` if env vars changed
- update `scripts/check-deployment-env.ts` if the env validation contract changed
- update `README.md` only when the general repo-facing setup story also changes

## Reporter Luna policy — 2026-10-12

Owner requested all OpenAI Reporter actions move to GPT-6 Luna (`gpt-6-luna`) with medium reasoning. This supersedes earlier model defaults. Shared routing pins source analysis, article drafting, interviews, declared extraction/follow-up/classification tasks and bounded retries; stale model/effort overrides are rejected. Align global and per-task REPORTER_MODEL_* environment values across production, preview and development. Provider/API credentials, source grounding and explicit human publication remain unchanged. Official compatibility: https://developers.openai.com/api/docs/models/gpt-6-luna. No paid inference is required for configuration/routing verification.

Verification: exact scoped source installed with npm ci from the committed lock; lint, 53 unit suites/219 tests and production build passed. Mocked requests verify Luna/medium in direct generation, source analysis, interviews, risk paths and retries. All 16 model/effort settings verified in production, preview and development. Paid inference and production editorial writes were not exercised. Earlier dependency audit findings remain unchanged; unrelated hardening edits are excluded.


## Reporter research release — 2026-10-12

Owner authorized commit, push and deploy. Scope: automatic public retrieval, citation following, bounded primary/independent-source search, passage-grounded claim assessment, developed article drafting, and incomplete-reporting conversion/publication guards. Both manual and daily drafting use the shared service. No schema/environment/cron changes. Existing model policy remains GPT-6 Luna/medium. The release includes direct htmlparser2 10.1.0; unrelated hardening and documentation migration remain excluded.

Full local-tree verification passed 289 tests/build/typecheck; a public live-model trial produced a grounded four-paragraph brief. Exact release passed npm ci, lint, standalone typecheck, all 57 unit suites/250 tests and production build (Next 15.5.26). Five existing Reporter browser cases passed against that build using the isolated PostgreSQL test database; generation HTTP was stubbed, review/publication writes were real and local. Both manual/scheduled traced-file manifests include the research prompts. Production deployment and live checks remain pending. Direct retrieval supports HTML/plain text, eight document attempts and a 150-second research budget. PDF/interactive evidence and contacting sources remain outside this implementation.

Exact-release dependency inspection: `npm ci` passed. Runtime audit retains 11 baseline findings (7 high/4 moderate); full audit reports 45 including one developer-tool critical. No htmlparser2 advisory or unrelated package upgrade. Broader dependency remediation remains separate; this scoped release retains the deployed baseline’s known dependency risk. Rollback artifact: `dpl_BLq1wCAybuKZMk6FZhz4ihzxSkUs`.


## Reporter review actions release — 2026-10-12

Owner authorized commit, push and deployment of Cancel → Re-Run → Save → Publish. Cancel returns to Reporter; Re-Run creates a new draft through current research/writing with retrieval and assessment caches bypassed. Latest draft replaces editor text, retaining category, refreshing sources/notes and headline focus. Earlier drafts and saved article remain until explicit Save/Publish; failed Re-Run preserves unsaved edits. Tenant/role/review/publication guards remain. No schema, environment or cron changes. Unrelated local work excluded. Local broader checks: 291 unit tests, eight disposable-database browser cases, lint/typecheck/build passed; generation responses were stubbed. Exact release: clean npm ci, lint, standalone typecheck, 57 unit suites/252 tests, production build (Next 15.5.26) and all eight PostgreSQL/Chromium browser cases passed (17.7s). Browser generation was stubbed; all writes were restricted to the disposable local test database. Runtime audit retains the preceding release baseline of 11 findings (7 high/4 moderate), with no dependency changes. Production deployment pending. Rollback: research release 31b76de / dpl_8B9EdVuJMnWE5YewY4PV1V7iQwKt.


## Reporter article images release — 2026-10-12

Owner authorized commit/push/deploy. Review & Publish now attaches a featured image (JPG, PNG or WebP up to 5MB), previews/removes it, and accepts an optional 300-character caption/photo credit. Save/Publish retain image metadata; Re-Run keeps the featured image/credit. Additional inline images use the existing Story toolbar. Upload pending disables conflicting footer actions. Existing tenant/role/version/publication guards remain; image URLs are validated and omitted metadata preserves old-client compatibility. Shared uploader includes visible removal, accessible previews/errors and readable helper text. No schema/environment/cron/dependency changes; unrelated local work excluded. Local broader verification: 298 unit tests, nine browser cases, lint/typecheck/build and accessibility/mobile checks passed; upload/generation HTTP stubbed and database writes disposable-local only. Exact release: clean npm ci, lint, standalone typecheck, 57 unit suites/259 tests, production build (Next 15.5.26) and nine PostgreSQL/Chromium browser cases passed (26.7s), including accessibility/mobile checks. Upload/generation HTTP stubbed; persistence restricted to disposable localhost test database. Production upload configuration variable names present (no values exposed). Runtime audit retains unchanged baseline 11 findings (7 high/4 moderate). Deployment pending. Rollback: 5d51299 / dpl_2MySn8QGjMZvxTWciiwzTWm96eeq.


## Reporter queue archive release — 2026-10-12

Editor Ready now offers Archive beside Review & Publish for users with reporter edit permission. It removes the story from the queue while retaining drafts, sources and any saved article. Failures remain visible in the row. Uses the existing tenant-scoped status endpoint; no schema, dependency or environment changes. Owner authorized commit, push and deployment. Exact-release clean npm ci, lint, standalone typecheck, 58 unit suites/264 tests, Next 15.5.26 production build and ten Chromium/PostgreSQL workflow cases passed (28.1s). Archive error/retry and retention verified against the disposable localhost test database. Generation/upload services stubbed. Runtime audit retains prior 11 findings (7 high/4 moderate); dependencies unchanged. No production story archived. Rollback: cd3040db1eecfbf614a53e4b46ee0cf9e6d838f2.


## Reporter hero-image release — 2026-10-13

Owner authorized this scoped release. Conceptual editorial hero-image generation, review/regeneration/discard/selection, AI disclosure and existing Save/Publish persistence. Production uses existing OpenAI/R2 settings and default gpt-image-2.5-flare; no environment changes required. No schema/dependency/text-model/cron changes. Exact source: clean npm ci, lint, typecheck, 61 unit suites/317 tests, production build (Next 15.5.26) and isolated PostgreSQL/Chromium hero-image workflow passed (8.0s); provider image response stubbed, actual Save/reload/Publish restricted to disposable local test database. Browser case: npm exec -- playwright test --config=tests/browser/reporter-hero-image.config.ts with HIGHLANDER_TEST_DATABASE_URL set to localhost highlander_today_test. Existing dependency baseline remains 11 runtime audit findings (7 high/4 moderate), 45 total (one developer-tool critical); unrelated hardening excluded. Production OpenAI/R2 setting names verified present without revealing values; no image-model override. Deployment follows this commit. Rollback: 71227de (A2RL9F36k3D2i22vLqRQX7x82u8t).


## Homepage hero replacement release — 2026-10-16

Owner authorized scoped commit, push and deployment. Article hero replacement prepends the previous hero to supporting links, deduplicates old/new heroes, retains remaining link order and drops the last link at capacity. Explicit Save Curation and other content-box behavior retained. No API/schema/dependency/environment/schedule changes. Broader dirty/concurrent work excluded. Exact release Node22.23.2: clean npm ci, lint/typecheck, 383 unit tests (70 suites), Next15.5.26 production build and isolated PostgreSQL/Chromium save/reload regression pass (6.4s). Two-link/full-list replacement verifies unsaved state, ordered persistence and reload. Fresh migrations pass; drift retains the inherited three Reporter morning-slate foreign-key/index naming differences. Audits retain baseline 11 runtime (7 high/4 moderate) and 45 total (35 high/9 moderate/1 developer critical); no dependency changes. Deployment pending. Rollback baseline f60522f / E1cSzK5x8J6c5J6ZDEdTcWXAYUKg.
