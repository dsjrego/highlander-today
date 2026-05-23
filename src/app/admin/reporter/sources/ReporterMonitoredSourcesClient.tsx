'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';
import {
  REPORTER_MONITORED_SOURCE_FORMAT_OPTIONS,
  REPORTER_MONITORED_SOURCE_STATUS_OPTIONS,
  REPORTER_MONITORED_SOURCE_TYPE_OPTIONS,
  formatReporterMonitoredSourceEnumLabel,
  getReporterMonitoredSourceHealth,
} from '@/lib/reporter/monitored-sources';

type CoveragePlaceOption = {
  id: string;
  displayName: string;
  slug: string;
  type: string;
};

type ReporterMonitoredSourceRow = {
  id: string;
  communityId: string;
  label: string;
  sourceType: string;
  sourceFormat: string;
  url: string;
  publisher: string | null;
  notes: string | null;
  status: string;
  fetchFrequencyMinutes: number;
  lastFetchedAt: string | Date | null;
  lastSuccessfulAt: string | Date | null;
  lastChangedAt: string | Date | null;
  lastErrorAt: string | Date | null;
  lastErrorMessage: string | null;
  lastHttpStatus: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  place: CoveragePlaceOption | null;
  _count: {
    fetches: number;
    ingestionItems: number;
  };
  fetches: Array<{
    id: string;
    status: string;
    startedAt: string | Date;
    completedAt: string | Date | null;
    httpStatus: number | null;
    itemCount: number;
    newItemCount: number;
    changedItemCount: number;
    errorMessage: string | null;
  }>;
};

interface ReporterMonitoredSourcesClientProps {
  sources: ReporterMonitoredSourceRow[];
  coveragePlaces: CoveragePlaceOption[];
}

const STATUS_OPTIONS = ['ALL', ...REPORTER_MONITORED_SOURCE_STATUS_OPTIONS] as const;

const EMPTY_CREATE_FORM = {
  label: '',
  sourceType: 'MUNICIPAL_NOTICES',
  sourceFormat: 'HTML',
  url: '',
  publisher: '',
  notes: '',
  placeId: '',
  fetchFrequencyHours: '24',
};

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCadence(minutes: number) {
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return `Every ${days} day${days === 1 ? '' : 's'}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Every ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `Every ${minutes} min`;
}

function healthTone(source: ReporterMonitoredSourceRow): 'ok' | 'pend' | 'bad' | 'neu' {
  const health = getReporterMonitoredSourceHealth(source);
  if (health === 'healthy') return 'ok';
  if (health === 'failing') return 'bad';
  if (health === 'stale' || health === 'new') return 'pend';
  return 'neu';
}

function healthLabel(source: ReporterMonitoredSourceRow) {
  return formatReporterMonitoredSourceEnumLabel(getReporterMonitoredSourceHealth(source));
}

export default function ReporterMonitoredSourcesClient({
  sources,
  coveragePlaces,
}: ReporterMonitoredSourcesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'all';

  const [rows, setRows] = useState(sources);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [updatingSourceId, setUpdatingSourceId] = useState<string | null>(null);
  const [runningFetchSourceId, setRunningFetchSourceId] = useState<string | null>(null);
  const [runningDueSources, setRunningDueSources] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });

    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((source) => {
      const health = getReporterMonitoredSourceHealth(source);

      if (activeView === 'attention' && !['failing', 'stale', 'new'].includes(health)) {
        return false;
      }
      if (activeView === 'active' && source.status !== 'ACTIVE') {
        return false;
      }
      if (activeView === 'paused' && source.status !== 'PAUSED') {
        return false;
      }
      if (statusFilter !== 'ALL' && source.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && source.sourceType !== typeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        source.label,
        source.publisher,
        source.place?.displayName,
        source.url,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeView, query, rows, statusFilter, typeFilter]);

  async function handleCreateSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setError('');
    setNotice('');
    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/reporter/monitored-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: createForm.label,
          sourceType: createForm.sourceType,
          sourceFormat: createForm.sourceFormat,
          url: createForm.url,
          publisher: createForm.publisher,
          notes: createForm.notes,
          placeId: createForm.placeId || null,
          fetchFrequencyMinutes: Number(createForm.fetchFrequencyHours) * 60,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create monitored source');
      }

      setRows((current) => [data.source, ...current]);
      setCreateForm(EMPTY_CREATE_FORM);
      updateSearchParams({ focus: null, view: 'all' });
    } catch (createSourceError) {
      setCreateError(
        createSourceError instanceof Error
          ? createSourceError.message
          : 'Failed to create monitored source'
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(sourceId: string, status: string) {
    setUpdatingSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update monitored source');
      }

      setRows((current) =>
        current.map((source) => (source.id === sourceId ? data.source : source))
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Failed to update monitored source'
      );
    } finally {
      setUpdatingSourceId(null);
    }
  }

  async function handleRunFetch(sourceId: string) {
    setRunningFetchSourceId(sourceId);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/reporter/monitored-sources/${sourceId}/run-fetch`, {
        method: 'POST',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch monitored source');
      }

      if (data.source) {
        setRows((current) =>
          current.map((source) => (source.id === sourceId ? data.source : source))
        );
        setNotice(
          `Fetch complete for ${data.source.label}. ${data.fetch.status} with ${data.summary.newItemCount} new and ${data.summary.changedItemCount} changed item${data.summary.changedItemCount === 1 ? '' : 's'}.`
        );
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch monitored source');
    } finally {
      setRunningFetchSourceId(null);
    }
  }

  async function handleRunDueSources() {
    setRunningDueSources(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/reporter/monitored-sources/run-due', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run due monitored sources');
      }

      if (Array.isArray(data.sources) && data.sources.length > 0) {
        const nextSources = data.sources as ReporterMonitoredSourceRow[];
        const replacements = new Map<string, ReporterMonitoredSourceRow>(
          nextSources.map((source) => [source.id, source])
        );
        setRows((current) =>
          current.map((source) => replacements.get(source.id) || source)
        );
      }

      setNotice(
        data.attemptedCount > 0
          ? `Ran ${data.attemptedCount} due source${data.attemptedCount === 1 ? '' : 's'}: ${data.summary.successCount} success, ${data.summary.noChangeCount} no change, ${data.summary.failedCount} failed.`
          : 'No due monitored sources were ready to run.'
      );
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to run due monitored sources');
    } finally {
      setRunningDueSources(false);
    }
  }

  const attentionCount = rows.filter((source) =>
    ['failing', 'stale', 'new'].includes(getReporterMonitoredSourceHealth(source))
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.filter((source) => source.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Attention</div>
          <div className="mt-2 text-2xl font-black text-amber-900">{attentionCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fetched Items</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.reduce((total, source) => total + source._count.ingestionItems, 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recent Fetches</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {rows.reduce((total, source) => total + source._count.fetches, 0)}
          </div>
        </div>
      </div>

      {error ? <div className="admin-list-error">{error}</div> : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="all"
          views={[
            { key: 'all', label: 'All Sources', count: rows.length },
            { key: 'attention', label: 'Needs Attention', count: attentionCount, tone: 'pend' },
            {
              key: 'active',
              label: 'Active',
              count: rows.filter((source) => source.status === 'ACTIVE').length,
            },
            {
              key: 'paused',
              label: 'Paused',
              count: rows.filter((source) => source.status === 'PAUSED').length,
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="page-header-action"
            onClick={() => void handleRunDueSources()}
            disabled={runningDueSources}
          >
            <RefreshCcw className={`h-4 w-4 ${runningDueSources ? 'animate-spin' : ''}`} />
            <span>{runningDueSources ? 'Running Due…' : 'Run Due Sources'}</span>
          </button>
          <button
            type="button"
            className="page-header-action"
            onClick={() => {
              setCreateError('');
              setNotice('');
              updateSearchParams({ focus: 'new' });
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Monitored Source</span>
          </button>
        </div>
      </div>

      <div className="admin-list">
        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Label, Publisher, Place</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search monitored sources"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="flex flex-wrap gap-3">
              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number])
                  }
                  className="admin-list-cell-select"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL' ? 'All statuses' : formatReporterMonitoredSourceEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Type</span>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="admin-list-cell-select"
                >
                  <option value="all">All types</option>
                  {REPORTER_MONITORED_SOURCE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {formatReporterMonitoredSourceEnumLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />

        <div className="admin-list-table-wrap">
          <table className="admin-list-table">
            <thead className="admin-list-head">
              <tr>
                <th className="admin-list-header-cell">Source</th>
                <th className="admin-list-header-cell">Scope</th>
                <th className="admin-list-header-cell">Type</th>
                <th className="admin-list-header-cell">Cadence</th>
                <th className="admin-list-header-cell">Health</th>
                <th className="admin-list-header-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={6}>
                    No monitored sources match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((source) => {
                  const latestFetch = source.fetches[0] || null;

                  return (
                    <tr key={source.id} className="admin-list-row">
                      <td className="admin-list-cell">
                        <div className="font-medium text-slate-900">{source.label}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {source.publisher || 'Unspecified publisher'}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <Link
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-list-link"
                          >
                            Open source
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleRunFetch(source.id)}
                            className="admin-list-link inline-flex items-center gap-1"
                            disabled={runningFetchSourceId === source.id || source.status === 'ARCHIVED'}
                          >
                            <RefreshCcw className={`h-3.5 w-3.5 ${runningFetchSourceId === source.id ? 'animate-spin' : ''}`} />
                            <span>{runningFetchSourceId === source.id ? 'Fetching…' : 'Fetch now'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <div className="text-sm text-slate-900">
                          {source.place?.displayName || 'Tenant-wide'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {source._count.ingestionItems} item{source._count.ingestionItems === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <div>{formatReporterMonitoredSourceEnumLabel(source.sourceType)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatReporterMonitoredSourceEnumLabel(source.sourceFormat)}
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <div>{formatCadence(source.fetchFrequencyMinutes)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Last change {formatDateTime(source.lastChangedAt)}
                        </div>
                      </td>
                      <td className="admin-list-cell">
                        <AdminChip tone={healthTone(source)}>{healthLabel(source)}</AdminChip>
                        <div className="mt-2 text-xs text-slate-500">
                          Last success {formatDateTime(source.lastSuccessfulAt)}
                        </div>
                        {latestFetch ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Latest fetch {formatReporterMonitoredSourceEnumLabel(latestFetch.status)} ·{' '}
                            {latestFetch.newItemCount} new · {latestFetch.changedItemCount} changed
                          </div>
                        ) : null}
                        {source.lastErrorMessage ? (
                          <div className="mt-1 text-xs text-red-700">{source.lastErrorMessage}</div>
                        ) : null}
                      </td>
                      <td className="admin-list-cell">
                        <select
                          value={source.status}
                          onChange={(event) => void handleStatusChange(source.id, event.target.value)}
                          className="admin-list-cell-select min-w-[10rem]"
                          disabled={updatingSourceId === source.id}
                        >
                          {REPORTER_MONITORED_SOURCE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatReporterMonitoredSourceEnumLabel(status)}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 text-xs text-slate-500">
                          Last fetch {formatDateTime(source.lastFetchedAt)}
                          {source.lastHttpStatus ? ` · HTTP ${source.lastHttpStatus}` : ''}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDrawer title="New Monitored Source">
        <form onSubmit={handleCreateSource} className="space-y-4">
          {createError ? <div className="admin-list-error">{createError}</div> : null}

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Label</span>
            <input
              type="text"
              value={createForm.label}
              onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))}
              className="form-input"
              placeholder="Cambria Heights council agendas"
              required
            />
          </label>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">URL</span>
            <input
              type="text"
              value={createForm.url}
              onChange={(event) => setCreateForm((current) => ({ ...current, url: event.target.value }))}
              className="form-input"
              placeholder="https://example.gov/agendas"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Type</span>
              <select
                value={createForm.sourceType}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, sourceType: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_MONITORED_SOURCE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatReporterMonitoredSourceEnumLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Format</span>
              <select
                value={createForm.sourceFormat}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, sourceFormat: event.target.value }))
                }
                className="form-input"
              >
                {REPORTER_MONITORED_SOURCE_FORMAT_OPTIONS.map((format) => (
                  <option key={format} value={format}>
                    {formatReporterMonitoredSourceEnumLabel(format)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Coverage Place</span>
              <select
                value={createForm.placeId}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, placeId: event.target.value }))
                }
                className="form-input"
              >
                <option value="">Tenant-wide</option>
                {coveragePlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Fetch Every</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={createForm.fetchFrequencyHours}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      fetchFrequencyHours: event.target.value,
                    }))
                  }
                  className="form-input"
                  required
                />
                <span className="text-sm text-slate-500">hours</span>
              </div>
            </label>
          </div>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Publisher</span>
            <input
              type="text"
              value={createForm.publisher}
              onChange={(event) => setCreateForm((current) => ({ ...current, publisher: event.target.value }))}
              className="form-input"
              placeholder="Cambria Heights Borough"
            />
          </label>

          <label className="admin-list-filter">
            <span className="admin-list-filter-label">Notes</span>
            <textarea
              value={createForm.notes}
              onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
              className="form-input min-h-[120px]"
              placeholder="Why this source matters, expected update pattern, or fetch caveats."
            />
          </label>

          <button type="submit" className="page-header-action" disabled={isCreating}>
            {isCreating ? 'Saving…' : 'Create Source'}
          </button>
        </form>
      </AdminDrawer>
    </div>
  );
}
