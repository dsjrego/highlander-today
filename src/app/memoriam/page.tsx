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
          aria-label="Search Memoriam"
        />
        <div className="memoriam-pillbar">
          {TYPE_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={buildHref(f.key, query)}
              className={`memoriam-pill${type === f.key ? ' is-active' : ''}`}
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
