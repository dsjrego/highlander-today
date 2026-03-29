import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import DirectoryCategoryPills from './DirectoryCategoryPills';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { ORGANIZATION_TYPE_OPTIONS } from '@/lib/organization-taxonomy';

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
  detail: string;
  contact: string;
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

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeCategorySlug = resolvedSearchParams?.category ?? null;
  const query = resolvedSearchParams?.q?.trim() ?? '';
  const selectedType = resolvedSearchParams?.type?.trim() ?? '';
  const rawPage = Number.parseInt(resolvedSearchParams?.page ?? '1', 10);
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const sort = normalizeSortKey(resolvedSearchParams?.sort);
  const dir = normalizeSortDirection(resolvedSearchParams?.dir);
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });
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

  const [people, organizations] = await Promise.all([
    db.user.findMany({
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
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
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
    }),
    db.organization.findMany({
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
        ...(query
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
    }),
  ]);

  const rows: DirectoryRow[] = [
    ...(activeCategorySlug === null || activeCategorySlug === 'people'
      ? people.map((person) => ({
          id: person.id,
          name: `${person.lastName}, ${person.firstName}`,
          href: `/profile/${person.id}`,
          section: 'People' as const,
          type: 'Person',
          detail: person.bio?.trim() || 'Opted-in directory listing',
          contact: 'Message through Highlander Today',
        }))
      : []),
    ...organizations.map((organization) => ({
      id: organization.id,
      name: organization.name,
      section:
        organization.directoryGroup === 'BUSINESS'
          ? ('Businesses' as const)
          : organization.directoryGroup === 'GOVERNMENT'
            ? ('Government' as const)
            : ('Organizations' as const),
      type: formatTypeLabel(organization.organizationType),
      detail: organization.description?.trim() || 'No description available',
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
    <div className="space-y-6">
      <InternalPageHeader title="Directory" />

      <section className="admin-card overflow-visible rounded-[28px]">
        <div className="admin-card-body space-y-5 overflow-visible">
          <form action="/directory" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            {activeCategorySlug ? <input type="hidden" name="category" value={activeCategorySlug} /> : null}
            {selectedType ? <input type="hidden" name="type" value={selectedType} /> : null}
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search people, businesses, departments, offices..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#46A8CC]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Search
            </button>
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
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">
                        <Link
                          href={buildDirectoryHref({
                            category: activeCategorySlug,
                            query: query || null,
                            type: selectedType || null,
                            page: 1,
                            sort: 'name',
                            dir: getNextSortDirection(sort, dir, 'name'),
                          })}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          <span>Name</span>
                          {sort === 'name' ? <span>{dir === 'asc' ? '↑' : '↓'}</span> : null}
                        </Link>
                      </th>
                      <th className="admin-list-header-cell">
                        <Link
                          href={buildDirectoryHref({
                            category: activeCategorySlug,
                            query: query || null,
                            type: selectedType || null,
                            page: 1,
                            sort: 'section',
                            dir: getNextSortDirection(sort, dir, 'section'),
                          })}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          <span>Section</span>
                          {sort === 'section' ? <span>{dir === 'asc' ? '↑' : '↓'}</span> : null}
                        </Link>
                      </th>
                      <th className="admin-list-header-cell">
                        <Link
                          href={buildDirectoryHref({
                            category: activeCategorySlug,
                            query: query || null,
                            type: selectedType || null,
                            page: 1,
                            sort: 'type',
                            dir: getNextSortDirection(sort, dir, 'type'),
                          })}
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          <span>Type</span>
                          {sort === 'type' ? <span>{dir === 'asc' ? '↑' : '↓'}</span> : null}
                        </Link>
                      </th>
                      <th className="admin-list-header-cell">Detail</th>
                      <th className="admin-list-header-cell">Contact</th>
                    </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={`${row.section}-${row.id}`} className="admin-list-row">
                      <td className="admin-list-cell">
                        {row.href ? (
                          <Link href={row.href} className="admin-list-link">
                            {row.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">{row.name}</span>
                        )}
                      </td>
                      <td className="admin-list-cell">{row.section}</td>
                      <td className="admin-list-cell">{row.type}</td>
                      <td className="admin-list-cell">{row.detail}</td>
                      <td className="admin-list-cell">{row.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              {query ? `No directory results matched "${query}".` : 'No directory listings are available yet.'}
            </p>
          )}

          {totalRows > 0 ? (
            <div className="admin-list-pagination">
              <div className="admin-list-pagination-label">
                Showing {pageStart + 1}-{Math.min(pageStart + DIRECTORY_PAGE_SIZE, totalRows)} of {totalRows}
              </div>
              <div className="admin-list-pagination-actions">
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
                  className={`admin-list-pagination-button ${safePage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Previous
                </Link>
                <span className="admin-list-pagination-page">
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
                  className={`admin-list-pagination-button ${safePage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Next
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
