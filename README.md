# Highlander Today

Highlander Today is a multi-tenant local community platform for Cambria Heights, PA. It combines local content, events, a store-based marketplace, Help Wanted postings, private messaging, and a trust-based membership model built around real identity and vouching.

This README is the repo-facing setup and architecture overview. The deeper running project log lives in [PROJECT-STATUS.md](/Users/dennisdestjeor/work/highlander-today/PROJECT-STATUS.md).

Repository:

- GitHub: `https://github.com/dsjrego/highlander-today`
- Default branch: `main`
- Domain registrar / current provider: `Namecheap`

## Current Product Scope

Active product areas:

- Local Life articles with moderation, comments, drafts, category filtering, and homepage curation
- Events listing and submission
- Store-based marketplace with storefronts, admin store approval, trusted-user seller messaging, and listing lifecycle states
- Help Wanted board for employment, service requests, and gig/task postings
- Private messaging with blocking enforcement and unread tracking
- Community roadmap / feature-prioritization with ordered ballots and bounded domain-specific weighting
- Trust, vouching, suspension, audit logging, and role-based permissions

Not currently part of the live product:

- Classifieds
- Galleries
- Full ecommerce checkout, payments, shipping, and inventory workflows
- Delivery jobs MVP
- Restaurant ordering

## Tech Stack

- Next.js 14 App Router
- TypeScript
- PostgreSQL 16
- Prisma ORM
- NextAuth.js v4 with Credentials and Google providers
- Tailwind CSS
- TipTap editor for rich article editing
- isomorphic-dompurify for HTML sanitization
- Sharp for image processing
- Jest + React Testing Library
- D3.js

## Important Architecture Notes

- Canonical Prisma schema path is `prisma/schema.prisma`. Do not use or recreate a root-level `schema.prisma`.
- Database access should import `db` from `@/lib/db`.
- Active auth config lives at `src/app/api/auth/[...nextauth]/route.ts`.
- Do not reintroduce a Prisma adapter for auth. The app uses JWT sessions and `PrismaAdapter` breaks the credential-login path in this project.
- Middleware sets request headers such as `x-user-id`, `x-user-role`, and `x-user-trust-level` for `/api/*`; many active routes rely on those headers.
- The canonical article route family is `/local-life/*`. Legacy `/articles/*` exists only for backward-compatibility redirects.
- Categories are dynamic from the database. Do not hardcode category names or slugs.

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop or Docker Engine

### Local database port

Postgres runs in Docker on port `5433`, not `5432`.

This project intentionally uses `5433` because many local machines already have a host Postgres instance on `5432`, and using `5432` can cause the app to connect to the wrong database.

### Quick start

```bash
npm install
docker-compose up -d
npm run db:generate
npm run db:push
npx prisma db seed
SUPER_ADMIN_EMAIL=admin@highlandertoday.local SUPER_ADMIN_PASSWORD='ChangeMe123!' npm run db:create-super-admin
npm run dev
```

App URL:

```text
http://localhost:3000
```

### Environment

Create `.env` with at least:

```env
DATABASE_URL=postgresql://<db-user>:<db-password>@127.0.0.1:5433/highlander_today?connect_timeout=10&sslmode=disable
NEXTAUTH_SECRET=replace-with-a-real-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Optional / future-facing variables include upload storage and encryption settings. See `.env.example`, but prefer the values in `PROJECT-STATUS.md` when there is a mismatch.

### Initial admin bootstrap

The structural seed creates:

- Community: `Highlander Today`
- Categories
- Homepage sections
- Default site settings

It does not create any user accounts.

Create the first Super Admin explicitly:

```bash
SUPER_ADMIN_EMAIL=admin@highlandertoday.local SUPER_ADMIN_PASSWORD='ChangeMe123!' npm run db:create-super-admin
```

The script requires a strong password, creates the user if needed, and ensures the membership role is `SUPER_ADMIN`.

## Main Routes

Public and user-facing routes:

- `/`
- `/local-life`
- `/local-life/[id]`
- `/local-life/submit`
- `/events`
- `/events/submit`
- `/marketplace`
- `/marketplace/[id]`
- `/marketplace/stores/[id]`
- `/marketplace/stores`
- `/help-wanted`
- `/help-wanted/[id]`
- `/help-wanted/submit`
- `/help-wanted/manage`
- `/roadmap`
- `/roadmap/[id]`
- `/roadmap/submit`
- `/roadmap/manage`
- `/messages`
- `/messages/[conversationId]`
- `/profile/[id]`
- `/profile/edit`
- `/search`

Admin and staff routes:

- `/admin/content`
- `/admin/homepage`
- `/admin/stores`
- `/admin/roadmap`
- `/admin/users`
- `/admin/trust`
- `/admin/bans`
- `/admin/audit`

Known placeholders / partial admin areas:

- `/admin` dashboard is still placeholder-level
- admin categories CRUD is partial
- settings persistence still needs cleanup
- `/experiences` and `/arcade` landing pages exist but are not complete product surfaces

## File Uploads

- Active endpoint: `src/app/api/upload/route.ts`
- Active component: `src/components/shared/ImageUpload.tsx`
- Local development storage: `public/uploads/{context}/`
- Supported formats: JPEG, PNG, WebP, GIF
- Current limit: 5MB
- Production uploads now use Cloudflare R2 when the required env vars are configured
- Local development still writes to `public/uploads/{context}/`

### Production upload setup (Cloudflare R2)

Production uploads are already live on Cloudflare R2 for `highlander.today`. The app uses these variables when production storage is configured:

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=highlander-today
R2_PUBLIC_URL=https://cdn.example.com
```

Operator sequence for a fresh environment:

1. Create an R2 bucket for production uploads, for example `highlander-today`.
2. Create an R2 API token with object read/write access scoped to that bucket and save the access key ID and secret.
3. Attach a public custom domain to the bucket, for example `cdn.highlander-today.com`.
4. Create the required DNS record in the authoritative DNS provider for the domain. For the live production setup, DNS is managed in Cloudflare.
5. Add the five variables above to the Vercel production environment.
6. Redeploy after saving the variables.
7. Verify production uploads from any wired form and confirm the returned file URL uses the configured `R2_PUBLIC_URL` host rather than `/uploads/...`.

Notes:

- `R2_ACCOUNT_ID` is enough for the app to derive the S3-compatible endpoint automatically.
- `R2_PUBLIC_URL` must be the final public asset base URL, not the private R2 API endpoint.
- If production uploads return `Upload storage is not configured for production`, at least one required variable is missing in Vercel.

## Production Auth Setup

The current launch auth surface is credentials plus Google OAuth on the final production domain:

```env
NEXTAUTH_URL=https://highlander.today
NEXTAUTH_SECRET=<strong-random-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Set those values in the Vercel production environment, redeploy, and verify that the deployed app is serving auth from `https://highlander.today` rather than a preview or localhost URL.

For a repo-side preflight check, run:

```bash
npm run deploy:check-env -- --mode production --env-file .env
```

That command validates presence and format for the hosted auth env variables without printing secret values. It also warns if MaxMind or R2 variables are missing from the checked env file.

### Production OAuth callback URLs

Use this production callback URL in the Google dashboard:

- Google redirect URI: `https://highlander.today/api/auth/callback/google`

Recommended allowed origins / app domains:

- `https://highlander.today`
- `https://www.highlander.today`

### Operator checklist

1. In Vercel Production env vars, confirm `NEXTAUTH_URL` is exactly `https://highlander.today`.
2. Confirm `NEXTAUTH_SECRET` is present and does not differ across prod auth requests.
3. Confirm the current Google client ID/secret in Vercel matches the rotated local values before testing production login.
4. In Google Cloud Console, add `https://highlander.today` to Authorized JavaScript origins and `https://highlander.today/api/auth/callback/google` to Authorized redirect URIs.
5. Keep Facebook OAuth deferred until Meta business verification is complete; it is not part of the current launch auth surface.
6. After redeploy, test credentials login and Google login on `https://highlander.today/login`.
7. Verify each successful login creates or reuses the expected user record and records a `LoginEvent` / anomaly audit trail in production.

## Login Geolocation

Login anomaly logging now expects MaxMind credentials for public-IP geolocation:

```env
MAXMIND_ACCOUNT_ID=...
MAXMIND_LICENSE_KEY=...
```

Notes:

- The active login-event path uses MaxMind GeoIP2 City over HTTPS.
- If those variables are missing, login logging still works, but public-IP city/region/country enrichment is skipped.
- Localhost and private-network IPs are still tagged as `localhost` / `local` for development.

## Testing and Verification

Common commands:

```bash
npm run lint
npm run test:unit
npm run typecheck
npm run build
```

The current project status notes that these checks are back to being useful repo-wide gates for the active surface.

The repository now also includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs the same verification sequence on pushes to `main` and on pull requests.

## Deployment Notes

This repo is not production-ready by default. Before deployment, plan for:

- managed PostgreSQL
- object storage/CDN for uploads instead of local `public/uploads`
- secret management
- production-safe Super Admin bootstrap
- published Google/Facebook OAuth apps
- rate limiting and email notifications

The project includes a `Dockerfile`, but deployment work should happen after the repository is under source control and the remaining deployment-facing docs/config are cleaned up.

Current domain-management note:

- Assume Namecheap is the active registrar and current DNS starting point unless the domain is later moved to Cloudflare or another DNS provider on purpose.

Minimum pre-launch verification sequence:

```bash
npm run lint
npm run test:unit
npm run typecheck
npm run build
```

If those pass, follow the production bootstrap flow from `PROJECT-STATUS.md`:

```bash
npm run db:push
npx prisma db seed
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

## Source Of Truth

If README and project status ever disagree, use these in order:

1. `PROJECT-STATUS.md`
2. Active source files
3. `README.md`
