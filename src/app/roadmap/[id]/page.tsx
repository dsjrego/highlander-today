'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  description: string;
  status: RoadmapIdeaStatus;
  staffNotes: string | null;
  publishedAt: string | null;
  plannedAt: string | null;
  startedAt: string | null;
  shippedAt: string | null;
  createdAt: string;
  authorUserId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    trustLevel: string;
  };
  mergedInto: {
    id: string;
    title: string;
    status: RoadmapIdeaStatus;
  } | null;
  _count: {
    ballotItems: number;
  };
}

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

export default function RoadmapIdeaDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const [idea, setIdea] = useState<RoadmapIdea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchIdea() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/roadmap/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch roadmap idea');
        }

        setIdea(data);
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

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const canEdit = idea && currentUserId === idea.authorUserId && ['SUBMITTED', 'UNDER_REVIEW', 'DECLINED'].includes(idea.status);

  if (isLoading || sessionStatus === 'loading') {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading roadmap idea...</div>;
  }

  if (error || !idea) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] px-6 py-8 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        {error || 'Roadmap idea not found'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/roadmap" className="text-sm font-semibold text-[#A51E30] hover:underline">
          Back to Roadmap
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[idea.status]}`}>
                {STATUS_LABELS[idea.status]}
              </span>
              <span className="text-sm text-gray-400">
                Proposed by {idea.author.firstName} {idea.author.lastName}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{idea.title}</h1>
            <p className="text-lg text-gray-700">{idea.summary}</p>
          </div>
          {canEdit ? (
            <Link
              href={`/roadmap/${idea.id}/edit`}
              className="px-4 py-2 text-sm font-semibold rounded-full text-white hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              Edit Idea
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Status</p>
            <p className="font-semibold text-gray-900">{STATUS_LABELS[idea.status]}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Submitted</p>
            <p className="font-semibold text-gray-900">{new Date(idea.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ranking Ballots</p>
            <p className="font-semibold text-gray-900">{idea._count.ballotItems}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Progress Date</p>
            <p className="font-semibold text-gray-900">
              {idea.shippedAt
                ? new Date(idea.shippedAt).toLocaleDateString()
                : idea.startedAt
                  ? new Date(idea.startedAt).toLocaleDateString()
                  : idea.plannedAt
                    ? new Date(idea.plannedAt).toLocaleDateString()
                    : idea.publishedAt
                      ? new Date(idea.publishedAt).toLocaleDateString()
                      : 'Not set'}
            </p>
          </div>
        </div>

        {idea.mergedInto ? (
          <div className="mb-6 bg-violet-50 border border-violet-200 text-violet-900 rounded-xl px-4 py-3 text-sm">
            This idea was merged into{' '}
            <Link href={`/roadmap/${idea.mergedInto.id}`} className="font-semibold hover:underline">
              {idea.mergedInto.title}
            </Link>
            .
          </div>
        ) : null}

        {idea.staffNotes ? (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
            <p className="font-semibold mb-1">Staff Note</p>
            <p>{idea.staffNotes}</p>
          </div>
        ) : null}

        <div className="prose prose-gray max-w-none">
          <h2>Detailed Explanation</h2>
          <p className="whitespace-pre-wrap">{idea.description}</p>
        </div>
      </div>
    </div>
  );
}
