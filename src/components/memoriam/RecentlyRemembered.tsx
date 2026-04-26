/* eslint-disable @next/next/no-img-element */
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
          borderBottom: '1px solid var(--rule)',
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
          const yrs = [
            p.memorialPerson.birthDate ? new Date(p.memorialPerson.birthDate).getFullYear() : null,
            p.memorialPerson.deathDate ? new Date(p.memorialPerson.deathDate).getFullYear() : null,
          ]
            .filter(Boolean)
            .join(' — ');
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
                {p.heroImageUrl ? (
                  <img src={p.heroImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
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
