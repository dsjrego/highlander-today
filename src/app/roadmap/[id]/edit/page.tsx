'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type RoadmapIdeaStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'DECLINED';

interface RoadmapIdea {
  id: string;
  title: string;
  summary: string;
  description: string;
  status: RoadmapIdeaStatus;
  staffNotes: string | null;
}

export default function EditRoadmapIdeaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    description: '',
  });
  const [status, setStatus] = useState<RoadmapIdeaStatus | null>(null);
  const [staffNotes, setStaffNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchIdea() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/roadmap/${params.id}`);
        const data: RoadmapIdea | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Failed to fetch roadmap idea');
        }

        const idea = data as RoadmapIdea;
        setFormData({
          title: idea.title,
          summary: idea.summary,
          description: idea.description,
        });
        setStatus(idea.status);
        setStaffNotes(idea.staffNotes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch roadmap idea');
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchIdea();
    }
  }, [params.id]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const res = await fetch(`/api/roadmap/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...(status === 'DECLINED' ? { resubmit: true } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(', ')
          : '';
        setError(validationMessage || data.error || 'Failed to update roadmap idea');
        return;
      }

      router.push(`/roadmap/${params.id}`);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Loading roadmap idea...</div>;
  }

  if (error && !status) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/74">
            Roadmap
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">Edit roadmap idea</h1>
          <p className="mt-4 text-base leading-8 text-white/78 md:text-lg">
            Update your proposal and {status === 'DECLINED' ? 'resubmit it for review.' : 'keep it clear while staff reviews it.'}
          </p>
        </div>
      </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      {status === 'DECLINED' && staffNotes ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm whitespace-pre-wrap text-yellow-900">
          <p className="font-semibold mb-1">Staff feedback</p>
          <p>{staffNotes}</p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
      >
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Idea Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Short Summary *</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Detailed Explanation *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={8}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/roadmap/${params.id}`)}
            className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : status === 'DECLINED' ? 'Save and Resubmit' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
