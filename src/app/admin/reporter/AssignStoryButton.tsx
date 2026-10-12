'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AssignStoryButton({
  candidateId,
  linkedRunId,
  reporters,
  canAssign,
}: {
  candidateId: string;
  linkedRunId: string | null;
  reporters: Array<{ id: string; firstName: string; lastName: string }>;
  canAssign: boolean;
}) {
  const [reporterId, setReporterId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  if (linkedRunId)
    return (
      <Link href="/admin/reporter?section=assigned" className="admin-list-link">
        View Assigned Story
      </Link>
    );
  if (!canAssign) return <span>An editor must assign this story.</span>;
  return (
    <div className="space-y-2">
      <div className="admin-list-filter">
        <label
          htmlFor={`candidate-reporter-${candidateId}`}
          className="admin-list-filter-label"
        >
          Reporter
        </label>
        <select
          id={`candidate-reporter-${candidateId}`}
          className="admin-list-cell-select"
          value={reporterId}
          disabled={busy}
          onChange={(event) => setReporterId(event.target.value)}
        >
          <option value="">Choose reporter</option>
          {reporters.map((reporter) => (
            <option key={reporter.id} value={reporter.id}>
              {reporter.firstName} {reporter.lastName}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="admin-list-link"
        disabled={!reporterId || busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const response = await fetch(
              `/api/admin/reporter/story-candidates/${candidateId}/assign`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedToUserId: reporterId }),
              }
            );
            const data = await response.json();
            if (!response.ok)
              throw new Error(data.error || 'Unable to assign story.');
            router.push('/admin/reporter?section=assigned');
            router.refresh();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : 'Unable to assign story.'
            );
            setBusy(false);
          }
        }}
      >
        {busy ? 'Assigning…' : 'Assign Story'}
      </button>
      {error ? (
        <p role="alert" className="admin-list-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
