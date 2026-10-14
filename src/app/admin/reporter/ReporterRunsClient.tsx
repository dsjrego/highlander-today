'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { CrudActionLink } from '@/components/shared/CrudAction';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { STORY_STATUS_LABELS } from '@/lib/reporter/story-status';
import PrepareStoryButton from './PrepareStoryButton';
import ArchiveStoryButton from './ArchiveStoryButton';

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
  interviewRequests?: Array<{ sessions: Array<{ id: string }> }>;
  linkedArticle?: { status: string; slug: string } | null;
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
  canPrepare?: boolean;
  canAssign?: boolean;
  canArchive?: boolean;
  currentUserId?: string;
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
  'CONVERTED_TO_ARTICLE',
  'ARCHIVED',
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
  canPrepare = false,
  canAssign = false,
  canArchive = false,
  currentUserId = '',
}: ReporterRunsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const legacyView = searchParams.get('view');
  const focus = searchParams.get('focus');

  const [rows, setRows] = useState(runs);
  useEffect(() => {
    setRows(runs);
  }, [runs]);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  useEffect(() => {
    const value = legacyView === 'editor-ready' ? 'DRAFT_CREATED' : legacyView;
    if (
      value &&
      STATUS_OPTIONS.includes(value as (typeof STATUS_OPTIONS)[number])
    ) {
      setStatusFilter(value as (typeof STATUS_OPTIONS)[number]);
    }
  }, [legacyView]);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [newReporterId, setNewReporterId] = useState('');
  const [createForm, setCreateForm] =
    useState<CreateReporterRunFormState>(EMPTY_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccessRun, setCreateSuccessRun] =
    useState<ReporterRunRow | null>(null);

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
      if (statusFilter === 'ALL' && run.status === 'ARCHIVED') {
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
  }, [assigneeFilter, query, rows, statusFilter]);

  function updateCreateForm<K extends keyof CreateReporterRunFormState>(
    key: K,
    value: CreateReporterRunFormState[K]
  ) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newReporterId) {
      setCreateError('Choose a reporter for this story.');
      return;
    }
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
          assignedToUserId: newReporterId,
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
        throw new Error(data.error || 'Unable to create story');
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
        assignedTo:
          assignees.find((reporter) => reporter.id === newReporterId) || null,
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
      setCreateError(
        error instanceof Error ? error.message : 'Unable to create story'
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{filteredRuns.length} {filteredRuns.length === 1 ? 'story' : 'stories'}</span>
        {canAssign || canPrepare ? (
        <button
          type="button"
          className="page-header-action"
          onClick={() => {
            setCreateError('');
            updateSearchParams({ focus: 'new' });
          }}
        >
          <Plus className="h-4 w-4" />
          <span>New Story</span>
        </button>
        ) : <Link href="/report-a-story" className="page-header-action">Suggest a Story</Link>}
      </div>

      <div className="admin-list">
        {assignmentError ? (
          <p role="alert" className="admin-list-error">
            {assignmentError}
          </p>
        ) : null}
        {createSuccessRun ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Story assigned. Choose Prepare Draft to continue.
          </div>
        ) : null}

        <AdminFilterBar
          search={
            <label className="admin-list-filter">
              <span className="admin-list-filter-label">Search stories</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories"
                className="admin-list-filter-input"
              />
            </label>
          }
          right={
            <div className="flex flex-wrap gap-3">
              <div className="admin-list-filter">
                <label
                  htmlFor="story-status-filter"
                  className="admin-list-filter-label"
                >
                  Status
                </label>
                <select
                  id="story-status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as (typeof STATUS_OPTIONS)[number]
                    )
                  }
                  className="admin-list-cell-select"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === 'ALL'
                        ? 'All active statuses'
                        : STORY_STATUS_LABELS[status] || status}
                    </option>
                  ))}
                </select>
              </div>

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
                <th className="admin-list-header-cell">Story</th>
                <th className="admin-list-header-cell">Status</th>
                <th className="admin-list-header-cell">Assignee</th>
                <th className="admin-list-header-cell">Reporting material</th>
                <th className="admin-list-header-cell">Updated</th>
                <th className="admin-list-header-cell">Next action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={6}>
                    {statusFilter === 'ARCHIVED' ? 'No archived stories found.' : 'No assigned stories found.'}
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="admin-list-row">
                    <td className="admin-list-cell">
                      <span className="font-medium">
                        {run.title || run.topic}
                      </span>
                      <div className="text-xs text-slate-500">
                        {run.subjectName || 'Reporting assignment'}
                      </div>
                    </td>
                    <td className="admin-list-cell">
                      <AdminChip tone={statusTone(run.status)}>
                        {STORY_STATUS_LABELS[run.status] || run.status}
                      </AdminChip>
                    </td>
                    <td className="admin-list-cell">
                      {canAssign ? (
                        <label>
                          <span className="sr-only">
                            Reporter for {run.title || run.topic}
                          </span>
                          <select
                            className="admin-list-cell-select"
                            disabled={assigning === run.id}
                            value={run.assignedTo?.id || ''}
                            onChange={async (event) => {
                              const id = event.target.value;
                              if (!id) return;
                              setAssigning(run.id);
                              setAssignmentError('');
                              try {
                                const response = await fetch(
                                  `/api/reporter/runs/${run.id}`,
                                  {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      assignedToUserId: id,
                                    }),
                                  }
                                );
                                const data = await response.json();
                                if (!response.ok)
                                  throw new Error(
                                    data.error || 'Unable to assign reporter.'
                                  );
                                setRows((current) =>
                                  current.map((row) =>
                                    row.id === run.id
                                      ? { ...row, assignedTo: data.assignedTo }
                                      : row
                                  )
                                );
                              } catch (failure) {
                                setAssignmentError(
                                  failure instanceof Error
                                    ? failure.message
                                    : 'Unable to assign reporter.'
                                );
                              } finally {
                                setAssigning(null);
                              }
                            }}
                          >
                            <option value="">Choose reporter</option>
                            {assignees.map((reporter) => (
                              <option key={reporter.id} value={reporter.id}>
                                {reporter.firstName} {reporter.lastName}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : run.assignedTo ? (
                        `${run.assignedTo.firstName} ${run.assignedTo.lastName}`
                      ) : (
                        'Needs a reporter'
                      )}
                    </td>
                    <td className="admin-list-cell">
                      {run._count.sources}{' '}
                      {run._count.sources === 1 ? 'source' : 'sources'}
                      {run._count.blockers
                        ? ` · ${run._count.blockers} open issues`
                        : ''}
                      {run._count.interviewRequests
                        ? ` · ${run._count.interviewRequests} interviews`
                        : ''}
                    </td>
                    <td className="admin-list-cell">
                      {new Date(run.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="admin-list-cell">
                      <div className="admin-row-actions">
                        {run.status === 'ARCHIVED' ? (
                          <CrudActionLink href={`/admin/reporter/${run.id}?view=details`} icon={Eye} label="View story">
                            View story
                          </CrudActionLink>
                        ) : run._count.drafts ? (
                          <CrudActionLink
                            href={`/admin/reporter/${run.id}/review`}
                            icon={Eye}
                            label="Review & Publish"
                          >
                            Review &amp; Publish
                          </CrudActionLink>
                        ) : (
                          <PrepareStoryButton
                            runId={run.id}
                            canPrepare={canPrepare}
                            disabledReason={
                              !run.assignedTo
                                ? 'Choose a reporter.'
                                : !run._count.sources
                                  ? 'Add source material.'
                                  : run._count.blockers
                                    ? `${run._count.blockers} reporting issues need attention.`
                                    : run.interviewRequests?.some(
                                          (interview) => interview.sessions.length
                                        )
                                      ? 'Review completed interview notes.'
                                      : undefined
                            }
                          />
                        )}
                        {canArchive && run.status !== 'ARCHIVED' ? (
                          <ArchiveStoryButton
                            runId={run.id}
                            onArchived={() =>
                              setRows((current) =>
                                current.map((row) =>
                                  row.id === run.id ? { ...row, status: 'ARCHIVED' } : row
                                )
                              )
                            }
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDrawer title="New Story">
        {focus === 'new' ? (
          <form onSubmit={handleCreateRun} className="space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-950">New Story</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add the story topic and source material. Then choose Prepare
                Draft from Assigned Stories.
              </p>
            </div>

            {createError ? (
              <div className="admin-list-error">{createError}</div>
            ) : null}

            <div className="admin-list-filter">
              <label
                htmlFor="new-story-reporter"
                className="admin-list-filter-label"
              >
                Reporter (required)
              </label>
              <select
                id="new-story-reporter"
                required
                className="form-input"
                value={newReporterId}
                onChange={(event) => setNewReporterId(event.target.value)}
              >
                <option value="">Choose reporter</option>
                {assignees
                  .filter(
                    (reporter) => canAssign || reporter.id === currentUserId
                  )
                  .map((reporter) => (
                    <option key={reporter.id} value={reporter.id}>
                      {reporter.firstName} {reporter.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <label className="admin-list-filter">
              <span className="form-label">Story topic (required)</span>
              <input
                required
                className="form-input"
                value={createForm.topic}
                onChange={(event) =>
                  updateCreateForm('topic', event.target.value)
                }
              />
            </label>
            <label className="admin-list-filter">
              <span className="form-label">Source notes (optional)</span>
              <textarea
                className="form-input"
                rows={5}
                value={createForm.whatHappened}
                onChange={(event) =>
                  updateCreateForm('whatHappened', event.target.value)
                }
              />
            </label>
            <label className="admin-list-filter">
              <span className="form-label">
                Source links (optional, one per line)
              </span>
              <textarea
                className="form-input"
                rows={3}
                value={createForm.supportingLinks}
                onChange={(event) =>
                  updateCreateForm('supportingLinks', event.target.value)
                }
              />
            </label>
            <p className="text-sm">
              Add source notes or links before preparing a draft.
            </p>

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
              <button
                type="submit"
                disabled={isCreating}
                className="btn-primary"
              >
                {isCreating ? 'Creating...' : 'Create Story'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Choose “New Story” to create a reporting assignment.
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
