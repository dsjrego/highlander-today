# Highlander Today — Project Status

> **Last updated:** 2026-04-13 (session 151)
> **Purpose:** Fast-start context for the next session. Read this file first, then open only the supporting docs relevant to the active slice.
> **Detailed reference:** `PROJECT-STATUS-REFERENCE.md` preserves the fuller implementation ledger, rollout history, verification notes, deployment runbook, and infrastructure rationale that used to live here.

> **Open polish note:** the live `/profile/[id]` header still needs one more pass on avatar click-target density. The clickable avatar boundary was tightened already, but the user still wants the avatar/content grouping to feel more compressed on that page specifically.
>
> **Open mobile masthead note:** the live phone masthead received another compact layout pass. Search/messages/account actions are tighter and the mobile title/logo row is better aligned than before, but the user should still visually confirm the small-screen masthead on a real device before treating it as fully settled.
>
> **Open mobile page-header note:** the shared `InternalPageHeader` now has explicit mobile alignment/compactness controls and the `Directory` header is using that cleaned-up path rather than brittle page-level overrides. Treat the mobile page-header system as materially improved, but still worth a quick browser/device QA pass before considering it complete.
>
> **Recipe system note:** the first dedicated recipe domain is now live. Recipes are no longer just an article-body styling experiment; Prisma now includes first-class recipe tables, structured JSON/form ingest, recipe-specific admin moderation, section/category support through `CategoryContentModel.RECIPE`, and a dedicated homepage recipe lane. The older `editorial-recipe.css` and HTML-import work should still be treated as temporary bridge/presentation work for editorial content, not as the long-term persistence model for recipes.

> **Session 151 note:** the food/recipe system crossed from planning into first implementation. Prisma now includes `Recipe`, `RecipeIngredientSection`, `RecipeIngredient`, `RecipeInstructionStep`, `RecipeNote`, and `RecipeMedia`; recipe notes now include `TROUBLESHOOTING`; recipe media uses existing image storage plus YouTube/Vimeo embeds; `/recipes`, `/recipes/[id]`, and `/recipes/submit` now run on structured recipe data; `/api/recipes` and `/api/recipes/import` support canonical JSON/form ingest; `/admin/recipes` now mirrors the article/event moderation pattern; `recipes-food` is now a real `RECIPE` category model; section pages switch to recipe behavior when the active category is recipe-backed; and homepage curation now supports a dedicated `FEATURED_RECIPES` lane with its own admin drag-and-drop workflow. Any environment receiving these changes must run `npx prisma db push --schema prisma/schema.prisma` before recipe/homepage admin flows will work.
>
> **Session 152 note:** gardening/merchant planning is now documented in `GARDENING-MERCHANTS-PLAN.md` and `GARDENING-IMPLEMENTATION-PLAN.md`. The current recommendation is to treat gardening as the structural parallel to recipes but not as a copy of the recipe model: tenant-level growing-zone/frost metadata should drive future cross-tenant relevance, `GardenProject`/`PlantProfile`-style structured models should eventually sit between editorial content and commerce, and local merchant interoperability should center on project kits for plants, tools, materials, and supplies rather than isolated marketplace-style products.

> **Session 91 note:** directory foundations are now live. `User` now supports opt-in directory inclusion, Prisma now includes `Organization` / `OrganizationMembership` plus structured organization child models, `/admin/organizations` now exists as a compact admin moderation/create surface, and `/directory` now reads real opted-in people plus approved organizations with unified results, yellow-pages-style type dropdown pills for businesses/organizations, sorting, and pagination.
>
> **Session 92 note:** after the directory rollout hit production, the live `/directory` runtime error was traced to the production database not yet having the new schema. The fix was a production `npx prisma db push --schema prisma/schema.prisma`, which added `users.isDirectoryListed` and the new `organizations` table set. Treat that schema push as required whenever deploying the new directory models to an environment that has not been updated yet.
>
> **Session 93 note:** the admin navigation order was tightened again so `Homepage Curation` now sits directly under `Dashboard` and `Users` sits directly under `Navigation`. `/admin/users` was also rebuilt into the same compact `admin-card` / `admin-list` paradigm used by `Articles`, `Events`, `Navigation`, and `Organizations`, now showing `Email`, real `Last Seen` from latest `LoginEvent`, `Vouched By` names, color-coded inline actions with icons, and an inline `Message` dialog that sends through `/api/messages`.
>
> **Session 94 note:** `/directory` people rows now expose a client-side `Message` action in the contact column for authenticated viewers, opening the same inline direct-message dialog pattern used on `/admin/users` and sending through `/api/messages` before routing into the conversation thread.
>
> **Session 95 note:** a Vercel deployment failure was traced to an unused `stats` state declaration in `/admin/users`; that dead state path was removed so `npm run typecheck` and `next build` pass again. Repo warning cleanup also tightened the `/admin/content` fetch effect dependency and intentionally suppressed `@next/next/no-img-element` in the current raw-image preview/upload surfaces so `npm run lint` is clean again.
>
> **Session 96 note:** the dedicated `/profile/edit` route was removed and its contents were folded into the owner-only `Account Settings` tab on `/profile/[id]`. That tab now appears first for the profile owner, the owner no longer sees the `About` tab, the public-facing content tabs were simplified to `Articles` and `Events`, locked identity fields now open a no-JS dialog-style popover instead of showing the old warning pill, the directory-listing control now sits at the top of the settings form, and the profile header metadata now reads `[community name] • Last seen: <date>` using the latest `LoginEvent`.
>
> **Session 97 note:** the public navigation bar now treats top-level categories with children as dropdown triggers only rather than clickable destinations, so users must choose a child category instead of landing on filler parent pages. The admin sidebar also now alternates row background tones to reduce visual monotony while preserving the compact operational layout.
>
> **Session 98 note:** invitation and outbound email planning is now documented in `INVITATION-EMAIL-PLAN.md`, covering the proposed trusted-member email invite flow, quota-aware outbound send queue, provider direction, and post-registration in-system vouch prompts.
>
> **Session 99 note:** outbound email foundations are now wired for Brevo via env-driven config, a reusable `src/lib/email.ts` transactional sender, `.env.example` / deployment-env validation coverage, and a protected admin test route at `/api/admin/email/test` for controlled verification before building invitations on top.
>
> **Session 100 note:** live Brevo testing confirmed the app can send transactional email, but first-send inbox placement hit Gmail spam. Treat outbound email as supporting infrastructure rather than the primary trust bootstrap. The current product conclusion is to prioritize in-product trust mechanisms like visible new-member presence and direct vouch-request flows over email-dependent onboarding.
>
> **Session 101 note:** trust bootstrap now has a first in-product implementation. `Category` supports `minTrustLevel` (default `ANONYMOUS`) so trusted-only nav items can stay DB-driven, and the new `/help-us-grow` route is now a trusted/staff-only stewardship surface showing same-community `REGISTERED` members with join dates plus per-row `Message` actions in the same table language as `/directory`. The message-thread header now also exposes `Vouch` when the other participant is still `REGISTERED`, and the vouch flow now treats elevated roles (`CONTRIBUTOR` and above) as trust-capable rather than requiring literal `TRUSTED`. Any environment receiving this change must run `npx prisma db push --schema prisma/schema.prisma` so `categories.minTrustLevel` exists before the categories APIs load.
>
> **Session 102 note:** the live app footer was simplified by removing the `Quick Links` column from `src/app/layout.tsx`, leaving the active footer on a tighter two-column layout with `Support` and `Highlander Today` only. The older unused `src/components/layout/Footer.tsx` was updated in parallel so its structure no longer drifts from the live footer language if that component is revisited later.
>
> **Session 103 note:** `/admin/events` now has a `+ Event` create tab matching the compact admin pattern used by organizations, including direct admin event creation, initial status selection, image upload, and an optional organization link with inline organization-name filtering. `Event` now carries optional `organizationId`, so any environment receiving this update must run `npx prisma db push --schema prisma/schema.prisma` before the new admin event flow can persist linked organizations.
>
> **Session 104 note:** event locations are now first-class shared records rather than freeform strings. Prisma now includes `Location`, `Event.locationId`, and optional `Event.venueLabel`; both `/admin/events` and `/events/submit` now create/select reusable structured locations inline, public/admin event surfaces now render canonical location data, and event search/homepage metadata now read from the shared location model. Any environment receiving this update must run `npx prisma db push --schema prisma/schema.prisma` so the new `locations` table and `events.locationId` column exist before the event flows load.
>
> **Session 105 note:** the first public organization detail slice is now live. Approved organizations now resolve at `/organizations/[slug]`, `/directory` organization rows now link into that canonical public page, and the new server-side organization loader centralizes approved/public filtering for organization details, locations, departments, contacts, roster visibility, and linked upcoming events. Organization custom domains and standalone shell behavior remain planned follow-on work documented in `ORGANIZATION-SITE-PLAN.md`.
>
> **Session 106 note:** `/admin/organizations/[id]` is now a real management surface rather than a read-only summary. Admins can now edit core organization profile fields plus locations, departments, contacts, and membership roster visibility/title state from one page, backed by new focused admin organization APIs under `/api/admin/organizations/[id]/*`. This is the first practical input layer for keeping the new public `/organizations/[slug]` page current; self-claim/self-management and custom-domain flows are still pending.
>
> **Session 107 note:** the unrelated JSX regression in `/events/submit` was corrected, restoring a clean verification baseline. `npm run lint` and `npm run typecheck` now pass again with the new public organization page and admin organization management surfaces in place.
>
> **Session 108 note:** `/admin/organizations/[id]` now uses the same compact admin-card tab language as the other major admin surfaces. The page header now reads `Organization > {name}` with the organization icon, the old summary stat cards were removed, the management UI is split into `Details`, `Locations`, `Departments`, `Contacts`, `Members`, and `Events`, the `Details` tab now supports banner-image upload for `bannerUrl`, and linked organization events are visible from the new `Events` tab with direct links into `/admin/events/[id]`. The `+ Organization` create tab on `/admin/organizations` was intentionally kept as a base-details-only creation form rather than inheriting the full detail-management tabs.
>
> **Session 123 note:** the organization-detail `Forms` tab now follows the same compact `admin-list` row structure used by the article admin tabs, and it now uses a nested subtab split for `Forms` and `+ Form` so list management and creation stay separate. Existing forms render in a filterable shared table/list, and the heavier form/question editor only opens inline after choosing `Manage`. Use `ADMIN-LIST-DESIGN.md` as the canonical design note for this list-first admin pattern and its nested admin-subtab rule.
>
> **Session 124 note:** public organization-form links now resolve at `/organizations/[slug]/forms/[formSlug]` instead of 404ing. The first live slice is a read-only public form page with sign-in/trust/status gating and question preview, so admin `Share URL` links are real URLs now even though actual submission handling is still pending.
>
> **Session 125 note:** published organization forms can now accept a first-pass public submission at `/organizations/[slug]/forms/[formSlug]`. Signed-in users who meet the configured trust threshold can answer the questions and submit once; the page now renders real inputs instead of a read-only preview, and repeat visits show an already-submitted state for that user.
>
> **Session 126 note:** admin organization-form management now includes a first-pass `Results` view inside each expanded form record. Admins can switch between `Form` and `Results`, see response counts and latest-response timing, and review saved answers per question with respondent names and submission timestamps.
>
> **Session 127 note:** the admin organization-detail `Forms` UI was tightened again for denser day-to-day use. The top-level forms subtabs now read `List` and `+ Form`, expanded forms now use `Details`, `Questions`, `Results`, and `+ Question`, question rows are list-first with inline expansion, and redundant form-header metadata/copy was removed so the management view stays compact.
>
> **Session 128 note:** the events system now has a first recurring-series implementation while still preserving the one-day-per-event structure. Prisma now includes `EventSeries`, event creation can generate weekly, monthly-on-date, and monthly-on-weekday occurrences as separate `Event` rows, and public/admin event detail pages now show session/series context. Event creation now also treats organizations as required rather than optional: `/events/submit` and `/admin/events` both use search-first organization pickers, and public event submission can create a pending organization inline and still submit a pending event attached to that pending organization. Any environment receiving this change must run `npx prisma db push --schema prisma/schema.prisma` before using the new recurrence flow.
>
> **Session 129 note:** recurring-event management now has a first scoped edit/delete pass. `/api/events/[id]` now supports `SINGLE`, `FUTURE`, and `SERIES` scope handling for recurring events, admin event detail pages now include an inline edit surface for those scopes, and remaining series sessions are renumbered/recounted automatically after scoped edits or deletions. Current boundary: series-wide schedule/cadence changes are still intentionally limited, so date/time edits remain single-occurrence only for now. This same session also tightened the mobile public shell and homepage polish: the shared `InternalPageHeader` now has explicit mobile alignment/compactness controls, the mobile masthead/action row was compacted again, homepage `Coming Soon` cards now span the full mobile column width, and autogenerated article fallback hero images on the homepage are now framed with `contain`/centering so branding text is not clipped on narrow screens.
>
> **Session 130 note:** recurring-event management now covers full scoped schedule regeneration instead of non-schedule edits only. Admin event detail pages can now regenerate recurring dates/times/cadence for either the entire series or the selected event and future sessions; `FUTURE` schedule edits intentionally fork a new `EventSeries` from that occurrence forward so prior sessions keep their original recurrence history, while `SERIES` schedule edits regenerate the existing series in place. The helper/test baseline was tightened in parallel with focused recurrence coverage so weekly and monthly-weekday regeneration behavior is now protected by unit tests.
>
> **Session 131 note:** recurring-event tech debt received a focused hardening pass without adding product scope. Scoped recurring edit/delete orchestration now lives in `src/lib/event-series-mutations.ts` instead of remaining embedded in `/api/events/[id]`, route-level coverage now protects `FUTURE` edit/delete branching plus approval guards, direct service-level tests now cover series-wide cadence rewrites, missing-scope failures, author re-review behavior, and one-event-left cleanup, and shared event date/time parsing/formatting now lives in `src/lib/event-datetime.ts` and is used by event creation, recurring mutation logic, and the admin recurring editor. Treat recurring-event behavior as materially safer to change than before, but still do a short manual QA pass on the live admin recurrence flows before considering the loop fully settled.
>
> **Session 132 note:** admin operational tech debt received a smaller cleanup pass. The stale client-side placeholder `Site Settings` page was rewired to the existing live `/api/settings` route instead of faking save success with a timeout, and the `/admin` dashboard no longer shows placeholder `Events`, `Marketplace Listings`, pending-review, or recent-activity content. Those cards now read real community-scoped counts plus live `ActivityLog` rows. Verification also stayed clean after the recurring-event hardening work and these admin cleanups: `npm run lint`, `npm run typecheck`, and `npm run test:unit` all pass, with the current unit suite now covering recurring route logic, recurring mutation helpers, and shared event datetime helpers in addition to the older permissions/trust/marketplace tests.
>
> **Session 133 note:** early-stage rollout/community-buy-in strategy is now documented in `COMMUNITY-ANCHORING-LAUNCH-STRATEGY.md`. Treat that document as the canonical source for controlled local launch posture, validator/contributor/supporter sequencing, and "anchor before broadcast" framing. Keep funding details in `GRANT-STRATEGY.md`, `CAPITAL-PLAN.md`, `MONETIZATION-PLAN.md`, and `DONATIONS-TRANSPARENCY-PLAN.md` rather than duplicating them there.
>
> **Session 134 note:** cross-document strategy guardrails are now consolidated in `STRATEGIC-DECISIONS.md`. Use that file as the short canonical reference for stable strategic rules before opening more detailed launch, funding, monetization, or memorial planning docs.
>
> **Session 135 note:** historical-record and community-timeline planning is now documented in `HISTORICAL-EVENTS-SYSTEM-PLAN.md`. Treat that document as the canonical direction for a dedicated timeline/history repository that stays separate from the article system while still supporting article-idea generation, private family-history contribution, memoriam linkage, per-item sharing controls, and mandatory editorial curation before any family-submitted material becomes public community history.
>
> **Session 136 note:** place, coverage-area, and geographic-reach planning is now documented in `PLACE-COVERAGE-PLAN.md`. Treat that document as the canonical direction for a curated place model that stays separate from tenant identity, supports low-friction user location capture with structured selection plus text fallback, allows login-IP geolocation to inform geographic reach without auto-creating canonical places, and gives `SUPER_ADMIN` density-based expansion intelligence weighted toward distinct-user concentration rather than one heavy user's activity.
>
> **Session 137 note:** `PLACE-COVERAGE-PLAN.md` now also defines the first launch-critical product surfaces for geography: a `SUPER_ADMIN` place and tenant-coverage management interface, early user location capture aligned with the existing date-of-birth/profile-completion flow, and a `SUPER_ADMIN` geographic-density dashboard for identifying emerging coverage clusters and future tenant opportunities.
>
> **Session 138 note:** the first build order for geography is now documented in `PLACE-COVERAGE-IMPLEMENTATION-PLAN.md`. Use that document for the concrete rollout sequence across Prisma models, Pennsylvania place seeding/import, profile/location capture, `SUPER_ADMIN` place and tenant-coverage interfaces, observed-geo aggregation from existing login events, and the density-based geography dashboard.
>
> **Session 139 note:** place/coverage implementation has started. Prisma now includes first-pass `Place`, `PlaceAlias`, `TenantCoverageArea`, `UserPlaceRelationship`, and `ObservedGeoLocation` models; `/api/places` now exposes selectable-place search; and `/api/profile` now reads/writes current-location plus connected-community data against the new relationship model. Verification passed with `npx prisma validate --schema prisma/schema.prisma`, `npm run typecheck`, and `npm run lint`. The repo still follows the historical `prisma db push` workflow rather than a committed migrations history, so the attempted `prisma migrate dev --create-only` step failed with a generic schema-engine error and did not produce a migration file.
>
> **Session 140 note:** place seeding is now wired into `prisma/seed.ts` through the new `prisma/place-seed.ts` helper. Local bootstrap now seeds Pennsylvania state/county geography plus an initial municipality set around the founding footprint and near-term expansion targets, and the local database was successfully updated/sealed with `npm run db:push` plus an escalated `npm run db:seed`. Current seeded scope is 67 Pennsylvania counties and 9 initial municipalities; full statewide municipality import remains follow-on work rather than being complete yet.
>
> **Session 141 note:** the first user/admin geography surfaces are now live in code. Auth/session state now tracks missing current-location completion, the shared shell now redirects authenticated users without a current location into their own `Account Settings` tab to complete that field, `AccountSettingsPanel` now supports current-location search/select plus fallback text entry through `/api/places` and `/api/profile`, and `SUPER_ADMIN` now has first-pass `/admin/places` and `/admin/coverage` management surfaces backed by new `/api/admin/places` and `/api/admin/tenant-coverage` routes. Verification passed with `npm run typecheck` and `npm run lint`.
>
> **Session 142 note:** observed-geo and geography-reporting foundations are now live in code. `src/lib/observed-geo.ts` can aggregate existing login-event city/region/country data into `ObservedGeoLocation`, `SUPER_ADMIN` now has `/api/admin/observed-geo` and `/api/admin/geography` routes plus a first-pass `/admin/geography` dashboard, and the admin sidebar now exposes `Geography` alongside `Places` and `Coverage`. The current dashboard emphasizes declared current-resident density, observed distinct-user reach, and coverage gaps rather than raw traffic volume. Verification passed with `npm run typecheck` and `npm run lint`.
>
> **Session 143 note:** observed-geo curation is now live in code. `SUPER_ADMIN` can now open `/admin/observed-geo`, review aggregated login-location signals, search canonical places, match observed locations to curated `Place` records, or mark them ignored through the new `/api/admin/observed-geo/[id]` route. The admin sidebar now exposes `Observed Geo` as a dedicated operational surface rather than leaving location matching buried in the geography dashboard. Verification passed with `npm run typecheck` and `npm run lint`.
>
> **Session 144 note:** multi-tenant theming structure is now documented in `TENANT-THEMING-ARCHITECTURE.md`. Treat that document as the canonical direction for tenant-specific skins, light/dark theme support, seasonal overlays, and the boundary between DB-managed tenant identity/settings and code-managed theme manifests/tokens. Keep shared layout/component structure reusable, move visual decisions toward semantic theme tokens, and avoid storing arbitrary CSS in the database.
>
> **Session 145 note:** the first concrete rollout sequence for tenant theming is now documented in `TENANT-THEMING-IMPLEMENTATION-PLAN.md`. Use that document for the phase-1 file touch list, token scope, Highlander-first build order, and acceptance criteria before refactoring the shell onto a real tenant-theme layer.
>
> **Session 146 note:** multi-tenant theming phase 1 is now live in code and visually verified across the current user-facing shell. `src/lib/theme/*` now provides typed tenant manifests plus resolver/CSS-var plumbing, the shared shell/layout/footer/masthead/page-header layer now resolves tenant identity plus light/dark mode, development now includes a tenant/mode preview switcher, fallback/generated article imagery is tenant-aware, and a broad set of public route surfaces were refactored off Highlander-specific hardcoded colors onto shared semantic classes (`homepage-*`, `article-card-*`, `marketplace-summary-*`, `events-empty-state`, `member-recognition-panel`, `page-intro-copy`, etc.). Highlander Today and the second proof tenant (`River Valley Local`) were both visually QA’d through the dev preview flow. Admin remains intentionally less themed for now, but the standard going forward is that new user-facing UI should consume semantic theme classes/tokens by default rather than route-local color decisions.
>
> **Session 147 note:** `/admin/sites` is no longer a placeholder list. `SUPER_ADMIN` now has a real site provisioning surface with the same compact admin-card/tab language used elsewhere: `/admin/sites` supports `All Sites` plus `+ Site`, creation now provisions a real `Community` with optional primary `TenantDomain`, and `/admin/sites/[id]` now provides `Details`, `Domains`, and `Provisioning` tabs. The site detail flow supports editing core site identity, adding/updating/deleting domains, storing launch/theme/provisioning notes through `SiteSetting`, and directly managing tenant coverage areas from the site editor rather than forcing all tenant setup through the separate coverage dashboard. Verification passed with `npm run typecheck` and `npm run lint`.
>
> **Session 148 note:** tenant theming and site provisioning are now connected rather than parallel tracks. Runtime theme resolution now honors a site’s configured `theme_manifest_slug`, `/admin/sites/[id]` validates that slug against registered code manifests, and the shared shell now has a real production light/dark toggle in the masthead using the existing `theme-mode` cookie path. The dev preview switcher remains development-only, while the public toggle is now the live user-facing mode control. The Highlander masthead mark regression was also corrected by giving each rendered SVG mark its own gradient id so the blue/scarlet shield resolves consistently again.
>
> **Session 109 note:** the admin dashboard is starting to shed its static mock cards. `/admin` now reads the live user count from Prisma on the server and links that `Total Users` card into `/admin/users`; the old `News` card was also replaced with a live `Articles` card showing community-scoped `Pending`, `Approved` (`PUBLISHED`), and `Archived` (`UNPUBLISHED`) counts with a direct link into `/admin/articles`. The old placeholder `Pending Approvals` and `Recent Bans` cards were removed, while `Events` and `Marketplace Listings` are still placeholder values until their backing queries are wired.
>
> **Session 110 note:** organization inbox / CRM planning is now documented in `ORGANIZATION-INBOX-CRM-PLAN.md`. Current recommendation is to treat organization communication as a separate message domain rather than extending the existing user-to-user DM system, centered on durable role-based mailboxes, organization-scoped contact history, inbox threads/messages/internal notes, assignment, and future compatibility with later billing/payment records linked to the same organization contact profile.
>
> **Session 111 note:** `/directory` interaction rules were tightened again. The default people view now stays empty until search, while the top-level `Businesses`, `Government`, and `Organizations` category pills load full current-tenant results alphabetically and their hover/click behavior was split so the top-level pill navigates and the chevron opens subtypes. The old detail column was removed, the contact header now reads `Phone`, person-row messaging is now trust-gated (`TRUSTED` or trust-capable roles can compose; anonymous/registered users get an explanatory dialog), and the page now shows a persistent state banner that points anonymous viewers toward auth, registered viewers toward trust/profile completion, and trusted-but-not-listed viewers toward enabling directory inclusion. Self-serve organization listing/help copy is still intentionally deferred until a real submit/claim flow exists.
>
> **Session 112 note:** the directory viewer-state guidance banner was repositioned above the search filter so the auth/trust/listing requirements are visible before users interact with search. The trusted-user copy was also tightened so only the inline `profile settings.` text is linked instead of rendering a second-line CTA button.
>
> **Session 113 note:** grant positioning is now documented in `GRANT-STRATEGY.md`, framing Highlander Today as local community information infrastructure rather than a generic startup and prioritizing nonprofit/fiscal-sponsor readiness before outreach to funders like Press Forward, the Community Foundation for the Alleghenies, Lenfest, ARC, and PA Humanities.
>
> **Session 114 note:** blended funding sequencing is now documented in `CAPITAL-PLAN.md`, setting 12-month and 24-month floor/target/stretch capital ranges, recommended source mix across grants, sponsorships, donations, earned revenue, and founder bridge capital, plus operating rules for when to lean on each source.
>
> **Session 115 note:** `/directory` was visually tightened into a more compact search-first surface. The oversized standalone search button was removed in favor of an inline magnifying-glass submit inside the field, the nested search pill/card treatment was flattened, redundant empty-state helper copy was removed, `Businesses` / `Organizations` tabs were normalized to match the other filters visually, the old compressed sort menu was removed, and desktop sorting now happens through clickable `Name`, `Section`, and `Type` column headings only when results are present.
>
> **Session 116 note:** the follow-up `/directory` cleanup removed the remaining high-chrome helper copy and banner treatments. The page header now shows only `Directory` with no descriptive subcopy, viewer-state guidance now uses the same minimal plain-text pattern for every user state instead of tinted pills, the result-count line above search results was removed, and the page now keeps only the lean heading-based sort treatment plus the no-results message when needed.
>
> **Session 117 note:** the public phone header/navigation got a first mobile-specific pass. Search and messages were reduced to icon-only controls, the account trigger became a hamburger menu in the upper-right, and the wrapped top-level nav pills were removed from the visible phone masthead and moved into the hamburger as a vertical DB-driven mobile navigation surface with expandable section groups. The phone masthead/logo/title spacing and the `InternalPageHeader` mobile alignment remain partially unresolved and are intentionally parked as known follow-up polish rather than treated as complete.
>
> **Session 118 note:** CRUD/action icon standardization now applies to page-header actions too. If a page header has only one add/create action, treat the icon as the action and do not repeat the subject in the button text; the page-header title already provides that context, so the lone add control should be icon-only (with an accessible label/tooltip). Use subject text only when there are multiple sibling actions and disambiguation is actually needed.
>
> **Session 119 note:** mobile shell/header spacing and dark-shell fallback readability were tightened again. Public mobile `main` now uses a literal `2px` parent padding with `2px` top padding, `InternalPageHeader` now sits with zero margin inside that shell, and mobile page-header actions should default to icon-only unless multiple actions of the same CRUD type appear together and truly need text disambiguation. The remaining dark-on-dark visible `not found` fallbacks (marketplace listing/store, roadmap detail, and conversation-missing states) were also updated so their message text renders white against the dark background.
>
> **Session 120 note:** organization-linked forms/questionnaire planning is now documented in `ORGANIZATION-FORMS-PLAN.md`, covering the proposed organization-owned data model, question/option ordering, authenticated share-by-link access with `REGISTERED`/`TRUSTED` gating, response storage, and collated-results direction before implementation begins.
>
> **Session 121 note:** the first admin-side organization forms implementation is now in progress. Prisma now includes `OrganizationForm`, `OrganizationFormQuestion`, `OrganizationFormQuestionOption`, `OrganizationFormSubmission`, and `OrganizationFormAnswer`; `/admin/organizations/[id]` now has a `Forms` tab for creating/editing form metadata and questions. Any environment receiving this change must run `npx prisma db push --schema prisma/schema.prisma` before opening `/admin/organizations/[id]`, or Prisma will throw missing-table errors for `organization_forms`. Important operational reminder: `prisma db push` always targets the database referenced by the current shell's `DATABASE_URL`; running it locally against the local `.env` / Docker Postgres does **not** update production, and running it on production does **not** update local.
>
> **Session 121 shell note:** local shell helpers now exist in `~/.zshrc` for explicit schema pushes without keeping production `DATABASE_URL` exported in the default shell. Use `dbpushlocal` for the local Docker Postgres schema push and `dbpushprod` for the production schema push. Do not store the production URL in repo files or docs; the helper exists only in the user shell config.
>
> **Session 121 admin-list note:** the compact `admin-list` table treatment used by `/admin/articles` draft/pending/approved/archive tabs is now the canonical list style for admin operational surfaces. As admin screens are touched, prefer that shared dense table/list vocabulary over stacked card-per-record layouts unless the data is genuinely non-tabular. `DESIGN-SYSTEM-ARCHITECTURE.md` now records this as the reference rule.
>
> **Session 121 subscriptions note:** future paid memberships/subscriptions are now documented in `USER-SUBSCRIPTIONS-PLAN.md`. The current structural rule is to keep billing/subscription lifecycle separate from `UserCommunityMembership` and `OrganizationMembership`; existing membership tables continue to represent identity/role/relationship only, while any future paid access should land as a dedicated plans/subscriptions/entitlements subsystem.
>
> **Session 122 note:** trusted-user directory defaults and profile/admin controls were tightened without any schema changes. Users promoted or reinstated to `TRUSTED` are now automatically marked `isDirectoryListed = true`; `/admin/users` now includes a `Directory` filter with a `No directory` option for unlisted people; and `SUPER_ADMIN` can now open the `Account Settings` tab on any `/profile/[id]` page and edit that user through `/api/profile?userId=...`, including identity-locked fields. The lower account-action controls (`Change Password`, `Email Preferences`, `Deactivate Account`) remain visible only to the profile owner or a `SUPER_ADMIN`.
>
> **Session 122 organization-page note:** the public `/organizations/[slug]` page header was simplified so it now shows only the organization icon and name with no label/description line, while organization descriptions continue to render as sanitized TipTap HTML in the hero/about body sections with preserved safe text-alignment styling.

## Product Snapshot

Highlander Today is a multi-tenant local community platform focused first on **Cambria Heights / Cambria County, Pennsylvania**. It combines trusted local content, events, marketplace/storefronts, help wanted, messaging, moderation, and community identity.

The long-term goal is not “more features.” It is local digital infrastructure that residents actually use to answer:

- what is happening locally
- where can I get something
- who can help me
- how can I participate

Core platform assumptions:

- Trust levels: `ANONYMOUS -> REGISTERED -> TRUSTED -> SUSPENDED`
- Roles: `Reader -> Contributor -> Staff Writer -> Editor -> Admin -> Super Admin`
- Identity lock: once vouched, name + DOB become permanently read-only
- Multi-tenancy is by domain/slug
- Brand colors: Primary `#46A8CC`, Accent `#A51E30`

## Operating Principles

1. Prioritize complete user loops over horizontal feature spread.
2. Treat the home community as the proving ground; expansion only matters after real local adoption.
3. Preserve accountability and trust requirements in public interaction surfaces.
4. Keep the product legible as community infrastructure, not an extractive platform.
5. When in doubt, prefer fewer better-finished systems over more partially built ones.

## Current Product State

Major live foundations:

- Auth, permissions, trust, audit/activity logging, tenant-aware community resolution
- Profiles, vouching, blocking, private messaging
- Local Life articles: listing, submit, drafts, detail, moderation, comments, article preview
- Events: submit, moderation, public browse/detail, shared structured locations, recurring-series generation, scoped recurring-series editing, and organization-backed event ownership
- Marketplace: store-based listings, storefronts, admin store moderation, trusted buyer messaging
- Help Wanted: public browse, trusted posting/responding, moderation, manage/edit flows
- Homepage curation, search, uploads, admin moderation surfaces
- Directory foundations: opted-in people, organization schema, organizations admin moderation/create, and public directory browse
- Roadmap and roadmap weighting exist but are now `SUPER_ADMIN`-only internal tooling

Current public/admin direction highlights:

- Public navbar now reads top-level categories and child dropdowns dynamically from the DB; `Home` remains fixed.
- Top-level public nav items that have children are now non-clickable dropdown triggers; users select a child category instead of navigating to a parent placeholder page.
- `/admin/content-architecture` exists as a read-only internal reference page.
- `/admin/organizations` now exists as a compact admin management surface aligned with the same dense operational paradigm as `/admin/articles` and `/admin/events`, and `/admin/organizations/[id]` now follows that same admin-card tab vocabulary for full organization management.
- `/admin/events` now supports both moderation and direct admin creation through the compact `+ Event` tab, recurring-series generation for weekly/monthly classes, required organization selection through a search-first picker, inline pending-organization creation, and reusable structured location selection.
- Admin recurring events now have a fuller scoped management loop on `/admin/events/[id]`: staff can edit or delete just the current occurrence, regenerate schedule/cadence changes for the current-and-future scope or the entire series, and the API keeps session numbering/counts/summaries in sync afterward.
- Recurring-event internals now also have a clearer maintenance baseline: scoped mutation orchestration lives in `src/lib/event-series-mutations.ts`, shared event date/time parsing/formatting lives in `src/lib/event-datetime.ts`, and focused unit coverage now exists at both route and service levels.
- `/admin` is no longer carrying fake dashboard summary cards for events, marketplace listings, pending review, or recent activity. The current dashboard now reads real counts and live activity rows from the current data model, and `/admin/settings` now talks to the existing `/api/settings` backend instead of a placeholder timeout.
- `/admin/categories` has effectively become the **Navigation Menu** admin surface, with compact table-style editing, expand/collapse for nested items, reorder controls, and an `Add Area` tab.
- `/admin/users` now matches that same compact admin pattern: dense table layout, email column, real last-seen timestamps from login activity, voucher names, colored/iconized manage actions, and inline admin messaging.
- Admin list rule: when an admin surface is primarily a list of records, default to the compact shared `admin-list` table style used by `/admin/articles` rather than stacked per-record cards. When a single admin tab mixes record management and record creation, prefer a nested secondary tab split such as `List` and `+ Form` instead of one long mixed panel. The canonical structure and row-expansion guidance now live in `ADMIN-LIST-DESIGN.md`.
- The admin sidebar now uses shared nav-item classes/structure plus alternating row backgrounds to keep menu entries visually consistent, and `Events` is a top-level admin item alongside `Articles`, `Navigation`, and the other operational surfaces.
- The shared public shell uses the active `Youth Local` direction and the shared `InternalPageHeader` pattern.
- The public mobile shell and shared `InternalPageHeader` both received another cleanup pass: the masthead title/logo/action row is more compact, `InternalPageHeader` now exposes explicit mobile alignment/compactness controls, and `/directory` now uses that component-level path rather than page-specific centering hacks.
- `InternalPageHeader` mobile rule: public mobile page-header actions should be icon-only by default. Keep text hidden unless multiple neighboring actions of the same CRUD type need explicit disambiguation; otherwise rely on the page title plus accessible labels/tooltips for context.
- Public mobile shell spacing rule: `main` should use `2px` padding on the left/right/top, and `InternalPageHeader` should carry zero external margin so the header uses the available screen width.
- `/profile/[id]` now uses an owner-first account-settings flow: no separate edit page, owner-only `Account Settings` first, owner-hidden `About`, simplified `Articles` / `Events` tabs, privacy disclaimers on non-public fields, and `Last seen` header metadata sourced from latest `LoginEvent`.
- `SUPER_ADMIN` can now open `Account Settings` on any user profile and edit that user through the shared profile API; the lower account-action buttons in that panel stay hidden from non-owners unless the viewer is `SUPER_ADMIN`.
- `/directory` is now a real read surface rather than a placeholder shell: the default people view stays search-first, while top-level `Businesses`, `Government`, and `Organizations` category pills load current-tenant entity results alphabetically and subtypes remain available through dropdown chevrons. The current UI direction is flatter and more compact than the earlier pill-heavy/table-heavy pass, with inline search submission, minimal plain-text viewer guidance, no extra result-count copy, and clickable result headings handling sort on desktop.
- Directory people rows now support direct messaging from the listing itself only for trusted-capable viewers; anonymous or merely registered viewers now get trust/account guidance instead of a compose box, and a persistent banner above the directory search filter explains the current viewer’s account/trust/listing state.
- Users promoted or reinstated to `TRUSTED` are now automatically directory-listed by default, and `/admin/users` includes a `Directory` filter with a `No directory` option for finding opted-out users.
- Trusted/staff-only trust-bootstrap is now live through `/help-us-grow`: same-community `REGISTERED` members are listed alphabetically with join dates and row-level messaging so existing trusted members can recognize people they know and start verification conversations inside the product.
- Message threads now expose a direct `Vouch` entry point in the header when the other participant is still `REGISTERED`, reducing the need to leave the conversation to complete trust escalation.
- The public organization detail header is now reduced to icon + organization name only; the richer organization description remains in the hero/about body and renders TipTap HTML through the shared sanitizer/render path.
- The repo is back to a clean verification baseline: `npm run lint`, `npm run typecheck`, and `npm run test:unit` pass on the current recurring/admin cleanup baseline.
- Homepage fallback polish: the stand-in `Coming Soon` cards now use full mobile width, and autogenerated article fallback hero images are now contained/centered on homepage feature cards so the generated `Highlander Today` artwork is fully visible instead of being edge-clipped on phones.
- Dark-shell `not found` / missing-resource states should render white text by default; avoid low-contrast gray/red fallback text on the live dark public shell.

## Highest-Signal Active Priorities

- Tighten the live `/profile/[id]` header spacing around the avatar/content grouping.
- Validate real-world usage of the live marketplace and Help Wanted loops instead of expanding scope prematurely.
- Implement first-party analytics/reaction instrumentation from `CONTENT-ANALYTICS-PLAN.md`.
- Continue the About/institutional-content track where it improves public trust and clarity.
- Expand the new tenant-theme foundation carefully, keeping new public surfaces on semantic theme classes/tokens instead of route-local color decisions.
- Validate the remaining non-shell public pages for tenant-aware metadata, copy, and fallback assets before treating multi-tenant presentation as fully complete.
- Do a short manual QA pass on the new recipe stack: `/recipes`, `/recipes/[id]`, `/recipes/submit`, `/admin/recipes`, section-page recipe behavior, and homepage recipe curation after the latest schema push/restart.
- Continue the food system from the new recipe foundation toward better admin editing, richer browse/filter/search, and eventual grocery/store-product mapping rather than revisiting article-body recipe persistence.
- Use the new gardening planning docs as the canonical direction before building gardening structure: `GARDENING-MERCHANTS-PLAN.md` for product/model boundaries and `GARDENING-IMPLEMENTATION-PLAN.md` for rollout order.
- Use the new `/admin/sites` provisioning flow to stand up the first real non-Highlander tenant record and validate actual tenant/domain behavior outside the development preview switcher.
- Decide the next theming slice after phase 1: real production second-tenant/domain proof, DB-backed user theme preference persistence, or seasonal overlay support.
- Preserve compact, dense operational design in admin rather than drifting toward spacious public-page layouts.
- Prioritize the shared place/coverage foundation from `PLACE-COVERAGE-PLAN.md`, including `SUPER_ADMIN` place and tenant-coverage management, early user location capture, and geography-density reporting before broader tenant expansion.
- Do a short manual QA pass on the new recurring-event regeneration flows (`single`, `future`, `series`) before treating that loop as fully settled.
- Keep recurring-event follow-up focused on QA, maintainability, and clear behavior contracts rather than expanding feature scope again immediately.
- Continue the directory build with public organization detail pages, richer organization editing, and later self-claim/self-management flows.
- Continue the organization presence build from the new `/organizations/[slug]` foundation toward richer organization editing, self-claim/self-management, and later custom-domain support.
- Define the organization inbox / CRM subsystem before implementation so business/government/organization messaging lands on durable mailbox/contact-history primitives instead of DM-specific shortcuts.
- Validate whether `/help-us-grow` actually reduces manual admin vouching and where the next trust-bootstrap gaps remain.
- Define the shared place/coverage model before future tenant expansion so user location, service areas, and geographic traction are measured through canonical places and density signals rather than inferred from tenant membership alone.

## What Is Still Partial Or Pending

- Messaging attachments are not live.
- Experiences is still only partially real; non-event experience categories remain directional placeholders.
- Cross-site sister-site pull-through is not implemented.
- Multi-tenant theming is now phase 1 live rather than architecture-only. Keep `TENANT-THEMING-ARCHITECTURE.md` and `TENANT-THEMING-IMPLEMENTATION-PLAN.md` as the canonical direction, keep theme manifests/tokens in code, and continue avoiding arbitrary CSS in the database.
- Multi-tenant provisioning now has a first real `SUPER_ADMIN` path through `/admin/sites`, including site create/list/detail flows, domain management, provisioning notes, direct coverage editing, and explicit DB-to-code theme-manifest mapping through `theme_manifest_slug`. The current admin surface now validates configured manifest slugs against registered code manifests and runtime theme resolution honors that mapping. It is still phase 1 rather than complete tenant operations: there is not yet a full end-to-end production second-tenant/domain proof, no confirmed real non-Highlander tenant record running through a live host/domain path, and no richer per-site operational checklist beyond the current provisioning notes/coverage/domain tooling.
- Seasonal overlays and DB-backed per-user theme preference are still pending on top of the new theme foundation. Public light/dark switching is now live through the shared masthead toggle using the `theme-mode` cookie, but signed-in preference persistence beyond the cookie is not built yet.
- Donations/transparency, sourcing/citations, creator network, and delivery/jobs remain planned follow-on work.
- Food / recipe / grocery is no longer planning-only. First-pass structured recipe foundations are live: dedicated recipe tables, recipe media, JSON import, public recipe pages, admin recipe moderation, `RECIPE` category modeling, and a dedicated homepage recipe lane are now in the codebase. What remains planning-oriented is the later grocery/reservation layer, canonical ingredient/product mapping, and deeper food commerce workflows; use `FOOD-RECIPE-GROCERY-PLAN.md` as the canonical direction for those next phases rather than extending marketplace models.
- Gardening / plants / merchant kits is still planning-only; use `GARDENING-MERCHANTS-PLAN.md` as the canonical product/model direction and `GARDENING-IMPLEMENTATION-PLAN.md` as the rollout sequence. Current recommendation is tenant-aware growing-zone metadata first, then structured garden projects/plant profiles, then merchant kit interoperability.
- Directory exists as an early live foundation now, with canonical public organization detail pages at `/organizations/[slug]` and richer admin organization editing at `/admin/organizations/[id]`, but self-claim/self-management flows are still pending.
- Organization messaging to businesses / government / organizations is still planning-only; use `ORGANIZATION-INBOX-CRM-PLAN.md` as the canonical direction before implementation.
- Organization-linked forms/questionnaires now have a first live public route, admin management surface, one-submission-per-user public response flow, and a basic admin results view. The current admin UI direction is list-first and nested-tabbed rather than card-stacked, but richer response review/editing is still partial. Use `ORGANIZATION-FORMS-PLAN.md` as the canonical direction for the remaining submission/review system.
- Historical events / timeline / family-history contribution is still planning-only; use `HISTORICAL-EVENTS-SYSTEM-PLAN.md` as the canonical direction and keep the historical repository, memoriam stewardship, and article linkage as related-but-separate models rather than collapsing them into the article system.
- Place / coverage / geographic-reach modeling is still planning-only; use `PLACE-COVERAGE-PLAN.md` as the canonical direction and keep canonical places, tenant service areas, user-declared locations, and IP-derived observed geo signals as separate layers rather than treating tenant membership or raw IP data as the location model.
- Place / coverage implementation is now staged in `PLACE-COVERAGE-IMPLEMENTATION-PLAN.md`; use that as the concrete build sequence and keep the rollout focused on canonical places, early user location capture, tenant coverage management, observed-geo curation, and distinct-user-weighted geographic reporting.
- Paid memberships/subscriptions are still planning-only; use `USER-SUBSCRIPTIONS-PLAN.md` as the canonical direction and do not bolt billing/subscription fields onto existing community or organization membership tables.
- Organization self-listing/help CTA on `/directory` is still intentionally deferred; do not imply a self-serve org creation/claim path until submit-or-claim workflows actually exist.
- `Help Us Grow` is live as the first in-product trust-bootstrap loop, but it still lacks dismiss/not-known actions, stronger recognition hints, and an explicit admin exception path for genuine newcomers no one recognizes.
- Article video embeds are still pending and should land before any delivery/jobs push.

For the detailed milestone ladder and phase-by-phase remaining work, read `PROJECT-STATUS-REFERENCE.md`.

## Tech Stack And Local Setup

Stack:

- Next.js 14 App Router + TypeScript
- PostgreSQL 16 + Prisma
- NextAuth.js v4 with JWT sessions and **no PrismaAdapter**
- Tailwind CSS, TipTap, Sharp, Cloudflare R2, Jest/RTL, D3

Local bootstrap:

```bash
docker-compose up -d && npm run db:push && npx prisma db seed && npm run dev
```

Create the initial Super Admin explicitly with:

```bash
SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... npm run db:create-super-admin
```

Important environment reminders:

- Local Postgres runs on `127.0.0.1:5433`
- Use `prisma/schema.prisma` only
- The DB is the source of truth for categories/navigation reads
- Preferred shell helpers for Prisma schema updates are `dbpushlocal` and `dbpushprod`

For deployment/bootstrap/infrastructure detail, read `PROJECT-STATUS-REFERENCE.md`.

## Navigation And Information Architecture

Public navigation:

- `Home` is fixed
- Other top-level nav items come from `Category` rows where `parentCategoryId = null`
- Categories also now carry `minTrustLevel`, defaulting to `ANONYMOUS`, so top-level or child nav items can be hidden until the viewer reaches the required trust level.
- Top-level items with children render as dropdowns
- Child links use `?category=<slug>` unless there is an explicit route override
- `NavigationBar` now reads from the DB-backed categories API rather than a mixed hardcoded section list

Current content-section state:

- `Local Life` is live and DB-backed
- `Experiences` exists, but most non-event subcategories are still placeholders
- `About` is live with `Mission` and `Blog`; `/about/roadmap` is now Super Admin only
- `Community` can exist structurally in navigation if created in admin, but the full public `/community` section is still planned

## Key Repo Landmarks

```text
prisma/
  schema.prisma
  seed.ts
src/app/
  admin/
  api/
  directory/
  local-life/
  events/
  marketplace/
  help-wanted/
  messages/
  profile/
  search/
  layout.tsx
  page.tsx
src/components/
  admin/
  articles/
  layout/
  marketplace/
  messaging/
  shared/
src/lib/
  db.ts
  organization-taxonomy.ts
  permissions.ts
  search.ts
  homepage.ts
  community.ts
  tenant.ts
  category-config.ts
```

## High-Value Gotchas

1. Never re-add `PrismaAdapter`; it breaks the active JWT credential flow.
2. Most active APIs depend on middleware headers (`x-user-id`, `x-user-role`, `x-user-trust-level`, `x-client-ip`) rather than calling `getServerSession()`.
3. Import the database as `import { db } from '@/lib/db'`.
4. The live NextAuth config is `src/app/api/auth/[...nextauth]/route.ts`.
5. Canonical article behavior belongs under `/local-life/*`, not `/articles/*`.
6. Categories/navigation are DB-driven; do not hardcode top-level or Local Life category lists.
7. TipTap additions must stay on v2.x.
8. Uploads are JPEG/PNG/WebP/GIF only, up to 5MB.
9. Production uses Cloudflare R2 at `https://cdn.highlander.today`.
10. The repo still uses `prisma db push` style rollout rather than checked-in migrations.
11. The admin area is intentionally desktop-first and compact.
12. Production launch auth is credentials + Google OAuth; Facebook remains intentionally deferred.
13. The directory rollout requires the target environment to have the new Prisma schema applied. If `/directory` throws runtime Prisma errors about missing `organizations` or `users.isDirectoryListed`, run `npx prisma db push --schema prisma/schema.prisma` against that environment's database.
14. The trusted-nav / `Help Us Grow` rollout also requires the current Prisma schema to be applied. If category reads fail with missing `categories.minTrustLevel`, run `npx prisma db push --schema prisma/schema.prisma` against that environment before loading `/api/categories` or `/api/admin/categories`.
15. The current event rollout depends on both the shared location fields and the recurring-series schema. If event creation or reads fail because `locations`, `events.locationId`, `events.organizationId`, `event_series`, or the new series fields are missing, run `npx prisma db push --schema prisma/schema.prisma` against that environment before using the location selector, organization picker, or recurrence flow.
16. The organization forms rollout also requires the current Prisma schema to be applied. If `/admin/organizations/[id]` fails with Prisma errors about missing `organization_forms` or related organization-form tables, run `npx prisma db push --schema prisma/schema.prisma` against that environment before opening the new `Forms` tab.
17. Treat `prisma db push` as environment-specific. The command updates whichever database `DATABASE_URL` points to in the shell where it is run. Local terminal + local `.env` updates local Docker Postgres only; production deploy shell / production env vars updates production only.
18. Current preferred operator workflow is to use the shell helpers `dbpushlocal` and `dbpushprod` from `~/.zshrc` rather than manually exporting and unsetting `DATABASE_URL` in the active shell.

For the full gotcha list, verification notes, and deployment constraints, read `PROJECT-STATUS-REFERENCE.md`.

## Supporting Docs

Use these instead of growing this file again:

- `PROJECT-STATUS-REFERENCE.md` — detailed implementation ledger, verification notes, deployment/bootstrap runbook, upload snapshot, and production infrastructure rationale
- `STRATEGIC-DECISIONS.md` — short canonical strategy guardrails across rollout, funding, positioning, and expansion
- `DESIGN-SYSTEM-ARCHITECTURE.md` — canonical shared UI vocabulary and layout/theming guidance
- `ADMIN-CONTENT-REFERENCE-PLAN.md` — admin content-model/reference system plan
- `COMMUNITY-ANCHORING-LAUNCH-STRATEGY.md` — early-stage local rollout, community anchoring, and controlled exposure strategy
- `COMMUNITY-SECTION-PLAN.md` — planned `Community` top-level section
- `CONTENT-ANALYTICS-PLAN.md` — first-party analytics/reaction plan
- `DIRECTORY-PLAN.md` — organization/directory direction
- `ORGANIZATION-INBOX-CRM-PLAN.md` — separate organization inbox / CRM direction with role-based mailboxes and org-scoped contact history
- `ORGANIZATION-SITE-PLAN.md` — public organization profile to organization-site and custom-domain direction
- `ORGANIZATION-PROFILE-PHASE-1-PLAN.md` — first implementation slice for the public organization profile page
- `INVITATION-EMAIL-PLAN.md` — invitation system and outbound transactional email direction
- `LOCAL-CREATOR-NETWORK-PLAN.md` — creator/show/episode direction
- `FOOD-RECIPE-GROCERY-PLAN.md` — food editorial, structured recipe utility, and grocery reservation direction
- `GARDENING-MERCHANTS-PLAN.md` — gardening editorial, structured garden-project utility, tenant-zone relevance, and merchant-kit direction
- `GARDENING-IMPLEMENTATION-PLAN.md` — concrete build order for tenant growing profiles, structured gardening models, and later merchant interoperability
- `CAPITAL-PLAN.md` — 12-month and 24-month blended funding targets, source mix, sequencing, and operating rules
- `GRANT-STRATEGY.md` — grant positioning, target funders, structural prerequisites, and recommended outreach sequence
- `OBITUARIES-PLAN.md` — obituary/memorial system direction
- `MONETIZATION-PLAN.md` — funding/revenue sequencing
- `USER-SUBSCRIPTIONS-PLAN.md` — dedicated future subscription/plans/entitlements direction separate from existing membership tables
- `DONATIONS-TRANSPARENCY-PLAN.md` — donations/transparency direction
- `ARTICLE-SOURCING-PLAN.md` — citations/sourcing direction
- `highlander-today-spec.md` — deep product spec

## Session Instructions

1. Read this file first.
2. Open `PROJECT-STATUS-REFERENCE.md` only if you need the fuller implementation ledger, deployment notes, verification history, or infra rationale.
3. Read only the source files relevant to the active slice.
4. Preserve current canonical paths, schema assumptions, and DB-driven category/navigation behavior.
5. Update this file and/or the reference file after meaningful progress so the next session can resume cleanly.
