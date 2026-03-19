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
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading roadmap idea...</div>;
  }

  if (error && !status) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">Edit Roadmap Idea</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update your proposal and {status === 'DECLINED' ? 'resubmit it for review.' : 'keep it clear while staff reviews it.'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      {status === 'DECLINED' && staffNotes ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-3 mb-6 text-sm whitespace-pre-wrap">
          <p className="font-semibold mb-1">Staff feedback</p>
          <p>{staffNotes}</p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm space-y-6"
      >
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Idea Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Short Summary *</label>
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Detailed Explanation *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/roadmap/${params.id}`)}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#A51E30' }}
          >
            {isSaving ? 'Saving...' : status === 'DECLINED' ? 'Save and Resubmit' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
