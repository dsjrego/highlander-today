# Memoriam Public Redesign — Migration Plan

Direction B ("Lives Lived") for the public-facing Memoriam section. This is a
visual redesign of the public surfaces only. No schema, API, permission, or
admin changes. The admin queue and submission flow are untouched.

Public surfaces in scope:

- `src/app/memoriam/page.tsx` — index of death notices and memorial pages
- `src/app/memoriam/[slug]/page.tsx` — detail page for a single memorial
- a new "Recently remembered" homepage block component
- new shared CSS in `src/app/globals.css` under `@layer components`
- `src/components/sections/ArticleCategorySectionPage.tsx` — light update so
  the `MEMORIAM` category branch renders cards in the same style

The mock for reference is `memoriam.html` in this project, the Direction B
artboards (`b-index`, `b-detail`, `b-home`).

---

## 1. Design intent

| Was | Becomes |
|---|---|
| Glassy white cards (`bg-white/82`, `rounded-[28px]`) and 28px radii | Editorial paper surfaces; system `--radius-card: 6px` |
| Heavy uppercase tracking on every metadata strip | Italic serif metadata; uppercase reserved for true eyebrows |
| Two separate sections (Death Notices, Memorial Pages) | One chronological feed grouped by month; type appears as an inline tag |
| Dark gradient hero on detail | Split hero: portrait left, name on ink slab right |
| "Review Signals" admin-style sidebar | Quiet provenance line at the bottom of the body |
| One-off memoriam classes inline on JSX | Shared `memoriam-*` semantic classes in `globals.css` |

The visual language stays inside the existing system: `--app-bg`, `--paper`,
`--brand-primary` (#12436b), `--brand-accent` (#8f1d2c), `--ink` (#0d1b2a),
`--rule`, `--radius-card`. The new editorial typography reuses fonts already
imported in `globals.css` (`Playfair Display` and `Source Sans 3`).

Tone of copy: celebratory and plain. Replace any "review-y" microcopy with
language that talks about people, not workflow.

---

## 2. Type system additions

`globals.css` already imports Playfair Display and Source Sans 3. No new font
imports required.

Add semantic font tokens at the bottom of the existing `:root` block:

```css
--memoriam-display: 'Playfair Display', Georgia, serif;
--memoriam-body: 'Source Sans 3', Georgia, serif;
```

Use them only for the memoriam surfaces. Other sections of the site continue
to use `--font-sans` / `--font-serif`.

---

## 3. Shared CSS — add to `src/app/globals.css`

Append the block below to the existing `@layer components { ... }` in
`globals.css`. Class names follow the design system's `*-header`, `*-body`,
`*-label` conventions.

```css
/* ───────── Memoriam (public) ───────── */

.memoriam-page {
  /* opt-in surface tone for memoriam. App bg already paper-cream. */
  background: var(--app-bg);
}

/* Section header / band */

.memoriam-band {
  border-bottom: 1px solid var(--rule);
  padding: 4rem 3.5rem 2.25rem;
  background: var(--paper-2);
}
.memoriam-band-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 2rem;
}
.memoriam-band-eyebrow {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin-bottom: 1.125rem;
}
.memoriam-band-title {
  font-family: var(--memoriam-display);
  font-weight: 600;
  font-size: clamp(3rem, 2rem + 4vw, 6rem);
  line-height: 0.92;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0;
}
.memoriam-band-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--brand-primary);
}
.memoriam-band-sub {
  font-family: var(--memoriam-body);
  font-size: 1.0625rem;
  color: var(--app-text-muted);
  max-width: 22rem;
  line-height: 1.55;
  margin: 0;
  text-align: right;
}

/* Filter strip on dark — replaces old form/pill block */

.memoriam-controls {
  padding: 1.125rem 3.5rem;
  background: var(--ink);
  color: rgba(255, 255, 255, 0.86);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
}
.memoriam-controls input {
  background: transparent;
  border: 0;
  color: #fff;
  outline: none;
  width: 20rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0;
}
.memoriam-controls input::placeholder { color: rgba(255, 255, 255, 0.5); }
.memoriam-pillbar { display: flex; gap: 0.25rem; }
.memoriam-pill {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.3125rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  letter-spacing: 0.06em;
}
.memoriam-pill.is-active {
  background: #fff;
  color: var(--ink);
  border-color: #fff;
}
.memoriam-results {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.6875rem;
}

/* Asymmetric photo-forward feed */

.memoriam-feed {
  padding: 3rem 3.5rem 5rem;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem 1.75rem;
}
.memoriam-card {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  grid-column: span 4;
}
.memoriam-card.size-lg { grid-column: span 6; }
.memoriam-card.size-xl { grid-column: span 8; }
.memoriam-card-img {
  aspect-ratio: 4 / 5;
  background: repeating-linear-gradient(135deg, #e8e6e0 0 8px, #e0ddd5 8px 16px);
  overflow: hidden;
  margin-bottom: 1rem;
  transition: transform 240ms ease;
}
.memoriam-card.size-lg .memoriam-card-img { aspect-ratio: 5 / 4; }
.memoriam-card.size-xl .memoriam-card-img { aspect-ratio: 16 / 10; }
.memoriam-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.memoriam-card:hover .memoriam-card-img { transform: translateY(-4px); }

.memoriam-card-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--brand-primary);
  margin-bottom: 0.5rem;
}
.memoriam-card-tag.is-notice { color: var(--brand-accent); }
.memoriam-card-tag::before {
  content: "";
  width: 1.375rem;
  height: 1px;
  background: currentColor;
}
.memoriam-card-title {
  font-family: var(--memoriam-display);
  font-weight: 500;
  font-size: 1.75rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 0.375rem;
  color: var(--ink);
}
.memoriam-card.size-lg .memoriam-card-title { font-size: 2.125rem; }
.memoriam-card.size-xl .memoriam-card-title { font-size: 2.75rem; line-height: 1; }
.memoriam-card-meta {
  font-family: var(--memoriam-body);
  font-style: italic;
  font-size: 0.875rem;
  color: var(--app-text-muted);
  margin: 0 0 0.625rem;
}
.memoriam-card-lede {
  font-family: var(--memoriam-body);
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-soft, #2b3a4a);
  margin: 0;
  max-width: 50ch;
  text-wrap: pretty;
}
.memoriam-card.size-xl .memoriam-card-lede { font-size: 1.125rem; max-width: 62ch; }

/* Detail page */

.memoriam-detail-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 34rem;
}
.memoriam-detail-hero-img {
  background: repeating-linear-gradient(135deg, #e8e6e0 0 8px, #e0ddd5 8px 16px);
}
.memoriam-detail-hero-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.memoriam-detail-hero-text {
  padding: 4rem 3.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: var(--ink);
  color: #fff;
}
.memoriam-detail-eyebrow {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 1.5rem;
}
.memoriam-detail-title {
  font-family: var(--memoriam-display);
  font-weight: 500;
  font-size: clamp(3rem, 2rem + 3vw, 5rem);
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin: 0 0 1.125rem;
  color: #fff;
}
.memoriam-detail-dates {
  font-family: var(--memoriam-body);
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.78);
  font-style: italic;
  margin-bottom: 1.75rem;
}
.memoriam-tag-strip {
  display: flex;
  gap: 1.5rem;
  padding-top: 1.375rem;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.memoriam-tag-strip strong { color: #fff; font-weight: 600; }

.memoriam-detail-body {
  padding: 4rem 0 5rem;
  max-width: 67.5rem;
  margin: 0 auto;
}
.memoriam-prose {
  column-count: 2;
  column-gap: 3rem;
  padding: 0 3.5rem;
}
.memoriam-prose p {
  font-family: var(--memoriam-body);
  font-size: 1.0625rem;
  line-height: 1.65;
  color: var(--ink-soft, #2b3a4a);
  margin: 0 0 1.125rem;
  break-inside: avoid;
  text-wrap: pretty;
}
.memoriam-prose p:first-child::first-letter {
  font-family: var(--memoriam-display);
  font-weight: 500;
  float: left;
  font-size: 4rem;
  line-height: 0.9;
  padding: 0.25rem 0.625rem 0 0;
  color: var(--brand-primary);
}

/* Photo essay */

.memoriam-essay {
  margin: 4rem 3.5rem;
  padding: 3.5rem 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.memoriam-essay-title {
  font-family: var(--memoriam-display);
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin: 0 0 2rem;
}
.memoriam-essay-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1.125rem;
}
.memoriam-essay-fig { margin: 0; }
.memoriam-essay-fig.span-2 { grid-column: span 2; }
.memoriam-essay-fig.span-3 { grid-column: span 3; }
.memoriam-essay-fig.span-4 { grid-column: span 4; }
.memoriam-essay-fig.tall .memoriam-essay-img { aspect-ratio: 3 / 4; }
.memoriam-essay-fig.span-3 .memoriam-essay-img { aspect-ratio: 4 / 3; }
.memoriam-essay-img {
  background: repeating-linear-gradient(135deg, #e8e6e0 0 8px, #e0ddd5 8px 16px);
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.memoriam-essay-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.memoriam-essay-fig figcaption {
  font-family: var(--memoriam-body);
  font-size: 0.8125rem;
  color: var(--app-text-muted);
  font-style: italic;
  margin-top: 0.5rem;
  line-height: 1.4;
}

/* Memories — numbered short stories */

.memoriam-memories {
  padding: 0 3.5rem;
}
.memoriam-memories-title {
  font-family: var(--memoriam-display);
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin: 0 0 1.5rem;
}
.memoriam-memory {
  display: grid;
  grid-template-columns: 3.75rem 1fr;
  gap: 1.5rem;
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--rule);
  align-items: start;
}
.memoriam-memory:last-child { border-bottom: none; }
.memoriam-memory-num {
  font-family: var(--memoriam-display);
  font-weight: 500;
  font-size: 2.25rem;
  color: var(--brand-primary);
  line-height: 1;
  font-style: italic;
}
.memoriam-memory-body {
  font-family: var(--memoriam-body);
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ink-soft, #2b3a4a);
  margin: 0 0 0.75rem;
  text-wrap: pretty;
}
.memoriam-memory-attr {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--app-text-muted);
  letter-spacing: 0.06em;
}
.memoriam-memory-attr strong { color: var(--ink); font-weight: 600; }

/* Add-a-memory CTA — quiet line, not a card */
.memoriam-memory-add {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-family: var(--memoriam-body);
  font-size: 0.9375rem;
  color: var(--app-text-muted);
}
.memoriam-memory-add a {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-primary);
  text-decoration: none;
  border: 1px solid currentColor;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

/* Provenance / record block — moves to end of body, quiet */
.memoriam-provenance {
  margin: 4rem 3.5rem 0;
  padding: 1.5rem 0;
  border-top: 1px solid var(--rule);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--app-text-muted);
}
.memoriam-provenance-label {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-faint, rgba(13, 27, 42, 0.42));
  margin-bottom: 0.375rem;
}
.memoriam-provenance-value { color: var(--ink); font-weight: 500; }

/* Responsive */

@media (max-width: 1024px) {
  .memoriam-band, .memoriam-controls, .memoriam-feed,
  .memoriam-essay, .memoriam-memories, .memoriam-provenance,
  .memoriam-detail-hero-text { padding-left: 1.5rem; padding-right: 1.5rem; }
  .memoriam-essay { margin-left: 1.5rem; margin-right: 1.5rem; }
  .memoriam-detail-hero { grid-template-columns: 1fr; }
  .memoriam-prose { column-count: 1; padding: 0 1.5rem; }
  .memoriam-feed { grid-template-columns: repeat(6, 1fr); }
  .memoriam-card, .memoriam-card.size-lg, .memoriam-card.size-xl { grid-column: span 6; }
  .memoriam-essay-grid { grid-template-columns: repeat(3, 1fr); }
  .memoriam-essay-fig.span-3, .memoriam-essay-fig.span-4 { grid-column: span 3; }
}
@media (max-width: 640px) {
  .memoriam-band-grid { grid-template-columns: 1fr; }
  .memoriam-band-sub { text-align: left; max-width: none; }
  .memoriam-controls { flex-wrap: wrap; }
  .memoriam-controls input { width: 100%; }
  .memoriam-feed { grid-template-columns: 1fr; }
  .memoriam-card, .memoriam-card.size-lg, .memoriam-card.size-xl { grid-column: span 1; }
  .memoriam-essay-grid { grid-template-columns: 1fr; }
  .memoriam-essay-fig.span-2, .memoriam-essay-fig.span-3, .memoriam-essay-fig.span-4 { grid-column: span 1; }
  .memoriam-provenance { grid-template-columns: 1fr 1fr; }
}
```

If `--ink-soft` and `--ink-faint` aren't already in `:root`, add them with the
other tokens:

```css
--ink-soft: #2b3a4a;
--ink-faint: rgba(13, 27, 42, 0.42);
```

---

## 4. New file — `src/lib/memoriam/feed.ts`

This consolidates the index query into a single chronological list and derives
`heroSizeFor(index)` so the asymmetric grid is determined server-side. No
schema change.

```ts
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export type MemoriamFeedItem = Awaited<ReturnType<typeof getMemoriamFeed>>[number];

export async function getMemoriamFeed(opts: {
  communityId?: string;
  query?: string;
  type?: 'all' | 'death-notices' | 'memorial-pages';
  limit?: number;
}) {
  const { communityId, query, type = 'all', limit = 60 } = opts;

  const where: Prisma.MemorialPageWhereInput = {
    status: 'PUBLISHED',
    ...(communityId ? { communityId } : {}),
    ...(type === 'death-notices' ? { pageType: 'DEATH_NOTICE' } : {}),
    ...(type === 'memorial-pages' ? { pageType: 'MEMORIAL_PAGE' } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { shortSummary: { contains: query, mode: 'insensitive' } },
            { serviceDetails: { contains: query, mode: 'insensitive' } },
            {
              memorialPerson: {
                is: {
                  OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { preferredName: { contains: query, mode: 'insensitive' } },
                    { townName: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  return db.memorialPage.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      pageType: true,
      shortSummary: true,
      serviceDetails: true,
      publishedAt: true,
      // NOTE: heroImageUrl is required — see "Schema/data work" below.
      heroImageUrl: true,
      memorialPerson: {
        select: {
          fullName: true,
          preferredName: true,
          birthDate: true,
          deathDate: true,
          townName: true,
        },
      },
    },
  });
}

/**
 * Asymmetric hero sizing for the photo-forward grid.
 * The first item is featured; items 4 and 5 take a wider tile.
 * Items without a hero image always render at default size.
 */
export function heroSizeFor(
  index: number,
  hasImage: boolean
): 'default' | 'lg' | 'xl' {
  if (!hasImage) return 'default';
  if (index === 0) return 'xl';
  if (index === 3 || index === 4) return 'lg';
  return 'default';
}
```

---

## 5. Replace `src/app/memoriam/page.tsx`

Replace the entire file with the version below. Keep the file path identical
so all existing links continue to work.

Behavioral changes:

- One chronological list with month group headers, instead of two split sections.
- Search and filter pills sit on a dark strip below the band.
- Each card uses `MemoriamCard` (new component, see step 7).
- Removes the "Memoriam is a careful public record..." review-process paragraph
  from the hero. That copy moves into a small footnote at the bottom of the
  page (see "Footnote" below) so the public-facing voice leads with people,
  not process.

```tsx
import Link from 'next/link';
import { headers } from 'next/headers';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getCurrentCommunity } from '@/lib/community';
import { getMemoriamFeed, heroSizeFor } from '@/lib/memoriam/feed';
import MemoriamCard from '@/components/memoriam/MemoriamCard';

interface MemoriamPageProps {
  searchParams?: { q?: string; type?: string };
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'memorial-pages', label: 'Lives' },
  { key: 'death-notices', label: 'Notices' },
] as const;

function monthKey(d: Date | null) {
  if (!d) return 'Undated';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildHref(type: string, query: string) {
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);
  if (query) params.set('q', query);
  const qs = params.toString();
  return qs ? `/memoriam?${qs}` : '/memoriam';
}

export default async function MemoriamPage({ searchParams }: MemoriamPageProps) {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const query = searchParams?.q?.trim() || '';
  const type = (TYPE_FILTERS.find((f) => f.key === searchParams?.type)?.key
    ?? 'all') as 'all' | 'death-notices' | 'memorial-pages';

  const feed = await getMemoriamFeed({
    communityId: currentCommunity?.id,
    query,
    type,
  });

  // Group by death-month for the section headers
  const groups: { key: string; items: typeof feed }[] = [];
  const idx = new Map<string, number>();
  for (const item of feed) {
    const k = monthKey(item.memorialPerson.deathDate);
    if (!idx.has(k)) {
      idx.set(k, groups.length);
      groups.push({ key: k, items: [] });
    }
    groups[idx.get(k)!].items.push(item);
  }

  return (
    <div className="memoriam-page">
      <InternalPageHeader
        title="Memoriam"
        description={undefined}
        mobileAlign="start"
        actions={
          <Link href="/memoriam/submit" className="page-header-action">
            <span className="page-header-action-label">Submit</span>
          </Link>
        }
      />

      {/* Editorial band */}
      <section className="memoriam-band">
        <div className="memoriam-band-grid">
          <div>
            <p className="memoriam-band-eyebrow">
              Memoriam · {currentCommunity?.name ?? 'Highlander Today'}
            </p>
            <h1 className="memoriam-band-title">
              Lives <em>lived</em>
            </h1>
          </div>
          <p className="memoriam-band-sub">
            The people of this community, and what they were known for.
            Recently published.
          </p>
        </div>
      </section>

      {/* Filter strip on dark */}
      <form action="/memoriam" className="memoriam-controls">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search by name, town, what they were known for…"
        />
        <div className="memoriam-pillbar">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={buildHref(f.key, query)}
              className={`memoriam-pill ${type === f.key ? 'is-active' : ''}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <span className="memoriam-results">
          {feed.length} {feed.length === 1 ? 'record' : 'records'}
        </span>
      </form>

      {/* Asymmetric photo grid */}
      {feed.length === 0 ? (
        <div className="memoriam-feed">
          <p style={{ gridColumn: 'span 12', fontFamily: 'var(--memoriam-body)', color: 'var(--app-text-muted)' }}>
            {query || type !== 'all'
              ? 'No published records match the current search.'
              : 'No published records yet.'}
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <div
              className="memoriam-band"
              style={{
                padding: '1.5rem 3.5rem 0.75rem',
                background: 'transparent',
                borderBottom: 0,
              }}
            >
              <p
                className="memoriam-band-eyebrow"
                style={{ marginBottom: 0, color: 'var(--ink)' }}
              >
                {g.key}
                <span style={{ marginLeft: '1rem', color: 'var(--ink-faint)', fontWeight: 500 }}>
                  {g.items.length} {g.items.length === 1 ? 'entry' : 'entries'}
                </span>
              </p>
            </div>
            <div className="memoriam-feed">
              {g.items.map((p, i) => (
                <MemoriamCard
                  key={p.id}
                  page={p}
                  size={heroSizeFor(i, Boolean(p.heroImageUrl))}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Footnote — process copy lives here, in small print */}
      <p
        style={{
          maxWidth: '48rem',
          margin: '0 auto 4rem',
          padding: '0 3.5rem',
          fontFamily: 'var(--memoriam-body)',
          fontSize: '0.8125rem',
          fontStyle: 'italic',
          lineHeight: 1.6,
          color: 'var(--app-text-muted)',
        }}
      >
        Records appear here only after staff review. Family stewardship,
        memories, and photo contributions are moderated separately.{' '}
        <Link href="/memoriam/submit" style={{ color: 'var(--brand-primary)' }}>
          Submit a record
        </Link>
        .
      </p>
    </div>
  );
}
```

---

## 6. Replace `src/app/memoriam/[slug]/page.tsx`

Replace the file with the version below. Same data fetch, restructured render.

Key changes:

1. New split hero (`memoriam-detail-hero` + `memoriam-detail-hero-text`).
2. `biography` + `lifeStory` are concatenated into a two-column body.
3. Photo essay reads from `page.photos` if present; falls back to a
   single hero image, or skips the section entirely. **Adding a photos
   relation on the schema is recommended (see step 9), but the page
   should render without it.**
4. Memories become numbered short stories.
5. The "Record / Provenance / Review Signals" sidebar collapses into a
   single `memoriam-provenance` strip at the end.
6. The dark gradient hero on the old page is removed. Don't keep both.

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import MemorialMemoryForm from './MemorialMemoryForm';

interface PageProps { params: { slug: string } }

function fmtLong(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtYear(d: Date | null) { return d ? d.getFullYear().toString() : null; }

async function getPage(slug: string, communityId?: string) {
  return db.memorialPage.findFirst({
    where: { slug, status: 'PUBLISHED', ...(communityId ? { communityId } : {}) },
    select: {
      id: true, title: true, shortSummary: true, biography: true, lifeStory: true,
      serviceDetails: true, familyDetails: true, provenanceNote: true,
      pageType: true, approvedAt: true, publishedAt: true, updatedAt: true,
      heroImageUrl: true, // see schema notes
      // photos: { select: { url: true, caption: true, order: true }, orderBy: { order: 'asc' } },
      category: { select: { name: true } },
      memorialPerson: {
        select: {
          fullName: true, preferredName: true, age: true,
          birthDate: true, deathDate: true,
          townName: true, birthTownName: true, deathTownName: true,
        },
      },
      memories: {
        where: { status: 'APPROVED' },
        select: {
          id: true, displayName: true, relationshipToDeceased: true,
          body: true, createdAt: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const c = await getCurrentCommunity({ headers: headers() });
  const page = await getPage(params.slug, c?.id);
  if (!page) return { title: 'Memoriam' };
  const desc = page.shortSummary?.trim()
    || page.biography?.trim()
    || `Remembering ${page.memorialPerson.fullName}.`;
  return {
    title: page.title,
    description: desc.slice(0, 200),
    alternates: { canonical: `/memoriam/${params.slug}` },
  };
}

export default async function MemorialDetailPage({ params }: PageProps) {
  const c = await getCurrentCommunity({ headers: headers() });
  const page = await getPage(params.slug, c?.id);
  if (!page) notFound();

  const display = page.memorialPerson.preferredName || page.memorialPerson.fullName;
  const dates = [fmtYear(page.memorialPerson.birthDate), fmtYear(page.memorialPerson.deathDate)]
    .filter(Boolean).join(' — ');
  const fullDates = `${fmtLong(page.memorialPerson.birthDate) ?? '?'} — ${fmtLong(page.memorialPerson.deathDate) ?? '?'}`;

  // Compose body paragraphs from biography and lifeStory
  const bodyText = [page.biography, page.lifeStory].filter(Boolean).join('\n\n').trim();
  const paragraphs = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="memoriam-page">
      <div style={{ padding: '1.25rem 3.5rem' }}>
        <Link href="/memoriam" className="memoriam-band-eyebrow" style={{ textDecoration: 'none' }}>
          ← Memoriam
        </Link>
      </div>

      {/* Split hero */}
      <section className="memoriam-detail-hero">
        <div className="memoriam-detail-hero-img">
          {page.heroImageUrl ? <img src={page.heroImageUrl} alt="" /> : null}
        </div>
        <div className="memoriam-detail-hero-text">
          <p className="memoriam-detail-eyebrow">
            {page.pageType === 'DEATH_NOTICE' ? 'Notice' : 'A Life'} ·{' '}
            {page.category?.name ?? 'Memoriam'}
          </p>
          <h1 className="memoriam-detail-title">{display}</h1>
          <p className="memoriam-detail-dates">{fullDates}</p>
          <div className="memoriam-tag-strip">
            {page.memorialPerson.age ? <span><strong>{page.memorialPerson.age}</strong> · age</span> : null}
            {page.memorialPerson.townName ? <span><strong>{page.memorialPerson.townName}</strong> · home</span> : null}
            {page.serviceDetails ? (
              <span><strong>Service</strong> · see below</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="memoriam-detail-body">
        {/* Two-column body */}
        {paragraphs.length > 0 ? (
          <div className="memoriam-prose">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        ) : null}

        {/* Service details — if present, surface as own block */}
        {page.serviceDetails?.trim() ? (
          <section className="memoriam-essay" style={{ borderTop: 0, paddingTop: 0 }}>
            <h2 className="memoriam-essay-title">Service</h2>
            <p
              style={{
                fontFamily: 'var(--memoriam-body)',
                fontSize: '1.0625rem',
                lineHeight: 1.65,
                color: 'var(--ink-soft)',
                whiteSpace: 'pre-wrap',
                margin: 0,
                maxWidth: '52rem',
              }}
            >
              {page.serviceDetails}
            </p>
          </section>
        ) : null}

        {/* Photo essay — only when photos relation exists, otherwise omit. */}
        {/*
        {page.photos?.length ? (
          <section className="memoriam-essay">
            <h2 className="memoriam-essay-title">In photographs</h2>
            <div className="memoriam-essay-grid">
              {page.photos.map((ph, i) => {
                const span = i % 5 === 0 ? 'span-3' : i % 4 === 1 ? 'span-3' : 'span-2';
                return (
                  <figure key={i} className={`memoriam-essay-fig ${span}`}>
                    <div className="memoriam-essay-img">
                      <img src={ph.url} alt={ph.caption ?? ''} />
                    </div>
                    {ph.caption ? <figcaption>{ph.caption}</figcaption> : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}
        */}

        {/* Memories — numbered */}
        <section className="memoriam-memories">
          <h2 className="memoriam-memories-title">What people remember</h2>
          {page.memories.length === 0 ? (
            <p
              style={{
                fontFamily: 'var(--memoriam-body)',
                color: 'var(--app-text-muted)',
                margin: '0 0 1.5rem',
              }}
            >
              No memories have been added yet.
            </p>
          ) : (
            page.memories.map((m, i) => {
              const fallback = `${m.createdBy?.firstName ?? ''} ${m.createdBy?.lastName ?? ''}`.trim();
              return (
                <div key={m.id} className="memoriam-memory">
                  <div className="memoriam-memory-num">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p className="memoriam-memory-body" style={{ whiteSpace: 'pre-wrap' }}>
                      {m.body}
                    </p>
                    <p className="memoriam-memory-attr">
                      <strong>{m.displayName || fallback || 'Community member'}</strong>
                      {m.relationshipToDeceased ? ` · ${m.relationshipToDeceased}` : ''}
                      {' · '}
                      {fmtLong(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div className="memoriam-memory-add">
            <span>Knew {display}? Add a memory — staff will review before it appears.</span>
            {/* MemorialMemoryForm renders inline below; this block is the affordance pointing at it. */}
          </div>
          <MemorialMemoryForm memorialPageId={page.id} />
        </section>

        {/* Provenance strip — replaces the old right rail */}
        <div className="memoriam-provenance">
          <div>
            <div className="memoriam-provenance-label">Born</div>
            <div className="memoriam-provenance-value">
              {fmtLong(page.memorialPerson.birthDate) ?? '—'}
              {page.memorialPerson.birthTownName ? ` · ${page.memorialPerson.birthTownName}` : ''}
            </div>
          </div>
          <div>
            <div className="memoriam-provenance-label">Died</div>
            <div className="memoriam-provenance-value">
              {fmtLong(page.memorialPerson.deathDate) ?? '—'}
              {page.memorialPerson.deathTownName ? ` · ${page.memorialPerson.deathTownName}` : ''}
            </div>
          </div>
          <div>
            <div className="memoriam-provenance-label">Published</div>
            <div className="memoriam-provenance-value">{fmtLong(page.publishedAt) ?? '—'}</div>
          </div>
          <div>
            <div className="memoriam-provenance-label">Stewardship</div>
            <div className="memoriam-provenance-value">Managed by Highlander Today staff.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. New file — `src/components/memoriam/MemoriamCard.tsx`

```tsx
import Link from 'next/link';

interface Props {
  page: {
    id: string;
    slug: string;
    title: string;
    pageType: 'DEATH_NOTICE' | 'MEMORIAL_PAGE' | string;
    shortSummary: string | null;
    serviceDetails: string | null;
    publishedAt: Date | null;
    heroImageUrl: string | null;
    memorialPerson: {
      fullName: string;
      preferredName: string | null;
      birthDate: Date | null;
      deathDate: Date | null;
      townName: string | null;
    };
  };
  size: 'default' | 'lg' | 'xl';
}

function years(b: Date | null, d: Date | null) {
  return [b?.getFullYear(), d?.getFullYear()].filter(Boolean).join(' — ');
}

export default function MemoriamCard({ page, size }: Props) {
  const display = page.memorialPerson.preferredName || page.memorialPerson.fullName;
  const lede = page.shortSummary?.trim() || page.serviceDetails?.trim() || '';
  const isNotice = page.pageType === 'DEATH_NOTICE';

  return (
    <Link
      href={`/memoriam/${page.slug}`}
      className={`memoriam-card ${size === 'lg' ? 'size-lg' : size === 'xl' ? 'size-xl' : ''}`}
    >
      <div className="memoriam-card-img">
        {page.heroImageUrl ? <img src={page.heroImageUrl} alt="" /> : null}
      </div>
      <div className={`memoriam-card-tag ${isNotice ? 'is-notice' : ''}`}>
        {isNotice ? 'Notice' : 'A Life'} · {page.memorialPerson.townName ?? 'Local'}
      </div>
      <h3 className="memoriam-card-title">{display}</h3>
      <p className="memoriam-card-meta">
        {years(page.memorialPerson.birthDate, page.memorialPerson.deathDate)}
      </p>
      {lede ? <p className="memoriam-card-lede">{lede}</p> : null}
    </Link>
  );
}
```

---

## 8. New homepage block — `src/components/memoriam/RecentlyRemembered.tsx`

A small 3-up module to drop into the homepage. Place it where the
"recent death notices" block lives in the homepage spec.

```tsx
import Link from 'next/link';
import { headers } from 'next/headers';
import { getCurrentCommunity } from '@/lib/community';
import { getMemoriamFeed } from '@/lib/memoriam/feed';

export default async function RecentlyRemembered() {
  const c = await getCurrentCommunity({ headers: headers() });
  const feed = await getMemoriamFeed({ communityId: c?.id, limit: 12 });
  const items = feed.filter((p) => p.heroImageUrl).slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section
      style={{
        background: 'var(--paper-2)',
        padding: '2.25rem 3rem',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--rule)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--rule-strong)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--memoriam-display)',
            fontWeight: 500,
            fontSize: '1.75rem',
            letterSpacing: '-0.015em',
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Recently remembered
        </h2>
        <Link
          href="/memoriam"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--brand-primary)',
            textDecoration: 'none',
          }}
        >
          All of Memoriam →
        </Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {items.map((p) => {
          const name = p.memorialPerson.preferredName || p.memorialPerson.fullName;
          const yrs = [p.memorialPerson.birthDate?.getFullYear(), p.memorialPerson.deathDate?.getFullYear()]
            .filter(Boolean).join(' — ');
          const isNotice = p.pageType === 'DEATH_NOTICE';
          return (
            <Link
              key={p.id}
              href={`/memoriam/${p.slug}`}
              style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  aspectRatio: '4 / 5',
                  background: 'repeating-linear-gradient(135deg, #ece7da 0 8px, #e6e0d2 8px 16px)',
                  marginBottom: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                {p.heroImageUrl ? <img src={p.heroImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: isNotice ? 'var(--brand-accent)' : 'var(--brand-primary)',
                  marginBottom: '0.25rem',
                }}
              >
                {isNotice ? 'Notice' : 'A Life'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--memoriam-display)',
                  fontWeight: 500,
                  fontSize: '1.375rem',
                  letterSpacing: '-0.01em',
                  color: 'var(--ink)',
                }}
              >
                {name}
              </div>
              <div
                style={{
                  fontFamily: 'var(--memoriam-body)',
                  fontSize: '0.8125rem',
                  fontStyle: 'italic',
                  color: 'var(--app-text-muted)',
                }}
              >
                {yrs} · {p.memorialPerson.townName ?? 'Local'}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

Drop into the homepage:

```tsx
// e.g. src/app/page.tsx, in the same row stack as Events, Local Life, etc.
import RecentlyRemembered from '@/components/memoriam/RecentlyRemembered';
// …
<RecentlyRemembered />
```

---

## 9. Schema / data work

The redesign requires two pieces of data the current schema doesn't fully support
in a clean way. Both can ship after the visual cutover; the components above
no-op when the data is missing.

**Required (or the design gracefully degrades):**

- `MemorialPage.heroImageUrl: String?` — the lead portrait used on cards and
  on the detail hero. If you already store this on a related media model,
  alias it through `select` instead of adding a column.

**Recommended:**

- `MemorialPagePhoto` model — `id`, `memorialPageId`, `url`, `caption`,
  `order`, plus the usual moderation fields. Powers the photo essay.
  Until this exists, the photo essay block stays commented out (see
  step 6); the page still reads correctly.

Migration template:

```prisma
model MemorialPage {
  // …existing fields…
  heroImageUrl String?
  photos       MemorialPagePhoto[]
}

model MemorialPagePhoto {
  id              String   @id @default(cuid())
  memorialPageId  String
  url             String
  caption         String?
  order           Int      @default(0)
  status          ContentStatus @default(PENDING)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  memorialPage MemorialPage @relation(fields: [memorialPageId], references: [id], onDelete: Cascade)

  @@index([memorialPageId, order])
}
```

Also: surface a `heroImageUrl` upload field in the admin submission review
flow so staff can attach a portrait at approval time. The submission form
itself does not need to change in this pass — the upload can be added as a
staff-only field in `MemoriamAdminClient.tsx`.

---

## 10. `ArticleCategorySectionPage.tsx` — light update

`src/components/sections/ArticleCategorySectionPage.tsx` already has a
`isMemoriamCategory` branch that hits `/api/memoriam/pages` and renders
`memorialPages.map(...)`. Replace just that mapped JSX block with the
`<MemoriamCard>` component so category-scoped pages match the new look.

```tsx
// inside the existing isMemoriamCategory branch in the render:
import MemoriamCard from '@/components/memoriam/MemoriamCard';
// …
<div className="memoriam-feed">
  {memorialPages.map((p, i) => (
    <MemoriamCard
      key={p.id}
      page={p}
      size={i === 0 ? 'xl' : i === 3 || i === 4 ? 'lg' : 'default'}
    />
  ))}
</div>
```

The wrapping section header, search, and pagination stay the same — only the
result list visual changes.

---

## 11. Copy review

Replace any of the following strings if they remain anywhere on public surfaces.
None of them should appear in the new build.

| Remove | Why |
|---|---|
| "Memoriam is a careful public record. Notices and memorial pages appear here only after review…" (band copy) | Process talk leading the page; moves to a small footnote. |
| "Recent death notices and memorial pages reviewed for publication." (page header description) | Same. The new band's right-hand sentence does the framing. |
| "Review Signals" sidebar heading | Admin-app vocabulary. |
| "No reviewed memories are public yet." | Use "No memories have been added yet." |
| "Memorial pages" / "Death notices" as separate H2s | Single feed; type appears as inline tag. |

Adjacent copy that should sound celebratory:

- Card lede: pull from `shortSummary` and **prefer one strong sentence** about
  what someone was known for — not service logistics. If staff editorial wants
  a separate field for this, add `MemorialPage.knownFor: String?` and prefer
  it over `shortSummary` on cards.
- Memory CTA: "Knew {name}? Add a memory — staff will review before it
  appears." (instead of "Memorial Memory" form heading.)

---

## 12. Files touched (summary)

| File | Action |
|---|---|
| `src/app/globals.css` | Add memoriam component classes (step 3) and two ink tokens. |
| `src/lib/memoriam/feed.ts` | New — shared feed query + `heroSizeFor`. |
| `src/app/memoriam/page.tsx` | Replace. |
| `src/app/memoriam/[slug]/page.tsx` | Replace. |
| `src/app/memoriam/[slug]/MemorialMemoryForm.tsx` | Keep. Unchanged. |
| `src/components/memoriam/MemoriamCard.tsx` | New. |
| `src/components/memoriam/RecentlyRemembered.tsx` | New. Wire into homepage. |
| `src/components/sections/ArticleCategorySectionPage.tsx` | Replace memoriam result block with `MemoriamCard`. |
| `prisma/schema.prisma` | Add `MemorialPage.heroImageUrl` + (optional) `MemorialPagePhoto` model. |
| `src/app/admin/memoriam/MemoriamAdminClient.tsx` | Add hero-image upload at staff review (later, non-blocking). |

---

## 13. Rollout order

1. Add tokens + memoriam CSS block to `globals.css`. (Visual no-op until used.)
2. Add `MemoriamPage.heroImageUrl` migration. Backfill where possible.
3. Add `getMemoriamFeed` lib + `MemoriamCard` component.
4. Replace `src/app/memoriam/page.tsx`. Ship behind a query-string preview
   flag (`?v=2`) for one round if you want a soft cutover, otherwise direct.
5. Replace `src/app/memoriam/[slug]/page.tsx`.
6. Update `ArticleCategorySectionPage.tsx` memoriam branch.
7. Add `RecentlyRemembered` and wire into homepage.
8. Add `MemorialPagePhoto` model + admin upload + uncomment the photo-essay
   block in step 6.
9. Add `knownFor` field if editorial wants the dedicated lede line.

---

## 14. Acceptance checklist

- [ ] `/memoriam` renders one chronological list grouped by month, with the
      photo-forward grid and dark filter strip.
- [ ] First entry per page renders at `xl` size when it has a hero image.
- [ ] Filter pills (`All` / `Lives` / `Notices`) reflect URL `?type=`.
- [ ] Search input posts to `/memoriam?q=...` and persists in the input.
- [ ] `/memoriam/[slug]` renders the split hero, two-column body, memories
      as numbered entries, and provenance strip — and no review-process
      sidebar.
- [ ] Pages with no `heroImageUrl` render placeholder backgrounds, not
      broken images.
- [ ] No body text uses `uppercase tracking-[0.18em]` patterns from the
      old admin-style cards.
- [ ] Homepage shows the `Recently remembered` 3-up.
- [ ] Mobile widths collapse the split hero to one column and the grid to
      one column.
- [ ] No copy remaining on public surfaces describes the review process as
      the lede.
