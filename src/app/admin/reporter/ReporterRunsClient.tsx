'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    sources: number;
    blockers: number;
    drafts: number;
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

export default function ReporterRunsClient({
  runs,
  assignees,
}: ReporterRunsClientProps) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return runs.filter((run) => {
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
  }, [assigneeFilter, query, runs, statusFilter]);

  return (
    <div className="admin-list">
      <div className="admin-list-toolbar">
        <label className="admin-list-filter">
          <span className="admin-list-filter-label">Filter: Topic, Subject, Requester</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reporter runs"
            className="admin-list-filter-input"
          />
        </label>

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
            </tr>
          </thead>
          <tbody>
            {filteredRuns.length === 0 ? (
              <tr className="admin-list-row">
                <td className="admin-list-empty" colSpan={6}>
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
                      {run.subjectName || run.requestType}
                    </div>
                  </td>
                  <td className="admin-list-cell">{run.status}</td>
                  <td className="admin-list-cell">
                    {run.requesterName || run.requesterEmail || 'Anonymous/unspecified'}
                  </td>
                  <td className="admin-list-cell">
                    {run.assignedTo
                      ? `${run.assignedTo.firstName} ${run.assignedTo.lastName}`
                      : 'Unassigned'}
                  </td>
                  <td className="admin-list-cell">
                    {run._count.sources} src / {run._count.blockers} blk / {run._count.drafts} dr
                  </td>
                  <td className="admin-list-cell">
                    {new Date(run.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
