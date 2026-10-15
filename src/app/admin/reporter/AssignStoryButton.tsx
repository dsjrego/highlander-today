'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, UserPlus, X } from 'lucide-react';
import {
  CrudActionButton,
  CrudActionLink,
} from '@/components/shared/CrudAction';

export default function AssignStoryButton({
  candidateId,
  linkedRunId,
  reporters,
  canAssign,
  canDismiss,
}: {
  candidateId: string;
  linkedRunId: string | null;
  reporters: Array<{ id: string; firstName: string; lastName: string }>;
  canAssign: boolean;
  canDismiss: boolean;
}) {
  const [reporterId, setReporterId] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  const disabled = busy || refreshing;

  async function act(action: 'assign' | 'dismiss') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/reporter/story-candidates/${candidateId}/${action}`,
        {
          method: 'POST',
          ...(action === 'assign'
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedToUserId: reporterId }),
              }
            : {}),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `Unable to ${action} candidate.`);
      startRefresh(() => {
        if (action === 'assign')
          router.push('/admin/reporter?section=assigned');
        router.refresh();
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : `Unable to ${action} candidate.`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-row-actions">
        {linkedRunId ? (
          <CrudActionLink
            href={`/admin/reporter/${linkedRunId}`}
            icon={Eye}
            label="View assigned story"
          />
        ) : canAssign ? (
          <>
            <label
              htmlFor={`candidate-reporter-${candidateId}`}
              className="sr-only"
            >
              Reporter
            </label>
            <select
              id={`candidate-reporter-${candidateId}`}
              className="admin-list-cell-select"
              value={reporterId}
              disabled={disabled}
              onChange={(event) => setReporterId(event.target.value)}
            >
              <option value="">Choose reporter</option>
              {reporters.map((reporter) => (
                <option key={reporter.id} value={reporter.id}>
                  {reporter.firstName} {reporter.lastName}
                </option>
              ))}
            </select>
            <CrudActionButton
              type="button"
              variant="inline"
              icon={UserPlus}
              label="Assign story"
              disabled={!reporterId || disabled}
              onClick={() => act('assign')}
            />
          </>
        ) : null}
        {canDismiss ? (
          <CrudActionButton
            type="button"
            variant="inline"
            icon={X}
            label="Dismiss candidate"
            title="Dismiss candidate. Sources and assigned stories are kept."
            disabled={disabled}
            onClick={() => act('dismiss')}
          />
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="admin-list-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
