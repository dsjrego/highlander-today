'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminViewTabs } from '@/components/admin/AdminViewTabs';

interface PersonSummary {
  fullName: string;
  deathDate: string | Date | null;
  townName: string | null;
}

interface AssigneeSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface SubmissionRow {
  id: string;
  submissionType: string;
  status: string;
  relationshipToDeceased: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  summary: string | null;
  reviewNotes?: string | null;
  updatedAt: string | Date;
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
  memorialPerson: PersonSummary | null;
  memorialPage: {
    id: string;
    title: string;
    slug: string;
    status: string;
    pageType: string;
  } | null;
  assignedTo: AssigneeSummary | null;
  reviewedBy?: AssigneeSummary | null;
  _count: {
    verifications: number;
    auditLogs: number;
  };
}

interface MemorialPageRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  pageType: string;
  updatedAt: string | Date;
  memorialPerson: PersonSummary;
  category: {
    name: string;
    slug: string;
  } | null;
  _count: {
    memories: number;
    photos: number;
    verifications: number;
  };
}

interface MemoryRow {
  id: string;
  status: string;
  displayName: string | null;
  relationshipToDeceased: string | null;
  body: string;
  createdAt: string | Date;
  reviewedAt: string | Date | null;
  memorialPage: {
    title: string;
    slug: string;
    memorialPerson: {
      fullName: string;
    };
  };
  createdBy: AssigneeSummary | null;
  reviewedBy: AssigneeSummary | null;
}

interface MemoriamAdminClientProps {
  submissions: SubmissionRow[];
  memorialPages: MemorialPageRow[];
  memories: MemoryRow[];
  assignees: AssigneeSummary[];
}

const SUBMISSION_VIEWS = [
  { key: 'all', label: 'All submissions' },
  { key: 'PENDING_REVIEW', label: 'Pending' },
  { key: 'NEEDS_CLARIFICATION', label: 'Needs clarification' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

const REVIEWABLE_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'NEEDS_CLARIFICATION',
  'APPROVED',
  'REJECTED',
] as const;

function submissionTone(status: string): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (status) {
    case 'APPROVED':
      return 'ok';
    case 'PENDING_REVIEW':
    case 'NEEDS_CLARIFICATION':
      return 'pend';
    case 'REJECTED':
      return 'bad';
    default:
      return 'neu';
  }
}

function pageTone(status: string): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (status) {
    case 'PUBLISHED':
      return 'ok';
    case 'PENDING_REVIEW':
    case 'DRAFT':
      return 'pend';
    case 'REJECTED':
    case 'FROZEN':
    case 'UNPUBLISHED':
      return 'bad';
    default:
      return 'neu';
  }
}

function memoryTone(status: string): 'ok' | 'pend' | 'bad' | 'neu' {
  switch (status) {
    case 'APPROVED':
      return 'ok';
    case 'PENDING':
      return 'pend';
    case 'REJECTED':
    case 'HIDDEN':
      return 'bad';
    default:
      return 'neu';
  }
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAssignee(person: AssigneeSummary | null | undefined) {
  if (!person) {
    return 'Unassigned';
  }

  return `${person.firstName} ${person.lastName}`.trim();
}

export default function MemoriamAdminClient({
  submissions,
  memorialPages,
  memories,
  assignees,
}: MemoriamAdminClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') || 'all';
  const focusedSubmissionId = searchParams.get('focus');

  const [rows, setRows] = useState(submissions);
  const [memoryRows, setMemoryRows] = useState(memories);
  const [query, setQuery] = useState('');
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingMemoryId, setPendingMemoryId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [reviewForm, setReviewForm] = useState<{
    status: (typeof REVIEWABLE_STATUSES)[number];
    assignedToUserId: string;
    reviewNotes: string;
  }>({
    status: 'PENDING_REVIEW',
    assignedToUserId: '',
    reviewNotes: '',
  });

  function updateSearchParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
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

    return rows.filter((row) => {
      if (activeView !== 'all' && row.status !== activeView) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        row.memorialPerson?.fullName,
        row.requesterName,
        row.requesterEmail,
        row.relationshipToDeceased,
        row.summary,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeView, query, rows]);

  const focusedSubmission = rows.find((row) => row.id === focusedSubmissionId) || null;

  useEffect(() => {
    if (!focusedSubmission) {
      return;
    }

    setReviewForm({
      status: REVIEWABLE_STATUSES.includes(
        focusedSubmission.status as (typeof REVIEWABLE_STATUSES)[number]
      )
        ? (focusedSubmission.status as (typeof REVIEWABLE_STATUSES)[number])
        : 'PENDING_REVIEW',
      assignedToUserId: focusedSubmission.assignedTo?.id || '',
      reviewNotes: focusedSubmission.reviewNotes || '',
    });
    setSaveError('');
  }, [focusedSubmission]);

  function openReviewDrawer(submission: SubmissionRow) {
    updateSearchParams({ focus: submission.id });
  }

  async function updateMemoryStatus(memoryId: string, status: 'APPROVED' | 'REJECTED' | 'HIDDEN') {
    setPendingMemoryId(memoryId);
    setSaveError('');

    try {
      const response = await fetch(`/api/memoriam/memories/${memoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update memory');
      }

      setMemoryRows((current) =>
        current.map((row) => (row.id === memoryId ? { ...row, ...data } : row))
      );
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to update memory');
    } finally {
      setPendingMemoryId(null);
    }
  }

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!focusedSubmission) {
      return;
    }

    setPendingSave(true);
    setSaveError('');

    try {
      const response = await fetch(`/api/memoriam/submissions/${focusedSubmission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: reviewForm.status,
          assignedToUserId: reviewForm.assignedToUserId || null,
          reviewNotes: reviewForm.reviewNotes || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update memoriam submission');
      }

      setRows((current) =>
        current.map((row) => (row.id === data.id ? { ...row, ...data } : row))
      );
      updateSearchParams({ focus: null });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to update memoriam submission'
      );
    } finally {
      setPendingSave(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AdminViewTabs
          defaultView="all"
          views={SUBMISSION_VIEWS.map((view) => ({
            key: view.key,
            label: view.label,
            count: view.key === 'all' ? rows.length : rows.filter((row) => row.status === view.key).length,
            tone:
              view.key === 'PENDING_REVIEW' || view.key === 'NEEDS_CLARIFICATION'
                ? 'pend'
                : view.key === 'REJECTED'
                    ? 'bad'
                    : undefined,
          }))}
        />
      </div>

      <AdminFilterBar>
        <label className="admin-filter-field">
          <span className="admin-filter-label">Search</span>
          <input
            className="admin-filter-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, requester, relationship"
          />
        </label>
      </AdminFilterBar>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-label">Submission queue</div>
        </div>
        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Person</th>
                    <th className="admin-list-header-cell">Type</th>
                    <th className="admin-list-header-cell">Status</th>
                    <th className="admin-list-header-cell">Relationship</th>
                    <th className="admin-list-header-cell">Assignee</th>
                    <th className="admin-list-header-cell">Signals</th>
                    <th className="admin-list-header-cell">Updated</th>
                    <th className="admin-list-header-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={8}>
                        No memoriam submissions match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">
                            {row.memorialPerson?.fullName || 'Unnamed person'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.memorialPerson?.townName || 'Town unknown'}
                            {' · '}
                            {formatDate(row.memorialPerson?.deathDate)}
                          </div>
                        </td>
                        <td className="admin-list-cell">{row.submissionType}</td>
                        <td className="admin-list-cell">
                          <AdminChip tone={submissionTone(row.status)} dot>
                            {row.status}
                          </AdminChip>
                        </td>
                        <td className="admin-list-cell">
                          <div>{row.relationshipToDeceased || 'Not provided'}</div>
                          <div className="text-xs text-slate-500">
                            {row.requesterName || row.requesterEmail || 'No requester'}
                          </div>
                        </td>
                        <td className="admin-list-cell">{formatAssignee(row.assignedTo)}</td>
                        <td className="admin-list-cell text-xs text-slate-600">
                          {row._count.verifications} verifications
                          <br />
                          {row._count.auditLogs} audit entries
                        </td>
                        <td className="admin-list-cell">{formatDate(row.updatedAt)}</td>
                        <td className="admin-list-cell">
                          <button
                            type="button"
                            className="admin-table-button"
                            onClick={() => openReviewDrawer(row)}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-label">Memorial pages</div>
        </div>
        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Page</th>
                    <th className="admin-list-header-cell">Person</th>
                    <th className="admin-list-header-cell">Status</th>
                    <th className="admin-list-header-cell">Category</th>
                    <th className="admin-list-header-cell">Memory state</th>
                    <th className="admin-list-header-cell">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {memorialPages.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={6}>
                        No memorial pages have been created yet.
                      </td>
                    </tr>
                  ) : (
                    memorialPages.map((page) => (
                      <tr key={page.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">{page.title}</div>
                          <div className="text-xs text-slate-500">{page.slug}</div>
                        </td>
                        <td className="admin-list-cell">
                          <div>{page.memorialPerson.fullName}</div>
                          <div className="text-xs text-slate-500">
                            {page.memorialPerson.townName || 'Town unknown'}
                          </div>
                        </td>
                        <td className="admin-list-cell">
                          <AdminChip tone={pageTone(page.status)} dot>
                            {page.status}
                          </AdminChip>
                        </td>
                        <td className="admin-list-cell">
                          {page.category?.name || 'Unassigned'}
                        </td>
                        <td className="admin-list-cell text-xs text-slate-600">
                          {page._count.memories} memories
                          <br />
                          {page._count.photos} photos
                          <br />
                          {page._count.verifications} verifications
                        </td>
                        <td className="admin-list-cell">{formatDate(page.updatedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-label">Memory moderation</div>
        </div>
        <div className="admin-card-body">
          {saveError ? <p className="mb-3 text-sm text-red-700">{saveError}</p> : null}
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Memory</th>
                    <th className="admin-list-header-cell">Page</th>
                    <th className="admin-list-header-cell">Submitted by</th>
                    <th className="admin-list-header-cell">Status</th>
                    <th className="admin-list-header-cell">Submitted</th>
                    <th className="admin-list-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {memoryRows.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={6}>
                        No memory submissions have been received yet.
                      </td>
                    </tr>
                  ) : (
                    memoryRows.map((memory) => (
                      <tr key={memory.id} className="admin-list-row">
                        <td className="admin-list-cell max-w-md">
                          <div className="line-clamp-3 text-sm text-slate-700">{memory.body}</div>
                        </td>
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">
                            {memory.memorialPage.memorialPerson.fullName}
                          </div>
                          <div className="text-xs text-slate-500">{memory.memorialPage.title}</div>
                        </td>
                        <td className="admin-list-cell">
                          <div>{memory.displayName || formatAssignee(memory.createdBy)}</div>
                          <div className="text-xs text-slate-500">
                            {memory.relationshipToDeceased || 'Relationship not provided'}
                          </div>
                        </td>
                        <td className="admin-list-cell">
                          <AdminChip tone={memoryTone(memory.status)} dot>
                            {memory.status}
                          </AdminChip>
                        </td>
                        <td className="admin-list-cell">{formatDate(memory.createdAt)}</td>
                        <td className="admin-list-cell">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="admin-table-button"
                              disabled={pendingMemoryId === memory.id}
                              onClick={() => updateMemoryStatus(memory.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="admin-table-button"
                              disabled={pendingMemoryId === memory.id}
                              onClick={() => updateMemoryStatus(memory.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="admin-table-button"
                              disabled={pendingMemoryId === memory.id}
                              onClick={() => updateMemoryStatus(memory.id, 'HIDDEN')}
                            >
                              Hide
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AdminDrawer
        title={focusedSubmission?.memorialPerson?.fullName || 'Review Memoriam Submission'}
      >
        {focusedSubmission ? (
          <form className="space-y-4" onSubmit={handleReviewSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{focusedSubmission.submissionType}</div>
              <div className="mt-1">{focusedSubmission.summary || 'No summary provided.'}</div>
              <div className="mt-2 text-xs text-slate-500">
                Requester: {focusedSubmission.requesterName || focusedSubmission.requesterEmail || 'Unknown'}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={reviewForm.status}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    status: event.target.value as (typeof REVIEWABLE_STATUSES)[number],
                  }))
                }
              >
                {REVIEWABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Assignee</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={reviewForm.assignedToUserId}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    assignedToUserId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.firstName} {assignee.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Review notes</span>
              <textarea
                className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={reviewForm.reviewNotes}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    reviewNotes: event.target.value,
                  }))
                }
                placeholder="Clarifications, provenance checks, or moderation notes"
              />
            </label>

            {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => updateSearchParams({ focus: null })}
                disabled={pendingSave}
              >
                Close
              </button>
              <button type="submit" className="admin-primary-button" disabled={pendingSave}>
                {pendingSave ? 'Saving...' : 'Save review'}
              </button>
            </div>
          </form>
        ) : null}
      </AdminDrawer>
    </div>
  );
}
