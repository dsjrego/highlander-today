'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type PlaceRow = {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  type: string;
  countryCode: string;
  admin1Code: string | null;
  admin1Name: string | null;
  admin2Name: string | null;
  isSelectable: boolean;
  isActive: boolean;
  parentPlace: {
    id: string;
    displayName: string;
  } | null;
  aliases: Array<{
    id: string;
    alias: string;
  }>;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const PLACE_TYPES = ['BOROUGH', 'TOWNSHIP', 'TOWN', 'CITY', 'COUNTY', 'REGION', 'STATE', 'COUNTRY'] as const;

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    slug: '',
    type: 'BOROUGH',
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: '',
    parentPlaceId: '',
  });

  const fetchPlaces = useCallback(async (search = query, nextPage = page) => {
    setIsLoading(true);
    setError('');

    try {
      const trimmedSearch = search.trim();

      if (!trimmedSearch) {
        setPlaces([]);
        setPagination({
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
        });
        return;
      }

      const params = new URLSearchParams({
        query: trimmedSearch,
        page: String(nextPage),
      });
      const res = await fetch(`/api/admin/places?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch places');
      }
      const data = await res.json();
      setPlaces(data.places || []);
      setPagination(data.pagination || null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch places');
    } finally {
      setIsLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchPlaces(query, page);
    }, 250);

    return () => clearTimeout(timeout);
  }, [fetchPlaces, page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function handleCreatePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create place');
      }

      setSuccess('Place created.');
      setForm((current) => ({
        ...current,
        name: '',
        displayName: '',
        slug: '',
        admin2Name: '',
        parentPlaceId: '',
      }));
      await fetchPlaces('', 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create place');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">Places</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage canonical places used for user location, tenant coverage, and geographic reporting.
        </p>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="admin-list-toolbar">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Filter: Name, Display Name, Slug</span>
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="admin-list-filter-input"
                placeholder="Search places"
              />
            </label>
          </div>

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Place</th>
                  <th className="admin-list-header-cell">Type</th>
                  <th className="admin-list-header-cell">Parent / County</th>
                  <th className="admin-list-header-cell">Status</th>
                  <th className="admin-list-header-cell">Aliases</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>Loading places...</td>
                  </tr>
                ) : !query.trim() ? (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>Search by name, display name, or slug to load places.</td>
                  </tr>
                ) : places.length > 0 ? (
                  places.map((place) => (
                    <tr key={place.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-semibold text-slate-950">{place.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">{place.slug}</div>
                      </td>
                      <td className="admin-list-cell">{place.type}</td>
                      <td className="admin-list-cell">
                        {place.parentPlace?.displayName || place.admin2Name || '—'}
                      </td>
                      <td className="admin-list-cell">
                        <div>{place.isActive ? 'Active' : 'Inactive'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {place.isSelectable ? 'Selectable' : 'Hidden'}
                        </div>
                      </td>
                      <td className="admin-list-cell text-xs text-slate-500">
                        {place.aliases.length > 0 ? place.aliases.map((alias) => alias.alias).join(', ') : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>No places found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {query.trim() && pagination && pagination.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-4 px-2 text-sm text-slate-600">
              <div>
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} places
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pagination.page <= 1}
                  className="btn-neutral disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-neutral disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">+ Place</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add canonical places for coverage management and user location selection.
          </p>

          <form onSubmit={handleCreatePlace} className="mt-5 space-y-4">
            <div>
              <label className="form-label text-slate-500">Name</label>
              <input className="form-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">Display Name</label>
              <input className="form-input" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">Slug</label>
              <input className="form-input" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">Type</label>
              <select className="form-input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                {PLACE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-slate-500">Country Code</label>
              <input className="form-input" value={form.countryCode} onChange={(event) => setForm((current) => ({ ...current, countryCode: event.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">State / Admin1 Code</label>
              <input className="form-input" value={form.admin1Code} onChange={(event) => setForm((current) => ({ ...current, admin1Code: event.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">State / Admin1 Name</label>
              <input className="form-input" value={form.admin1Name} onChange={(event) => setForm((current) => ({ ...current, admin1Name: event.target.value }))} />
            </div>
            <div>
              <label className="form-label text-slate-500">County / Admin2 Name</label>
              <input className="form-input" value={form.admin2Name} onChange={(event) => setForm((current) => ({ ...current, admin2Name: event.target.value }))} />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create Place'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
