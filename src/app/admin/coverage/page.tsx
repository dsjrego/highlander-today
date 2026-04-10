'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type CommunityOption = {
  id: string;
  name: string;
  slug: string;
};

type CoverageArea = {
  id: string;
  communityId: string;
  coverageType: 'PRIMARY' | 'SECONDARY' | 'EMERGING' | 'WATCHLIST';
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
  community: CommunityOption;
  place: {
    id: string;
    displayName: string;
    slug: string;
    type: string;
    admin2Name: string | null;
  };
};

type PlaceOption = {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  admin2Name: string | null;
};

const COVERAGE_TYPES = ['PRIMARY', 'SECONDARY', 'EMERGING', 'WATCHLIST'] as const;

export default function AdminCoveragePage() {
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [coverageType, setCoverageType] = useState<(typeof COVERAGE_TYPES)[number]>('SECONDARY');
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCoverage = useCallback(async (communityId = selectedCommunityId) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/tenant-coverage${communityId ? `?communityId=${encodeURIComponent(communityId)}` : ''}`);
      if (!res.ok) {
        throw new Error('Failed to load tenant coverage');
      }

      const data = await res.json();
      setCommunities(data.communities || []);
      setCoverageAreas(data.coverageAreas || []);
      if (!communityId && data.communities?.[0]?.id) {
        setSelectedCommunityId(data.communities[0].id);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load tenant coverage');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCommunityId]);

  useEffect(() => {
    void fetchCoverage(selectedCommunityId);
  }, [fetchCoverage, selectedCommunityId]);

  useEffect(() => {
    if (!placeQuery.trim()) {
      setPlaceResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoadingPlaces(true);
        const res = await fetch(`/api/places?query=${encodeURIComponent(placeQuery.trim())}&limit=10`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setPlaceResults(data.places || []);
      } catch {
        if (!controller.signal.aborted) {
          setPlaceResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPlaces(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [placeQuery]);

  async function handleCreateCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCommunityId || !selectedPlace) {
      setError('Choose a tenant and a place first.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/tenant-coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunityId,
          placeId: selectedPlace.id,
          coverageType,
          isPrimary,
          notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tenant coverage area');
      }

      setSuccess('Coverage area added.');
      setSelectedPlace(null);
      setPlaceQuery('');
      setCoverageType('SECONDARY');
      setIsPrimary(false);
      setNotes('');
      await fetchCoverage(selectedCommunityId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create tenant coverage area');
    } finally {
      setIsSaving(false);
    }
  }

  const visibleCoverageAreas = selectedCommunityId
    ? coverageAreas.filter((entry) => entry.communityId === selectedCommunityId)
    : coverageAreas;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">Tenant Coverage</h1>
        <p className="mt-2 text-sm text-slate-600">
          Relate tenants to canonical places so service areas stay separate from tenant identity.
        </p>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)]">
        <div className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="admin-list-toolbar">
            <label className="admin-list-filter min-w-[16rem]">
              <span className="admin-list-filter-label">Tenant</span>
              <select
                value={selectedCommunityId}
                onChange={(event) => setSelectedCommunityId(event.target.value)}
                className="admin-list-cell-select min-w-[16rem]"
              >
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Place</th>
                  <th className="admin-list-header-cell">Type</th>
                  <th className="admin-list-header-cell">Coverage</th>
                  <th className="admin-list-header-cell">Primary</th>
                  <th className="admin-list-header-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>Loading coverage areas...</td>
                  </tr>
                ) : visibleCoverageAreas.length > 0 ? (
                  visibleCoverageAreas.map((entry) => (
                    <tr key={entry.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-semibold text-slate-950">{entry.place.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">{entry.community.name}</div>
                      </td>
                      <td className="admin-list-cell">{entry.place.type}</td>
                      <td className="admin-list-cell">{entry.coverageType}</td>
                      <td className="admin-list-cell">{entry.isPrimary ? 'Yes' : 'No'}</td>
                      <td className="admin-list-cell">{entry.isActive ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>No coverage areas found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">+ Coverage Area</h2>
          <p className="mt-1 text-sm text-slate-600">
            Attach a canonical place to the selected tenant with a clear coverage status.
          </p>

          <form onSubmit={handleCreateCoverage} className="mt-5 space-y-4">
            <div>
              <label className="form-label text-slate-500">Tenant</label>
              <select
                value={selectedCommunityId}
                onChange={(event) => setSelectedCommunityId(event.target.value)}
                className="form-input"
              >
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>{community.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-slate-500">Place</label>
              {selectedPlace ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{selectedPlace.displayName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedPlace.type}
                    {selectedPlace.admin2Name ? ` • ${selectedPlace.admin2Name}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlace(null);
                      setPlaceResults([]);
                    }}
                    className="mt-2 text-xs font-semibold text-[#0f5771] hover:underline"
                  >
                    Choose a different place
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(event) => setPlaceQuery(event.target.value)}
                    placeholder="Search for a place"
                    className="form-input"
                  />
                  <div className="rounded-xl border border-slate-200 bg-slate-50">
                    {isLoadingPlaces ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Searching places...</div>
                    ) : placeResults.length > 0 ? (
                      placeResults.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlace(place);
                            setPlaceQuery('');
                            setPlaceResults([]);
                          }}
                          className="block w-full border-b border-slate-200 px-4 py-3 text-left text-sm text-slate-700 last:border-b-0 hover:bg-white"
                        >
                          <div className="font-semibold text-slate-900">{place.displayName}</div>
                          <div className="text-xs text-slate-500">
                            {place.type}
                            {place.admin2Name ? ` • ${place.admin2Name}` : ''}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">Search for a canonical place to attach.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="form-label text-slate-500">Coverage Type</label>
              <select value={coverageType} onChange={(event) => setCoverageType(event.target.value as (typeof COVERAGE_TYPES)[number])} className="form-input">
                {COVERAGE_TYPES.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
              Mark as primary coverage
            </label>

            <div>
              <label className="form-label text-slate-500">Notes</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="form-textarea" rows={3} />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Coverage Area'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
