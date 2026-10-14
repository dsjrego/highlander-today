'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive } from 'lucide-react';
import { CrudActionButton } from '@/components/shared/CrudAction';

export default function ArchiveStoryButton({ runId, onArchived }: { runId: string; onArchived?: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  return (
    <div>
      <CrudActionButton
        type="button"
        variant="inline"
        icon={Archive}
        label={saving || refreshing ? 'Archiving…' : 'Archive'}
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
      </CrudActionButton>
      {error ? <p role="alert" className="admin-list-error">{error}</p> : null}
    </div>
  );
}
