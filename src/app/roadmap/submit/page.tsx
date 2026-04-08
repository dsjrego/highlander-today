'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import FormCard from '@/components/shared/FormCard';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

export default function SubmitRoadmapIdeaPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!isTrusted) {
      setError('Trusted membership is required to submit roadmap ideas.');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required.');
      return;
    }

    if (formData.summary.trim().length < 20) {
      setError('Summary must be at least 20 characters.');
      return;
    }

    if (formData.description.trim().length < 40) {
      setError('Description must be at least 40 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        setError(validationMessage || data.error || 'Failed to submit roadmap idea');
        return;
      }

      router.push(`/roadmap/${data.id}`);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sessionStatus === 'loading') {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading...</div>;
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-5 py-4">
        Sign in with a trusted account to submit a roadmap idea.
      </div>
    );
  }

  if (!isTrusted) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-5 py-4">
        Trusted membership is required before you can submit roadmap ideas.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Submit Roadmap Idea"
        actions={
          <button
            type="button"
            onClick={() => router.push('/roadmap/manage')}
            aria-label="My ideas"
            title="My ideas"
            className="page-header-action border-white/14 bg-white/8 text-white hover:bg-white/12"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M6 5.5h8" />
              <path strokeLinecap="round" d="M6 10h8" />
              <path strokeLinecap="round" d="M6 14.5h8" />
              <circle cx="3.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
            </svg>
            <span className="page-header-action-label">My Ideas</span>
          </button>
        }
      />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Propose a clear product improvement. Staff will review, clarify, merge, or decline ideas before they enter the roadmap pool.
      </p>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 mb-6 text-sm">
        Strong ideas describe the problem first, explain who it helps, and stay within Highlander Today’s local-first mission instead of becoming a general feature wishlist.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Moderation standards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-900 mb-1">1. Be specific</p>
            <p>Explain the user problem, the desired change, and how community members would use it.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">2. Stay on mission</p>
            <p>Ideas should strengthen local information, coordination, participation, or trusted interaction loops.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">3. Expect moderation</p>
            <p>Staff may merge duplicates, clarify wording, or decline ideas that are vague, off-topic, or bad-faith.</p>
          </div>
        </div>
      </div>

      <FormCard>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Idea Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Add a public blocked-users management page"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Short Summary *
          </label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Describe the problem in a few sentences so staff and other members can understand it quickly."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Detailed Explanation *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Explain who is affected, what the current friction is, and what a better workflow would look like."
          />
          <p className="mt-2 text-xs text-gray-500">
            Include the workflow you expect, any important edge cases, and why this matters for local usage.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/roadmap')}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#A51E30' }}
          >
            {isLoading ? 'Submitting...' : 'Submit Idea'}
          </button>
        </div>
        </form>
      </FormCard>
    </div>
  );
}
