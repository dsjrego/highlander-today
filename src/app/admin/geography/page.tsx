'use client';

import { useEffect, useState } from 'react';

type GeographyData = {
  declaredPlaces: Array<{
    place: {
      id: string;
      displayName: string;
      slug: string;
      type: string;
      admin2Name: string | null;
    };
    currentResidents: number;
    connectedUsers: number;
    trustedUsers: number;
    contributors: number;
    activeUsers30d: number;
    coverage: Array<{
      community: {
        id: string;
        name: string;
        slug: string;
      };
      coverageType: string;
    }>;
  }>;
  coverageGaps: Array<{
    place: {
      id: string;
      displayName: string;
      slug: string;
      type: string;
      admin2Name: string | null;
    };
    currentResidents: number;
    connectedUsers: number;
    trustedUsers: number;
    contributors: number;
    activeUsers30d: number;
    coverage: Array<{
      community: {
        id: string;
        name: string;
        slug: string;
      };
      coverageType: string;
    }>;
  }>;
  observedGeo: Array<{
    id: string;
    normalizedLabel: string;
    city: string | null;
    region: string | null;
    country: string | null;
    reviewStatus: string;
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
  }>;
};

export default function AdminGeographyPage() {
  const [data, setData] = useState<GeographyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  async function fetchData(sync = false) {
    if (sync) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const res = await fetch(`/api/admin/geography${sync ? '?sync=true' : ''}`);
      if (!res.ok) {
        throw new Error('Failed to load geography dashboard');
      }

      const nextData = await res.json();
      setData(nextData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load geography dashboard');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    void fetchData(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Geography</h1>
            <p className="mt-2 text-sm text-slate-600">
              Distinct-user place density, observed reach, and coverage gaps for future expansion decisions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(true)}
            disabled={isSyncing}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSyncing ? 'Syncing observed geo...' : 'Sync Observed Geo'}
          </button>
        </div>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-slate-950">Declared Current Residents</h2>
            <p className="mt-1 text-sm text-slate-600">
              User-declared current location density, weighted toward distinct people rather than traffic volume.
            </p>
          </div>
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Place</th>
                  <th className="admin-list-header-cell">Residents</th>
                  <th className="admin-list-header-cell">Active 30d</th>
                  <th className="admin-list-header-cell">Trusted</th>
                  <th className="admin-list-header-cell">Contrib</th>
                  <th className="admin-list-header-cell">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={6}>Loading geography data...</td>
                  </tr>
                ) : data?.declaredPlaces.length ? (
                  data.declaredPlaces.map((entry) => (
                    <tr key={entry.place.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-semibold text-slate-950">{entry.place.displayName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {entry.place.type}
                          {entry.place.admin2Name ? ` • ${entry.place.admin2Name}` : ''}
                        </div>
                      </td>
                      <td className="admin-list-cell">{entry.currentResidents}</td>
                      <td className="admin-list-cell">{entry.activeUsers30d}</td>
                      <td className="admin-list-cell">{entry.trustedUsers}</td>
                      <td className="admin-list-cell">{entry.contributors}</td>
                      <td className="admin-list-cell text-xs text-slate-500">
                        {entry.coverage.length > 0
                          ? entry.coverage.map((coverage) => `${coverage.community.name} (${coverage.coverageType})`).join(', ')
                          : 'No active coverage'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={6}>No declared place density yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-xl font-bold text-slate-950">Observed Reach</h2>
            <p className="mt-1 text-sm text-slate-600">
              Aggregated login-location signals showing distinct-user reach from existing IP geodata.
            </p>
          </div>
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Observed Location</th>
                  <th className="admin-list-header-cell">Users</th>
                  <th className="admin-list-header-cell">Logins</th>
                  <th className="admin-list-header-cell">Matched Place</th>
                  <th className="admin-list-header-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>Loading observed reach...</td>
                  </tr>
                ) : data?.observedGeo.length ? (
                  data.observedGeo.map((entry) => (
                    <tr key={entry.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-semibold text-slate-950">{entry.normalizedLabel}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Last seen {new Date(entry.lastSeenAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="admin-list-cell">{entry.distinctUserCount}</td>
                      <td className="admin-list-cell">{entry.loginCount}</td>
                      <td className="admin-list-cell text-xs text-slate-500">
                        {entry.matchedPlace?.displayName || '—'}
                      </td>
                      <td className="admin-list-cell">{entry.reviewStatus}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={5}>No observed geo data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-list rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-xl font-bold text-slate-950">Coverage Gaps</h2>
          <p className="mt-1 text-sm text-slate-600">
            Places with declared user density but no active tenant coverage relationship yet.
          </p>
        </div>
        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Place</th>
                <th className="admin-list-header-cell">Residents</th>
                <th className="admin-list-header-cell">Active 30d</th>
                <th className="admin-list-header-cell">Trusted</th>
                <th className="admin-list-header-cell">Connected</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={5}>Loading coverage gaps...</td>
                </tr>
              ) : data?.coverageGaps.length ? (
                data.coverageGaps.map((entry) => (
                  <tr key={entry.place.id} className="admin-list-row">
                    <td className="admin-list-cell">
                      <div className="font-semibold text-slate-950">{entry.place.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {entry.place.type}
                        {entry.place.admin2Name ? ` • ${entry.place.admin2Name}` : ''}
                      </div>
                    </td>
                    <td className="admin-list-cell">{entry.currentResidents}</td>
                    <td className="admin-list-cell">{entry.activeUsers30d}</td>
                    <td className="admin-list-cell">{entry.trustedUsers}</td>
                    <td className="admin-list-cell">{entry.connectedUsers}</td>
                  </tr>
                ))
              ) : (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={5}>No current coverage gaps found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
