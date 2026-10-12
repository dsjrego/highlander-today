'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrepareStoryButton({
  runId,
  disabledReason,
  canPrepare = true,
}: {
  runId: string;
  disabledReason?: string;
  canPrepare?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (disabledReason || !canPrepare)
    return (
      <div>
        <div className="text-sm">
          {disabledReason || 'A staff reporter must prepare this draft.'}
        </div>
        {disabledReason !== 'Choose a reporter.' ? (
          <a
            href={`/admin/reporter/${runId}?view=${disabledReason?.includes('source') ? 'sources' : disabledReason?.includes('interview') ? 'interviews' : disabledReason?.includes('archived') ? 'details' : 'blockers'}`}
            className="admin-list-link"
          >
            Resolve issues
          </a>
        ) : null}
      </div>
    );
  return (
    <div>
      <button
        type="button"
        className="admin-list-link"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const response = await fetch(`/api/reporter/runs/${runId}/draft`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ draftType: 'ARTICLE_DRAFT' }),
            });
            const data = await response.json();
            if (!response.ok)
              throw new Error(data.error || 'Unable to prepare draft.');
            router.push(`/admin/reporter/${runId}/review`);
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : 'Unable to prepare draft.'
            );
            setBusy(false);
          }
        }}
      >
        {busy ? 'Preparing draft…' : 'Prepare Draft'}
      </button>
      {error ? (
        <p role="alert" className="admin-list-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
