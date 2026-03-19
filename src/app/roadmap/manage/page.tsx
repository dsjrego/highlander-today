'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type RoadmapIdeaStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED_FOR_RANKING'
  | 'DECLINED'
  | 'MERGED'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'SHIPPED';

interface RoadmapIdea {
  id: string;
  title: string;
  summary: string;
  status: RoadmapIdeaStatus;
  updatedAt: string;
  mergedInto: {
    id: string;
    title: string;
    status: string;
  } | null;
}

const STATUS_STYLES: Record<RoadmapIdeaStatus, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED_FOR_RANKING: 'bg-sky-100 text-sky-800',
  DECLINED: 'bg-rose-100 text-rose-800',
  MERGED: 'bg-violet-100 text-violet-800',
  PLANNED: 'bg-indigo-100 text-indigo-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  SHIPPED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<RoadmapIdeaStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED_FOR_RANKING: 'Open for Ranking',
  DECLINED: 'Declined',
  MERGED: 'Merged',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  SHIPPED: 'Shipped',
};

export default function ManageRoadmapIdeasPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [ideas, setIdeas] = useState<RoadmapIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  useEffect(() => {
    if (!isTrusted) {
      setIsLoading(false);
      return;
    }

    async function fetchIdeas() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch('/api/roadmap?mine=1&limit=100');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch roadmap ideas');
        }

        setIdeas(data.ideas || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch roadmap ideas');
      } finally {
        setIsLoading(false);
      }
    }

    fetchIdeas();
  }, [isTrusted]);

  async function handleDelete(ideaId: string) {
    const confirmed = window.confirm('Delete this roadmap idea?');
    if (!confirmed) {
      return;
    }

    setDeletingId(ideaId);
    try {
      const res = await fetch(`/api/roadmap/${ideaId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete roadmap idea');
      }

      setIdeas((current) => current.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete roadmap idea');
    } finally {
      setDeletingId(null);
    }
  }

  if (sessionStatus === 'loading') {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading your roadmap ideas...</div>;
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-5 py-4">
        Sign in with a trusted account to manage roadmap ideas.
      </div>
    );
  }

  if (!isTrusted) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-5 py-4">
        Trusted membership is required before you can submit or manage roadmap ideas.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">My Roadmap Ideas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track moderation status, revise declined ideas, and follow which submissions have moved into the public roadmap.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/roadmap')}
            className="px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition"
          >
            View Roadmap
          </button>
          <button
            type="button"
            onClick={() => router.push('/roadmap/submit')}
            className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
            style={{ backgroundColor: '#A51E30' }}
          >
            + Submit Idea
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Loading your ideas...
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">You have not submitted any roadmap ideas yet</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Start by proposing a clear improvement that supports local information, interaction, or community coordination.
          </p>
          <Link
            href="/roadmap/submit"
            className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
            style={{ backgroundColor: '#A51E30' }}
          >
            Submit an Idea
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => {
            const canEdit = ['SUBMITTED', 'UNDER_REVIEW', 'DECLINED'].includes(idea.status);
            const canDelete = ['SUBMITTED', 'DECLINED'].includes(idea.status);

            return (
              <div
                key={idea.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[idea.status]}`}>
                        {STATUS_LABELS[idea.status]}
                      </span>
                      <span className="text-sm text-gray-400">
                        Updated {new Date(idea.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{idea.title}</h2>
                    <p className="text-gray-700">{idea.summary}</p>
                    {idea.mergedInto ? (
                      <p className="text-sm text-gray-500 mt-3">
                        Merged into{' '}
                        <Link className="text-[#A51E30] hover:underline" href={`/roadmap/${idea.mergedInto.id}`}>
                          {idea.mergedInto.title}
                        </Link>
                        .
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/roadmap/${idea.id}`}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      View
                    </Link>
                    {canEdit ? (
                      <Link
                        href={`/roadmap/${idea.id}/edit`}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(idea.id)}
                        disabled={deletingId === idea.id}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                        style={{ backgroundColor: '#A51E30' }}
                      >
                        {deletingId === idea.id ? 'Deleting...' : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
