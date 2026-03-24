import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import {
  resolveSearchCommunityId,
  searchContentPage,
  type SearchCounts,
  type SearchResult,
  type SearchResultType,
} from '@/lib/search';

type SearchPageProps = {
  searchParams?: {
    q?: string | string[];
    type?: string | string[];
    page?: string | string[];
  };
};

type ResultFilter = 'all' | SearchResultType;

const FILTER_LABELS: Record<ResultFilter, string> = {
  all: 'All',
  article: 'Articles',
  event: 'Events',
  marketplace: 'Market',
};

const PAGE_SIZE = 12;

function getSingleParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeFilter(value: string): ResultFilter {
  return value === 'article' || value === 'event' || value === 'marketplace' ? value : 'all';
}

function buildSearchHref(query: string, filter: ResultFilter, page = 1): string {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  if (filter !== 'all') {
    params.set('type', filter);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const search = params.toString();
  return search ? `/search?${search}` : '/search';
}

function getFilterCount(filter: ResultFilter, counts: SearchCounts): number {
  if (filter === 'all') {
    return counts.article + counts.event + counts.marketplace;
  }

  return counts[filter];
}

function getResultLabel(type: SearchResultType): string {
  switch (type) {
    case 'article':
      return 'Local Life';
    case 'event':
      return 'Event';
    case 'marketplace':
      return 'Market';
  }
}

function getEmptyStateCopy(filter: ResultFilter): string {
  switch (filter) {
    case 'article':
      return 'No articles matched this search.';
    case 'event':
      return 'No events matched this search.';
    case 'marketplace':
      return 'No market listings matched this search.';
    default:
      return 'No results matched this search.';
  }
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.url}
      className="group grid gap-4 rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[7rem_1fr]"
    >
      <div className="relative h-28 overflow-hidden rounded-xl bg-[#f3f0eb]">
        {result.imageUrl ? (
          <Image
            src={result.imageUrl}
            alt={result.title}
            fill
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#46A8CC] to-[#2c7f9e] text-xs font-bold uppercase tracking-[0.2em] text-white">
            {getResultLabel(result.type)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#A51E30] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            {getResultLabel(result.type)}
          </span>
          {result.metadata ? <span className="text-xs text-gray-500">{result.metadata}</span> : null}
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-[#46A8CC]">
          {result.title}
        </h2>

        {result.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-gray-600">{result.description}</p>
        ) : (
          <p className="text-sm italic text-gray-400">No summary available.</p>
        )}
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = getSingleParam(searchParams?.q).trim();
  const selectedFilter = normalizeFilter(getSingleParam(searchParams?.type));
  const rawPage = Number.parseInt(getSingleParam(searchParams?.page) || '1', 10);
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const headerList = headers();
  const communityId = await resolveSearchCommunityId({
    communityId: headerList.get('x-community-id'),
    communityDomain: headerList.get('x-community-domain'),
    host: headerList.get('host'),
  });

  const hasValidQuery = query.length >= 2;
  const searchData = hasValidQuery
    ? await searchContentPage(query, {
        communityId,
        page: currentPage,
        limit: PAGE_SIZE,
        type: selectedFilter === 'all' ? undefined : selectedFilter,
      })
    : {
        query,
        results: [],
        counts: { article: 0, event: 0, marketplace: 0 },
        pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
      };

  const totalResults = getFilterCount('all', searchData.counts);
  const summaryLabel =
    selectedFilter === 'all' ? 'results' : FILTER_LABELS[selectedFilter].toLowerCase();

  return (
    <div>
      <section className="mb-8 rounded-[2rem] bg-gradient-to-r from-[#f4ede3] via-white to-[#d9eef6] p-6 shadow-sm">
        <h1 className="mb-3 border-b-2 border-[#A51E30] pb-3 text-2xl font-bold">Search</h1>
        <p className="mb-5 max-w-2xl text-sm leading-6 text-gray-600">
          Search across Local Life, community events, and market listings for this community.
        </p>

        <form action="/search" method="get" className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search articles, events, listings..."
            className="flex-1 rounded-full border border-gray-300 bg-white px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
          {selectedFilter !== 'all' ? <input type="hidden" name="type" value={selectedFilter} /> : null}
          <button
            type="submit"
            className="rounded-full bg-[#A51E30] px-8 py-3 font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            Search
          </button>
        </form>
      </section>

      {!query ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center text-gray-500 shadow-sm">
          Enter a search term to get started.
        </div>
      ) : !hasValidQuery ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-10 text-center text-yellow-800">
          Enter at least 2 characters to search.
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#A51E30]">
                Search Results
              </p>
              <p className="text-sm text-gray-600">
                {searchData.pagination.total} {summaryLabel} for{' '}
                <span className="font-semibold text-gray-900">&quot;{query}&quot;</span>
                {selectedFilter !== 'all' ? ` in ${FILTER_LABELS[selectedFilter]}` : ''}.
              </p>
              {selectedFilter !== 'all' && totalResults !== searchData.pagination.total ? (
                <p className="text-xs text-gray-500">
                  {totalResults} total matches across all content types.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS) as ResultFilter[]).map((filter) => {
                const isActive = filter === selectedFilter;
                return (
                  <Link
                    key={filter}
                    href={buildSearchHref(query, filter)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[#A51E30] text-white shadow-sm'
                        : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {FILTER_LABELS[filter]} ({getFilterCount(filter, searchData.counts)})
                  </Link>
                );
              })}
            </div>
          </div>

          {searchData.results.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-gray-500 shadow-sm">
              {getEmptyStateCopy(selectedFilter)}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {searchData.results.map((result) => (
                  <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
                ))}
              </div>

              {searchData.pagination.totalPages > 1 ? (
                <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href={buildSearchHref(query, selectedFilter, searchData.pagination.page - 1)}
                    aria-disabled={searchData.pagination.page === 1}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      searchData.pagination.page === 1
                        ? 'pointer-events-none border-gray-200 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </Link>

                  {Array.from({ length: searchData.pagination.totalPages }, (_, index) => index + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === searchData.pagination.totalPages ||
                        Math.abs(page - searchData.pagination.page) <= 1
                      );
                    })
                    .reduce<number[]>((pages, page) => {
                      if (pages[pages.length - 1] !== page) {
                        pages.push(page);
                      }
                      return pages;
                    }, [])
                    .map((page, index, pages) => {
                      const previousPage = pages[index - 1];
                      const showGap = previousPage && page - previousPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-2">
                          {showGap ? <span className="px-1 text-gray-400">…</span> : null}
                          <Link
                            href={buildSearchHref(query, selectedFilter, page)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${
                              page === searchData.pagination.page
                                ? 'bg-[#46A8CC] text-white'
                                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </Link>
                        </div>
                      );
                    })}

                  <Link
                    href={buildSearchHref(query, selectedFilter, searchData.pagination.page + 1)}
                    aria-disabled={
                      searchData.pagination.page === searchData.pagination.totalPages
                    }
                    className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                      searchData.pagination.page === searchData.pagination.totalPages
                        ? 'pointer-events-none border-gray-200 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </Link>
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
