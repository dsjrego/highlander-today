'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ArchiveStoryButton({ runId, onArchived }: { runId: string; onArchived?: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        className="admin-list-link"
        disabled={saving || refreshing}
        title="Remove this story from the active list. Drafts and sources are kept."
        onClick={async () => {
          setSaving(true);
          setError('');
          try {
            const response = await fetch(`/api/reporter/runs/${runId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'ARCHIVED' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to archive story.');
            onArchived?.();
            startRefresh(() => router.refresh());
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Unable to archive story.');
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving || refreshing ? 'Archiving…' : 'Archive'}
      </button>
      {error ? <p role="alert" className="admin-list-error">{error}</p> : null}
    </div>
  );
}
