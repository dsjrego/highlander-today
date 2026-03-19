# Highlander Today

Highlander Today is a multi-tenant local community platform for Cambria Heights, PA. It combines local content, events, a store-based marketplace, Help Wanted postings, private messaging, and a trust-based membership model built around real identity and vouching.

This README is the repo-facing setup and architecture overview. The deeper running project log lives in [PROJECT-STATUS.md](/Users/dennisdestjeor/work/highlander-today/PROJECT-STATUS.md).

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
- NextAuth.js v4 with Credentials, Google, and Facebook providers
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
npm run dev
```

App URL:

```text
http://localhost:3000
```

### Environment

Create `.env` with at least:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/highlander_today?connect_timeout=10&sslmode=disable
NEXTAUTH_SECRET=replace-with-a-real-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

Optional / future-facing variables include upload storage and encryption settings. See `.env.example`, but prefer the values in `PROJECT-STATUS.md` when there is a mismatch.

### Seeded local account

Current local seed includes:

- Community: `Highlander Today`
- Admin user: `admin@highlandertoday.com`
- Password: `admin123`

This is for local development only and should not be used as a production bootstrap pattern.

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
- Cloudflare R2 is planned but not yet configured in the active local flow

## Testing and Verification

Common commands:

```bash
npm run lint
npm run test:unit
npx tsc --noEmit
```

The current project status notes that these checks are back to being useful repo-wide gates for the active surface.

## Deployment Notes

This repo is not production-ready by default. Before deployment, plan for:

- managed PostgreSQL
- object storage/CDN for uploads instead of local `public/uploads`
- secret management
- production-safe Super Admin bootstrap
- published Google/Facebook OAuth apps
- rate limiting and email notifications

The project includes a `Dockerfile`, but deployment work should happen after the repository is under source control and the remaining deployment-facing docs/config are cleaned up.

## Source Of Truth

If README and project status ever disagree, use these in order:

1. `PROJECT-STATUS.md`
2. Active source files
3. `README.md`
