import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import DirectoryCategoryPills from './DirectoryCategoryPills';
import DirectoryMessageAction from './DirectoryMessageAction';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { ORGANIZATION_TYPE_OPTIONS } from '@/lib/organization-taxonomy';
import { formatOrganizationTypeLabel } from '@/lib/organizations';
import { hasTrustedAccess } from '@/lib/trust-access';

type DirectoryPageSearchParams = {
  category?: string;
  q?: string;
  type?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

type DirectoryRow = {
  id: string;
  name: string;
  href?: string;
  section: 'People' | 'Businesses' | 'Government' | 'Organizations';
  type: string;
  contact: string;
  messageUserId?: string;
};

type DirectorySortKey = 'name' | 'section' | 'type';
type DirectorySortDirection = 'asc' | 'desc';

export const metadata: Metadata = {
  title: 'Directory | Highlander Today',
  description:
    'Explore people, businesses, government, and community organizations across Highlander Today.',
};

const DIRECTORY_PAGE_SIZE = 25;

function buildDirectoryHref(params: {
  category?: string | null;
  query?: string | null;
  type?: string | null;
  page?: number | null;
  sort?: DirectorySortKey | null;
  dir?: DirectorySortDirection | null;
}) {
  const search = new URLSearchParams();

  if (params.category) {
    search.set('category', params.category);
  }

  if (params.query) {
    search.set('q', params.query);
  }

  if (params.type) {
    search.set('type', params.type);
  }

  if (params.page && params.page > 1) {
    search.set('page', String(params.page));
  }

  if (params.sort) {
    search.set('sort', params.sort);
  }

  if (params.dir) {
    search.set('dir', params.dir);
  }

  const queryString = search.toString();
  return queryString ? `/directory?${queryString}` : '/directory';
}

function normalizeSortKey(value: string | undefined): DirectorySortKey {
  return value === 'section' || value === 'type' ? value : 'name';
}

function normalizeSortDirection(value: string | undefined): DirectorySortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

function compareText(a: string, b: string, direction: DirectorySortDirection) {
  const result = a.localeCompare(b);
  return direction === 'asc' ? result : -result;
}

function getNextSortDirection(
  currentSort: DirectorySortKey,
  currentDirection: DirectorySortDirection,
  targetSort: DirectorySortKey
): DirectorySortDirection {
  if (currentSort !== targetSort) {
    return 'asc';
  }

  return currentDirection === 'asc' ? 'desc' : 'asc';
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<DirectoryPageSearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; trust_level?: string; role?: string } | undefined;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeCategorySlug = resolvedSearchParams?.category ?? null;
  const query = resolvedSearchParams?.q?.trim() ?? '';
  const hasSearchQuery = query.length > 0;
  const isOrganizationBrowseCategory =
    activeCategorySlug === 'businesses' ||
    activeCategorySlug === 'government' ||
    activeCategorySlug === 'organizations';
  const shouldLoadOrganizations = hasSearchQuery || isOrganizationBrowseCategory;
  const selectedType = resolvedSearchParams?.type?.trim() ?? '';
  const rawPage = Number.parseInt(resolvedSearchParams?.page ?? '1', 10);
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const sort = normalizeSortKey(resolvedSearchParams?.sort);
  const dir = normalizeSortDirection(resolvedSearchParams?.dir);
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });
  const currentUserProfile =
    sessionUser?.id
      ? await db.user.findUnique({
          where: { id: sessionUser.id },
          select: {
            id: true,
            isDirectoryListed: true,
          },
        })
      : null;
  const canUseDirectoryMessaging = hasTrustedAccess({
    trustLevel: sessionUser?.trust_level,
    role: sessionUser?.role,
  });
  const profileHref = currentUserProfile ? `/profile/${currentUserProfile.id}` : '/profile';
  const selectedBusinessType =
    activeCategorySlug === 'businesses' &&
    ORGANIZATION_TYPE_OPTIONS.BUSINESS.some((option) => option.value === selectedType)
      ? selectedType
      : '';
  const selectedOrganizationType =
    activeCategorySlug === 'organizations' &&
    ORGANIZATION_TYPE_OPTIONS.ORGANIZATION.some((option) => option.value === selectedType)
      ? selectedType
      : '';

  const [people, organizations] = shouldLoadOrganizations || hasSearchQuery
    ? await Promise.all([
        hasSearchQuery
          ? db.user.findMany({
              where: {
                isDirectoryListed: true,
                ...(currentCommunity?.id
                  ? {
                      memberships: {
                        some: {
                          communityId: currentCommunity.id,
                        },
                      },
                    }
                  : {}),
                OR: [
                  { firstName: { contains: query, mode: 'insensitive' } },
                  { lastName: { contains: query, mode: 'insensitive' } },
                  { bio: { contains: query, mode: 'insensitive' } },
                ],
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                bio: true,
                memberships: {
                  where: currentCommunity?.id ? { communityId: currentCommunity.id } : undefined,
                  select: {
                    community: {
                      select: {
                        name: true,
                      },
                    },
                  },
                  take: 1,
                },
              },
              orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
              take: 50,
            })
          : Promise.resolve([]),
        shouldLoadOrganizations
          ? db.organization.findMany({
              where: {
                status: 'APPROVED',
                ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
                ...(activeCategorySlug === 'businesses'
                  ? {
                      directoryGroup: 'BUSINESS',
                      ...(selectedBusinessType ? { organizationType: selectedBusinessType } : {}),
                    }
                  : activeCategorySlug === 'government'
                    ? { directoryGroup: 'GOVERNMENT' }
                    : activeCategorySlug === 'organizations'
                      ? {
                          directoryGroup: 'ORGANIZATION',
                          ...(selectedOrganizationType ? { organizationType: selectedOrganizationType } : {}),
                        }
                      : {}),
                ...(hasSearchQuery
                  ? {
                      OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { organizationType: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } },
                      ],
                    }
                  : {}),
              },
              select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                directoryGroup: true,
                organizationType: true,
                websiteUrl: true,
                contactEmail: true,
                contactPhone: true,
              },
              orderBy: [{ name: 'asc' }],
              take: 100,
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const rows: DirectoryRow[] = [
        ...(activeCategorySlug === null || activeCategorySlug === 'people'
      ? people.map((person) => ({
          id: person.id,
          name: `${person.lastName}, ${person.firstName}`,
          href: `/profile/${person.id}`,
          section: 'People' as const,
          type: 'Person',
          contact: 'Message through Highlander Today',
          messageUserId: person.id,
        }))
      : []),
    ...organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      href: `/organizations/${organization.slug}`,
      section:
        organization.directoryGroup === 'BUSINESS'
          ? ('Businesses' as const)
          : organization.directoryGroup === 'GOVERNMENT'
            ? ('Government' as const)
            : ('Organizations' as const),
      type: formatOrganizationTypeLabel(organization.organizationType),
      contact:
        organization.contactPhone ||
        organization.contactEmail ||
        organization.websiteUrl ||
        'No public contact',
    })),
  ].sort((a, b) => {
    if (sort === 'section') {
      const sectionComparison = compareText(a.section, b.section, dir);
      return sectionComparison !== 0 ? sectionComparison : a.name.localeCompare(b.name);
    }

    if (sort === 'type') {
      const typeComparison = compareText(a.type, b.type, dir);
      return typeComparison !== 0 ? typeComparison : a.name.localeCompare(b.name);
    }

    return compareText(a.name, b.name, dir);
  });

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / DIRECTORY_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * DIRECTORY_PAGE_SIZE;
  const pagedRows = rows.slice(pageStart, pageStart + DIRECTORY_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <InternalPageHeader
        title="Directory"
        mobileAlign="center"
        compactMobile
        className="mb-0"
        titleClassName="text-center leading-none"
      />

      <section className="space-y-3 overflow-visible rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-5">
          {!sessionUser ? (
            <div className="text-sm text-slate-700">
              <p>Create an account to message people or organizations through Highlander Today.</p>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <Link href="/login" className="text-[#0f5771] hover:underline">
                  Sign In
                </Link>
                <Link href="/login?mode=sign-up" className="text-[#0f5771] hover:underline">
                  Create Account
                </Link>
              </div>
            </div>
          ) : !canUseDirectoryMessaging ? (
            <div className="text-sm text-slate-700">
              <p>Trusted users can appear in the directory and use directory messaging.</p>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <Link href={profileHref} className="text-[#0f5771] hover:underline">
                  Go to Profile
                </Link>
              </div>
            </div>
          ) : currentUserProfile && !currentUserProfile.isDirectoryListed ? (
            <div className="text-sm text-slate-700">
              <p>
                You&apos;re eligible to appear in the people directory. Enable directory listing from your{' '}
                <Link href={profileHref} className="font-semibold text-[#0f5771] underline-offset-2 hover:underline">
                  profile settings.
                </Link>
              </p>
            </div>
          ) : null}

          <form action="/directory" method="get">
            {activeCategorySlug ? <input type="hidden" name="category" value={activeCategorySlug} /> : null}
            {selectedType ? <input type="hidden" name="type" value={selectedType} /> : null}
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
            <div className="flex items-center gap-3 border-b border-slate-200 pb-2 transition focus-within:border-[#46A8CC]">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 text-slate-400"
              >
                <path d="m14.5 14.5 4 4" strokeLinecap="round" />
                <circle cx="8.5" cy="8.5" r="5.5" />
              </svg>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search people, businesses, departments, offices..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                aria-label="Search directory"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#0f5771]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="m14.5 14.5 4 4" strokeLinecap="round" />
                  <circle cx="8.5" cy="8.5" r="5.5" />
                </svg>
              </button>
            </div>
          </form>

          <DirectoryCategoryPills
            query={query}
            activeCategorySlug={activeCategorySlug}
            selectedBusinessType={selectedBusinessType}
            selectedOrganizationType={selectedOrganizationType}
            businessOptions={ORGANIZATION_TYPE_OPTIONS.BUSINESS}
            organizationOptions={ORGANIZATION_TYPE_OPTIONS.ORGANIZATION}
          />

          {pagedRows.length > 0 ? (
            <div>
              <div className="hidden border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid sm:grid-cols-[minmax(0,1fr)_140px_140px_220px] sm:gap-4">
                <Link
                  href={buildDirectoryHref({
                    category: activeCategorySlug,
                    query: query || null,
                    type: selectedType || null,
                    page: 1,
                    sort: 'name',
                    dir: getNextSortDirection(sort, dir, 'name'),
                  })}
                  className={sort === 'name' ? 'text-slate-900' : 'hover:text-slate-900'}
                >
                  Name{sort === 'name' ? ` ${dir === 'asc' ? '↑' : '↓'}` : ''}
                </Link>
                <Link
                  href={buildDirectoryHref({
                    category: activeCategorySlug,
                    query: query || null,
                    type: selectedType || null,
                    page: 1,
                    sort: 'section',
                    dir: getNextSortDirection(sort, dir, 'section'),
                  })}
                  className={sort === 'section' ? 'text-slate-900' : 'hover:text-slate-900'}
                >
                  Section{sort === 'section' ? ` ${dir === 'asc' ? '↑' : '↓'}` : ''}
                </Link>
                <Link
                  href={buildDirectoryHref({
                    category: activeCategorySlug,
                    query: query || null,
                    type: selectedType || null,
                    page: 1,
                    sort: 'type',
                    dir: getNextSortDirection(sort, dir, 'type'),
                  })}
                  className={sort === 'type' ? 'text-slate-900' : 'hover:text-slate-900'}
                >
                  Type{sort === 'type' ? ` ${dir === 'asc' ? '↑' : '↓'}` : ''}
                </Link>
                <div className="text-right">Contact</div>
              </div>
              <div className="divide-y divide-slate-200">
              {pagedRows.map((row) => (
                <article
                  key={`${row.section}-${row.id}`}
                  className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_220px] sm:items-start sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="min-w-0">
                        {row.href ? (
                          <Link
                            href={row.href}
                            className="inline-block max-w-full truncate text-[17px] font-medium leading-6 text-[#0f5771] hover:underline"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="inline-block max-w-full truncate text-[17px] font-medium leading-6 text-slate-900">
                            {row.name}
                          </span>
                        )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500 sm:hidden">
                      <span>{row.section}</span>
                      <span className="text-slate-300">•</span>
                      <span>{row.type}</span>
                    </div>
                  </div>
                  <div className="hidden text-[13px] text-slate-600 sm:block">{row.section}</div>
                  <div className="hidden text-[13px] text-slate-600 sm:block">{row.type}</div>
                  <div className="min-w-0 text-[13px] text-slate-600 sm:text-right">
                    {row.messageUserId ? (
                      <DirectoryMessageAction userId={row.messageUserId} userName={row.name} />
                    ) : (
                      <span className="break-words">{row.contact}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
            </div>
          ) : (
            hasSearchQuery || isOrganizationBrowseCategory ? (
              <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">
                {hasSearchQuery
                  ? `No directory results matched "${query}".`
                  : 'No directory listings are available in this category.'}
              </p>
            ) : null
          )}

          {totalRows > 0 ? (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {pageStart + 1}-{Math.min(pageStart + DIRECTORY_PAGE_SIZE, totalRows)} of {totalRows}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={buildDirectoryHref({
                    category: activeCategorySlug,
                    query: query || null,
                    type: selectedType || null,
                    page: safePage - 1,
                    sort,
                    dir,
                  })}
                  aria-disabled={safePage === 1}
                  className={`rounded-full border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 ${
                    safePage === 1 ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Previous
                </Link>
                <span className="text-[13px] text-slate-500">
                  Page {safePage} of {totalPages}
                </span>
                <Link
                  href={buildDirectoryHref({
                    category: activeCategorySlug,
                    query: query || null,
                    type: selectedType || null,
                    page: safePage + 1,
                    sort,
                    dir,
                  })}
                  aria-disabled={safePage === totalPages}
                  className={`rounded-full border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 ${
                    safePage === totalPages ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          ) : null}
      </section>
    </div>
  );
}
