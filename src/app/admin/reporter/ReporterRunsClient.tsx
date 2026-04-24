'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';

interface ReporterRunRow {
  id: string;
  status: string;
  mode: string;
  requestType: string;
  topic: string;
  title: string | null;
  subjectName: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    sources: number;
    blockers: number;
    drafts: number;
    interviewRequests: number;
  };
}

interface ReporterRunsClientProps {
  runs: ReporterRunRow[];
  assignees: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
}

const STATUS_OPTIONS = [
  'ALL',
  'NEW',
  'NEEDS_REVIEW',
  'SOURCE_PACKET_IN_PROGRESS',
  'READY_FOR_DRAFT',
  'BLOCKED',
  'DRAFT_CREATED',
] as const;

const MODE_OPTIONS = ['REQUEST', 'INTERVIEW', 'RESEARCH', 'HYBRID'] as const;
const REQUEST_TYPE_OPTIONS = [
  'ARTICLE_REQUEST',
  'STORY_TIP',
  'EDITOR_ASSIGNMENT',
] as const;

interface CreateReporterRunFormState {
  mode: (typeof MODE_OPTIONS)[number];
  requestType: (typeof REQUEST_TYPE_OPTIONS)[number];
  topic: string;
  title: string;
  subjectName: string;
  requestedArticleType: string;
  requestSummary: string;
  whatHappened: string;
  editorNotes: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  supportingLinks: string;
}

const EMPTY_CREATE_FORM: CreateReporterRunFormState = {
  mode: 'RESEARCH',
  requestType: 'EDITOR_ASSIGNMENT',
  topic: '',
  title: '',
  subjectName: '',
  requestedArticleType: '',
  requestSummary: '',
  whatHappened: '',
  editorNotes: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  supportingLinks: '',
};

function statusTone(status: string): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (status) {
    case 'READY_FOR_DRAFT':
    case 'DRAFT_CREATED':
      return 'ok';
    case 'BLOCKED':
      return 'bad';
    case 'NEW':
    case 'NEEDS_REVIEW':
    case 'SOURCE_PACKET_IN_PROGRESS':
      return 'pend';
    default:
      return 'neu';
  }
}

export default function ReporterRunsClient({
  runs,
  assignees,
}: ReporterRunsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'all';
  const focus = searchParams.get('focus');

  const [rows, setRows] = useState(runs);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [createForm, setCreateForm] = useState<CreateReporterRunFormState>(EMPTY_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccessRun, setCreateSuccessRun] = useState<ReporterRunRow | null>(null);

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

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((run) => {
      if (activeView !== 'all' && run.status !== activeView) {
        return false;
      }
      if (statusFilter !== 'ALL' && run.status !== statusFilter) {
        return false;
      }
      if (assigneeFilter !== 'all' && run.assignedTo?.id !== assigneeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return [
        run.topic,
        run.title,
        run.subjectName,
        run.requesterName,
        run.requesterEmail,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeView, assigneeFilter, query, rows, statusFilter]);

  function updateCreateForm<K extends keyof CreateReporterRunFormState>(
    key: K,
    value: CreateReporterRunFormState[K]
  ) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError('');
    setCreateSuccessRun(null);

    try {
      const response = await fetch('/api/reporter/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: createForm.mode,
          requestType: createForm.requestType,
          topic: createForm.topic,
          title: createForm.title,
          subjectName: createForm.subjectName,
          requestedArticleType: createForm.requestedArticleType,
          requestSummary: createForm.requestSummary,
          whatHappened: createForm.whatHappened,
          editorNotes: createForm.editorNotes,
          requesterName: createForm.requesterName,
          requesterEmail: createForm.requesterEmail,
          requesterPhone: createForm.requesterPhone,
          supportingLinks: createForm.supportingLinks
            .split('\n')
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create reporter run');
      }

      const nextRun: ReporterRunRow = {
        id: data.id,
        status: data.status,
        mode: data.mode,
        requestType: data.requestType,
        topic: data.topic,
        title: data.title,
        subjectName: data.subjectName,
        requesterName: data.requesterName,
        requesterEmail: data.requesterEmail,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        assignedTo: null,
        _count: {
          sources: Array.isArray(data.sources) ? data.sources.length : 0,
          blockers: 0,
          drafts: 0,
          interviewRequests: 0,
        },
      };

      setRows((current) => [nextRun, ...current]);
      setCreateSuccessRun(nextRun);
      setCreateForm(EMPTY_CREATE_FORM);
      setStatusFilter('ALL');
      setAssigneeFilter('all');
      setQuery('');
      updateSearchParams({ focus: null, view: data.status || 'all' });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create reporter run');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="all"
          views={[
            { key: 'all', label: 'All Runs', count: rows.length },
            { key: 'NEW', label: 'New', count: rows.filter((run) => run.status === 'NEW').length, tone: 'pend' },
            {
              key: 'NEEDS_REVIEW',
              label: 'Needs Review',
              count: rows.filter((run) => run.status === 'NEEDS_REVIEW').length,
              tone: 'pend',
            },
            {
              key: 'READY_FOR_DRAFT',
              label: 'Ready',
              count: rows.filter((run) => run.status === 'READY_FOR_DRAFT').length,
            },
            {
              key: 'BLOCKED',
              label: 'Blocked',
              count: rows.filter((run) => run.status === 'BLOCKED').length,
              tone: 'bad',
            },
          ]}
        />
        <button
          type="button"
          className="page-header-action"
          onClick={() => {
            setCreateError('');
            updateSearchParams({ focus: 'new' });
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Reporter Run</span>
        </button>
      </div>

      <div className="admin-list">
        {createSuccessRun ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Reporter run created.{' '}
            <Link
              href={`/admin/reporter/${createSuccessRun.id}`}
              className="font-semibold underline underline-offset-2"
            >
              Open {createSuccessRun.title || createSuccessRun.topic}
            </Link>
          </div>
        ) : null}

        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Topic, Subject, Requester</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reporter runs"
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
                      {status === 'ALL' ? 'All statuses' : status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-list-filter">
                <span className="admin-list-filter-label">Assignee</span>
                <select
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  className="admin-list-cell-select"
                >
                  <option value="all">All assignees</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.firstName} {assignee.lastName}
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
                <th className="admin-list-header-cell">Topic</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Requester</th>
                <th className="admin-list-header-cell">Assignee</th>
                <th className="admin-list-header-cell">Packet</th>
                <th className="admin-list-header-cell">Updated</th>
                <th className="admin-list-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={7}>
                    No reporter runs found.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="admin-list-row">
                    <td className="admin-list-cell">
                      <Link href={`/admin/reporter/${run.id}`} className="admin-list-link">
                        {run.title || run.topic}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {run.subjectName || `${run.requestType} · ${run.mode}`}
                      </div>
                    </td>
                    <td className="admin-list-cell">
                      <AdminChip tone={statusTone(run.status)}>{run.status}</AdminChip>
                    </td>
                    <td className="admin-list-cell">
                      {run.requesterName || run.requesterEmail || 'Internal/unspecified'}
                    </td>
                    <td className="admin-list-cell">
                      {run.assignedTo
                        ? `${run.assignedTo.firstName} ${run.assignedTo.lastName}`
                        : 'Unassigned'}
                    </td>
                    <td className="admin-list-cell">
                      {run._count.sources} src / {run._count.blockers} blk / {run._count.drafts} dr / {run._count.interviewRequests} iv
                    </td>
                    <td className="admin-list-cell">
                      {new Date(run.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="admin-list-cell">
                      <Link href={`/admin/reporter/${run.id}`} className="admin-list-link">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDrawer title="Create Reporter Run">
        {focus === 'new' ? (
          <form
            onSubmit={handleCreateRun}
            className="space-y-5"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-950">Create Reporter Run</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start an internal reporting assignment without going through public intake. This creates the run, seeds any starting links or notes, and drops it into the reporter queue immediately.
              </p>
            </div>

            {createError ? <div className="admin-list-error">{createError}</div> : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="form-label text-slate-500">Topic</label>
                  <input
                    type="text"
                    value={createForm.topic}
                    onChange={(event) => updateCreateForm('topic', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Village budget vote follow-up"
                    required
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Working Title</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(event) => updateCreateForm('title', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Budget vote follow-up"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Mode</label>
                  <select
                    value={createForm.mode}
                    onChange={(event) =>
                      updateCreateForm(
                        'mode',
                        event.target.value as CreateReporterRunFormState['mode']
                      )
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    {MODE_OPTIONS.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label text-slate-500">Request Type</label>
                  <select
                    value={createForm.requestType}
                    onChange={(event) =>
                      updateCreateForm(
                        'requestType',
                        event.target.value as CreateReporterRunFormState['requestType']
                      )
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                  >
                    {REQUEST_TYPE_OPTIONS.map((requestType) => (
                      <option key={requestType} value={requestType}>
                        {requestType}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label text-slate-500">Subject</label>
                  <input
                    type="text"
                    value={createForm.subjectName}
                    onChange={(event) => updateCreateForm('subjectName', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Village board / candidate / business / event"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Requested Article Type</label>
                  <input
                    type="text"
                    value={createForm.requestedArticleType}
                    onChange={(event) =>
                      updateCreateForm('requestedArticleType', event.target.value)
                    }
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="News brief, profile, explainer"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Assignment Summary</label>
                  <textarea
                    value={createForm.requestSummary}
                    onChange={(event) => updateCreateForm('requestSummary', event.target.value)}
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                    placeholder="What is the assignment and what should the reporter find out?"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Starting Facts or Description</label>
                  <textarea
                    value={createForm.whatHappened}
                    onChange={(event) => updateCreateForm('whatHappened', event.target.value)}
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                    placeholder="Initial facts, newsroom context, or intake-style description."
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Editor Notes</label>
                  <textarea
                    value={createForm.editorNotes}
                    onChange={(event) => updateCreateForm('editorNotes', event.target.value)}
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                    placeholder="Internal instructions, sourcing angles, constraints, or follow-up priorities."
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="form-label text-slate-500">Supporting Links</label>
                  <textarea
                    value={createForm.supportingLinks}
                    onChange={(event) => updateCreateForm('supportingLinks', event.target.value)}
                    className="form-textarea border-slate-300 bg-white text-slate-950"
                    rows={4}
                    placeholder="One URL per line"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Requester Name</label>
                  <input
                    type="text"
                    value={createForm.requesterName}
                    onChange={(event) => updateCreateForm('requesterName', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Optional source or assigning editor name"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Requester Email</label>
                  <input
                    type="email"
                    value={createForm.requesterEmail}
                    onChange={(event) => updateCreateForm('requesterEmail', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Optional contact email"
                  />
                </div>

                <div>
                  <label className="form-label text-slate-500">Requester Phone</label>
                  <input
                    type="text"
                    value={createForm.requesterPhone}
                    onChange={(event) => updateCreateForm('requesterPhone', event.target.value)}
                    className="form-input border-slate-300 bg-white text-slate-950"
                    placeholder="Optional phone number"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  updateSearchParams({ focus: null });
                  setCreateError('');
                }}
                className="btn-neutral"
              >
                Cancel
              </button>
              <button type="submit" disabled={isCreating} className="btn-primary">
                {isCreating ? 'Creating...' : 'Create Reporter Run'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Choose “Reporter Run” to create a new run from this drawer.
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
