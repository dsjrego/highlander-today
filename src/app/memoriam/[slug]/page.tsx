/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import MemorialMemoryForm from './MemorialMemoryForm';

interface PageProps { params: { slug: string } }

function fmtLong(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtYear(d: Date | null) { return d ? d.getFullYear().toString() : null; }

/** Extract a YouTube embed URL from a watch/share link */
function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1).split('/')[0] || null;
    } else if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v');
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Extract a Vimeo embed URL */
function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function toEmbedUrl(url: string): string | null {
  return youtubeEmbedUrl(url) ?? vimeoEmbedUrl(url);
}

async function getPage(slug: string, communityId?: string) {
  return db.memorialPage.findFirst({
    where: { slug, status: 'PUBLISHED', ...(communityId ? { communityId } : {}) },
    select: {
      id: true, title: true, shortSummary: true, biography: true, lifeStory: true,
      serviceDetails: true, familyDetails: true, provenanceNote: true,
      pageType: true, approvedAt: true, publishedAt: true, updatedAt: true,
      heroImageUrl: true,
      videoEmbeds: true,
      serviceStreamUrl: true,
      category: { select: { name: true } },
      memorialPerson: {
        select: {
          fullName: true, preferredName: true, age: true,
          birthDate: true, deathDate: true,
          townName: true, birthTownName: true, deathTownName: true,
        },
      },
      photos: {
        where: { status: 'APPROVED' },
        select: { id: true, imageUrl: true, caption: true, altText: true },
        orderBy: { createdAt: 'asc' },
      },
      contributors: {
        where: { status: 'ACTIVE', role: { in: ['STEWARD', 'CO_STEWARD'] } },
        select: { userId: true, role: true },
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
    openGraph: page.heroImageUrl ? { images: [page.heroImageUrl] } : undefined,
    alternates: { canonical: `/memoriam/${params.slug}` },
  };
}

export default async function MemorialDetailPage({ params }: PageProps) {
  const [c, session] = await Promise.all([
    getCurrentCommunity({ headers: headers() }),
    getServerSession(authOptions),
  ]);
  const page = await getPage(params.slug, c?.id);
  if (!page) notFound();

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isSteward = userId
    ? page.contributors.some((ct) => ct.userId === userId)
    : false;

  const display = page.memorialPerson.preferredName || page.memorialPerson.fullName;
  const dates = [fmtYear(page.memorialPerson.birthDate), fmtYear(page.memorialPerson.deathDate)]
    .filter(Boolean).join(' — ');
  const fullDates = `${fmtLong(page.memorialPerson.birthDate) ?? '?'} — ${fmtLong(page.memorialPerson.deathDate) ?? '?'}`;

  // Compose body paragraphs from biography and lifeStory
  const bodyText = [page.biography, page.lifeStory].filter(Boolean).join('\n\n').trim();
  const paragraphs = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  // Video embeds — resolve to embed URLs, filter out invalid ones
  const embeds = (page.videoEmbeds ?? [])
    .map((url) => ({ url, embedUrl: toEmbedUrl(url) }))
    .filter((v): v is { url: string; embedUrl: string } => Boolean(v.embedUrl));

  // Gallery photos (excluding the hero so it isn't shown twice)
  const galleryPhotos = page.photos.filter((p) => p.imageUrl !== page.heroImageUrl);

  void dates; // computed but used only implicitly through fullDates/display

  return (
    <div className="memoriam-page">
      <div style={{ padding: '1.25rem 3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/memoriam" className="memoriam-band-eyebrow" style={{ textDecoration: 'none' }}>
          ← Memoriam
        </Link>
        {isSteward && (
          <Link
            href={`/memoriam/${params.slug}/manage`}
            className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Manage memorial
          </Link>
        )}
      </div>

      {/* Split hero */}
      <section className="memoriam-detail-hero">
        <div className="memoriam-detail-hero-img">
          {page.heroImageUrl ? <img src={page.heroImageUrl} alt={`${display} — memorial photo`} /> : null}
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
        {/* Body prose */}
        {paragraphs.length > 0 ? (
          <div className="memoriam-prose">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        ) : null}

        {/* Photo gallery — approved non-hero photos */}
        {galleryPhotos.length > 0 && (
          <section className="memoriam-essay" style={{ borderTop: 0, paddingTop: 0 }}>
            <h2 className="memoriam-essay-title">Photos</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {galleryPhotos.map((photo) => (
                <figure key={photo.id} style={{ margin: 0 }}>
                  <img
                    src={photo.imageUrl}
                    alt={photo.altText || photo.caption || `${display} — photo`}
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      borderRadius: '0.75rem',
                      display: 'block',
                    }}
                  />
                  {photo.caption && (
                    <figcaption
                      style={{
                        marginTop: '0.4rem',
                        fontSize: '0.8125rem',
                        color: 'var(--ink-soft)',
                        fontFamily: 'var(--memoriam-body)',
                      }}
                    >
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Video embeds */}
        {embeds.length > 0 && (
          <section className="memoriam-essay" style={{ borderTop: 0, paddingTop: 0 }}>
            <h2 className="memoriam-essay-title">Videos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {embeds.map((v) => (
                <div
                  key={v.url}
                  style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <iframe
                    src={v.embedUrl}
                    title="Memorial video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Memorial service stream link */}
        {page.serviceStreamUrl && (
          <section className="memoriam-essay" style={{ borderTop: 0, paddingTop: 0 }}>
            <h2 className="memoriam-essay-title">Memorial Service</h2>
            <a
              href={page.serviceStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--memoriam-body)',
                fontSize: '1rem',
                color: 'var(--app-primary)',
                textDecoration: 'underline',
              }}
            >
              Watch the memorial service recording →
            </a>
          </section>
        )}

        {/* Service details */}
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

        {/* Memories */}
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
            <span>Knew {display}? Add a memory — {isSteward ? 'you can approve it directly as steward.' : 'staff will review before it appears.'}</span>
          </div>
          <MemorialMemoryForm memorialPageId={page.id} />
        </section>

        {/* Provenance strip */}
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
            <div className="memoriam-provenance-value">
              {page.contributors.length > 0
                ? `Stewarded by ${page.contributors.length === 1 ? 'family' : 'family and community'}.`
                : 'Managed by Highlander Today staff.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
