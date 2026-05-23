# Vercel Setup And Deployment Guide

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
- reporter source scheduler: `Vercel Cron`

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

Highlander Today now includes a Vercel cron configuration for the reporter monitored-source runner.

### Current Scheduled Path

The scheduled route is:

```text
/api/admin/reporter/monitored-sources/run-due/highlander-today
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
6. Confirm the cron job appears for `/api/admin/reporter/monitored-sources/run-due/highlander-today`.
7. After the first scheduled run, verify the results in `/admin/reporter/sources`.

### Manual Testing

You do not need to wait for the cron.

You can test the same runner manually:

- by using `Run Due Sources` in `/admin/reporter/sources`
- or by calling the route directly with bearer auth

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
- reporter scheduling is currently a one-pass cron-friendly runner, not a durable background queue
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
