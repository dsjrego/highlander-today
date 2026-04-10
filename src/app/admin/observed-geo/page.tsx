'use client';

import { useEffect, useState } from 'react';

type ObservedGeoRow = {
  id: string;
  normalizedLabel: string;
  city: string | null;
  region: string | null;
  country: string | null;
  reviewStatus: 'UNMATCHED' | 'MATCHED_TO_PLACE' | 'IGNORE' | 'READY_FOR_CURATION' | 'PROMOTED';
  firstSeenAt: string;
  lastSeenAt: string;
  loginCount: number;
  distinctUserCount: number;
  matchedPlace: {
    id: string;
    displayName: string;
    slug: string;
    type: string;
  } | null;
};

type PlaceOption = {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  admin2Name?: string | null;
};

const REVIEW_STATUSES = ['UNMATCHED', 'MATCHED_TO_PLACE', 'IGNORE', 'READY_FOR_CURATION', 'PROMOTED'] as const;

export default function AdminObservedGeoPage() {
  const [rows, setRows] = useState<ObservedGeoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [pendingStatus, setPendingStatus] = useState<(typeof REVIEW_STATUSES)[number]>('UNMATCHED');

  async function fetchObservedGeo(sync = false) {
    if (sync) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`/api/admin/observed-geo${sync ? '?sync=true' : ''}`);
      if (!res.ok) {
        throw new Error('Failed to fetch observed geo');
      }

      const data = await res.json();
      setRows(data.observedGeo || []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch observed geo');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    void fetchObservedGeo(false);
  }, []);

  useEffect(() => {
    if (!placeQuery.trim()) {
      setPlaceResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?query=${encodeURIComponent(placeQuery.trim())}&limit=8`, {
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
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [placeQuery]);

  async function saveObservedGeo(rowId: string) {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/observed-geo/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchedPlaceId: selectedPlace?.id || null,
          reviewStatus: pendingStatus,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update observed geo');
      }

      setRows((current) => current.map((row) => (row.id === rowId ? data.observedGeo : row)));
      setEditingId(null);
      setSelectedPlace(null);
      setPlaceQuery('');
      setPlaceResults([]);
      setSuccess('Observed geo updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update observed geo');
    }
  }

  function beginEdit(row: ObservedGeoRow) {
    setEditingId(row.id);
    setSelectedPlace(row.matchedPlace);
    setPendingStatus(row.reviewStatus);
    setPlaceQuery('');
    setPlaceResults([]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Observed Geo</h1>
            <p className="mt-2 text-sm text-slate-600">
              Curate login-derived location signals by matching them to canonical places or marking them ignored.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchObservedGeo(true)}
            disabled={isSyncing}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Observed Geo'}
          </button>
        </div>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Observed Location</th>
                <th className="admin-list-header-cell">Distinct Users</th>
                <th className="admin-list-header-cell">Logins</th>
                <th className="admin-list-header-cell">Matched Place</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={6}>Loading observed geo...</td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => {
                  const isEditing = editingId === row.id;

                  return (
                    <tr key={row.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-semibold text-slate-950">{row.normalizedLabel}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          First seen {new Date(row.firstSeenAt).toLocaleDateString()} • Last seen {new Date(row.lastSeenAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="admin-list-cell">{row.distinctUserCount}</td>
                      <td className="admin-list-cell">{row.loginCount}</td>
                      <td className="admin-list-cell">
                        {isEditing ? (
                          <div className="space-y-2">
                            {selectedPlace ? (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                <div className="font-semibold text-slate-900">{selectedPlace.displayName}</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlace(null);
                                    setPlaceQuery('');
                                  }}
                                  className="mt-1 text-xs font-semibold text-[#0f5771] hover:underline"
                                >
                                  Clear place
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={placeQuery}
                                  onChange={(event) => setPlaceQuery(event.target.value)}
                                  className="form-input"
                                  placeholder="Search canonical places"
                                />
                                <div className="rounded-lg border border-slate-200 bg-slate-50">
                                  {placeResults.length > 0 ? (
                                    placeResults.map((place) => (
                                      <button
                                        key={place.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPlace(place);
                                          setPlaceResults([]);
                                          setPlaceQuery('');
                                        }}
                                        className="block w-full border-b border-slate-200 px-3 py-2 text-left text-xs text-slate-700 last:border-b-0 hover:bg-white"
                                      >
                                        <div className="font-semibold text-slate-900">{place.displayName}</div>
                                        <div className="text-[11px] text-slate-500">
                                          {place.type}
                                          {place.admin2Name ? ` • ${place.admin2Name}` : ''}
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-slate-500">Search for a place to match.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">{row.matchedPlace?.displayName || '—'}</span>
                        )}
                      </td>
                      <td className="admin-list-cell">
                        {isEditing ? (
                          <select
                            value={pendingStatus}
                            onChange={(event) => setPendingStatus(event.target.value as (typeof REVIEW_STATUSES)[number])}
                            className="admin-list-cell-select"
                          >
                            {REVIEW_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        ) : (
                          row.reviewStatus
                        )}
                      </td>
                      <td className="admin-list-cell">
                        {isEditing ? (
                          <div className="flex gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => void saveObservedGeo(row.id)}
                              className="font-semibold text-[#0f5771] hover:underline"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setSelectedPlace(null);
                                setPlaceQuery('');
                                setPlaceResults([]);
                              }}
                              className="font-semibold text-slate-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => beginEdit(row)}
                              className="font-semibold text-[#0f5771] hover:underline"
                            >
                              Manage
                            </button>
                            {row.reviewStatus !== 'IGNORE' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(row.id);
                                  setSelectedPlace(row.matchedPlace);
                                  setPendingStatus('IGNORE');
                                  void saveObservedGeo(row.id);
                                }}
                                className="font-semibold text-[#8f1d2c] hover:underline"
                              >
                                Ignore
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={6}>No observed geo records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
