'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { hasTrustedAccess } from '@/lib/trust-access';

interface MemorialMemoryFormProps {
  memorialPageId: string;
}

export default function MemorialMemoryForm({ memorialPageId }: MemorialMemoryFormProps) {
  const { data: session, status } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [relationshipToDeceased, setRelationshipToDeceased] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const currentUser = session?.user as
    | {
        name?: string | null;
        role?: string | null;
        trust_level?: string | null;
      }
    | undefined;

  const isAuthenticated = status === 'authenticated' && Boolean(session?.user);
  const isTrusted = hasTrustedAccess({
    role: currentUser?.role,
    trustLevel: currentUser?.trust_level,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!isTrusted) {
      setError('Trusted membership is required before sharing a memory.');
      return;
    }

    if (body.trim().length < 10) {
      setError('Please add a memory or condolence with at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/memoriam/pages/${memorialPageId}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayName.trim() || currentUser?.name || undefined,
          relationshipToDeceased: relationshipToDeceased.trim() || undefined,
          body,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit memory');
      }

      setDisplayName('');
      setRelationshipToDeceased('');
      setBody('');
      setMessage('Memory received. It will appear after staff or steward review.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit memory');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold text-slate-950">Share a Memory</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">Loading...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold text-slate-950">Share a Memory</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Sign in with a trusted account to send a memory or condolence for review.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Sign In
        </Link>
      </section>
    );
  }

  if (!isTrusted) {
    return (
      <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        <h2 className="text-xl font-bold">Share a Memory</h2>
        <p className="mt-3 text-sm leading-7">
          Trusted membership is required before memories can be submitted. This keeps memorial
          pages moderated and accountable.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <h2 className="text-xl font-bold text-slate-950">Share a Memory</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Memories and condolences are reviewed before they appear publicly.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder={currentUser?.name || 'Optional'}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Relationship</span>
            <input
              value={relationshipToDeceased}
              onChange={(event) => setRelationshipToDeceased(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              placeholder="Friend, classmate, neighbor"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Memory or condolence</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            className="w-full rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            required
          />
        </label>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit For Review'}
          </button>
        </div>
      </form>
    </section>
  );
}
