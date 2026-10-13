'use client';

import { useRef, useState } from 'react';

type ImageCandidate = { url: string; caption: string };

export default function ReporterHeroImageGenerator({
  runId, draftId, title, body, disabled, onGeneratingChange, onSelect,
}: {
  runId: string;
  draftId: string;
  title: string;
  body: string;
  disabled: boolean;
  onGeneratingChange: (generating: boolean) => void;
  onSelect: (image: ImageCandidate) => void;
}) {
  const [candidate, setCandidate] = useState<ImageCandidate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const generateButton = useRef<HTMLButtonElement>(null);
  const selectButton = useRef<HTMLButtonElement>(null);

  async function generate() {
    if (disabled || requestInFlight.current) return;
    requestInFlight.current = true;
    setGenerating(true);
    onGeneratingChange(true);
    setError('');
    try {
      const response = await fetch(`/api/reporter/runs/${runId}/hero-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({ draftId, title, body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to generate a hero image.');
      setCandidate(data.image);
      requestAnimationFrame(() => selectButton.current?.focus());
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== 'TimeoutError'
        ? failure.message
        : 'Image generation timed out. Your selected image is unchanged.');
    } finally {
      requestInFlight.current = false;
      setGenerating(false);
      onGeneratingChange(false);
    }
  }

  return (
    <section aria-label="Generate editorial hero image" className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">
        Create a conceptual illustration from the current headline and story. It uses symbols and themes without recreating reported people, places or events.
      </p>
      <button ref={generateButton} type="button" className="btn btn-secondary" disabled={disabled || generating} onClick={generate}>
        {generating ? 'Generating hero image…' : candidate ? 'Regenerate hero image' : 'Generate hero image'}
      </button>
      {generating ? <p role="status">Creating your illustration. This may take a couple of minutes…</p> : null}
      {error ? <p role="alert" className="admin-list-error">{error}</p> : null}
      {candidate ? (
        <div className="space-y-3">
          <figure className="max-w-2xl overflow-hidden rounded-lg border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={candidate.url} alt="Generated conceptual editorial illustration for review" className="h-auto w-full" />
            <figcaption className="p-3 text-sm text-[var(--text-muted)]">{candidate.caption}</figcaption>
          </figure>
          <p role="status">Review the illustration for relevance and misleading details before choosing it.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn btn-ghost" disabled={disabled || generating} onClick={() => { setCandidate(null); setError(''); generateButton.current?.focus(); }}>
              Discard generated image
            </button>
            <button ref={selectButton} type="button" className="btn btn-secondary" disabled={disabled || generating}
              onClick={() => { onSelect(candidate); setCandidate(null); setError(''); generateButton.current?.focus(); }}>
              Use this image
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
