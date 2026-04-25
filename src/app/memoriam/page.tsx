import Link from 'next/link';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';

interface MemoriamPageProps {
  searchParams?: {
    q?: string;
    type?: string;
  };
}

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'death-notices', label: 'Death Notices' },
  { key: 'memorial-pages', label: 'Memorial Pages' },
] as const;

function formatDate(value: Date | null) {
  if (!value) {
    return 'Date unavailable';
  }

  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildFilterHref(type: string, query: string) {
  const params = new URLSearchParams();
  if (type !== 'all') {
    params.set('type', type);
  }
  if (query) {
    params.set('q', query);
  }

  const queryString = params.toString();
  return queryString ? `/memoriam?${queryString}` : '/memoriam';
}

export default async function MemoriamPage({ searchParams }: MemoriamPageProps) {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const query = searchParams?.q?.trim() || '';
  const activeType = TYPE_FILTERS.some((filter) => filter.key === searchParams?.type)
    ? searchParams?.type
    : 'all';

  const where: Prisma.MemorialPageWhereInput = {
    status: 'PUBLISHED',
    ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
    ...(activeType === 'death-notices'
      ? { pageType: 'DEATH_NOTICE' }
      : activeType === 'memorial-pages'
        ? { pageType: 'MEMORIAL_PAGE' }
        : {}),
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

  const pages = await db.memorialPage.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      pageType: true,
      shortSummary: true,
      serviceDetails: true,
      publishedAt: true,
      memorialPerson: {
        select: {
          fullName: true,
          preferredName: true,
          deathDate: true,
          townName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
  });

  const deathNotices = pages.filter((page) => page.pageType === 'DEATH_NOTICE');
  const memorialPages = pages.filter((page) => page.pageType === 'MEMORIAL_PAGE');
  const resultCount = pages.length;

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Memoriam"
        description="Recent death notices and memorial pages reviewed for publication."
        mobileAlign="start"
        actions={
          <Link href="/memoriam/submit" className="page-header-action">
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M10 4.5v11" />
              <path strokeLinecap="round" d="M4.5 10h11" />
            </svg>
            <span className="page-header-action-label">Submit</span>
          </Link>
        }
      />

      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Memoriam is a careful public record. Notices and memorial pages appear here only after review; richer family stewardship, memories, and photo contributions remain separate moderated steps.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/86 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <form action="/memoriam" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          {activeType !== 'all' ? <input type="hidden" name="type" value={activeType} /> : null}
          <label className="sr-only" htmlFor="memoriam-search">
            Search Memoriam
          </label>
          <input
            id="memoriam-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name, town, service details"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          />
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => {
              const isActive = activeType === filter.key;
              return (
                <Link
                  key={filter.key}
                  href={buildFilterHref(filter.key, query)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {resultCount} {resultCount === 1 ? 'record' : 'records'}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-950">Recent death notices</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {deathNotices.length} published
          </p>
        </div>

        {deathNotices.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-12 text-sm text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            {query || activeType !== 'all'
              ? 'No published death notices match the current search.'
              : 'No published death notices yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {deathNotices.map((page) => (
              <Link
                key={page.id}
                href={`/memoriam/${page.slug}`}
                className="block rounded-[24px] border border-white/10 bg-white/86 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {page.category?.name || 'Death Notice'}
                    </p>
                    <h3 className="text-xl font-bold text-slate-950">
                      {page.memorialPerson.preferredName || page.memorialPerson.fullName}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {page.memorialPerson.townName || 'Community connection not listed'}
                      {' · '}
                      {formatDate(page.memorialPerson.deathDate)}
                    </p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Published {formatDate(page.publishedAt)}
                  </p>
                </div>
                {page.shortSummary?.trim() ? (
                  <p className="mt-3 text-sm leading-7 text-slate-600">{page.shortSummary}</p>
                ) : page.serviceDetails?.trim() ? (
                  <p className="mt-3 text-sm leading-7 text-slate-600">{page.serviceDetails}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-950">Memorial pages</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {memorialPages.length} published
          </p>
        </div>

        {memorialPages.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-12 text-sm text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            {query || activeType !== 'all'
              ? 'No published memorial pages match the current search.'
              : 'No published memorial pages yet.'}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {memorialPages.map((page) => (
              <Link
                key={page.id}
                href={`/memoriam/${page.slug}`}
                className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.14)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {page.category?.name || 'Memorial Page'}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">
                  {page.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {page.memorialPerson.fullName}
                  {' · '}
                  {page.memorialPerson.townName || 'Community connection not listed'}
                </p>
                {page.shortSummary?.trim() ? (
                  <p className="mt-4 text-sm leading-7 text-slate-600">{page.shortSummary}</p>
                ) : null}
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Published {formatDate(page.publishedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
