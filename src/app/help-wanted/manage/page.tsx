'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

interface HelpWantedPost {
  id: string;
  title: string;
  description: string;
  postingType: 'EMPLOYMENT' | 'SERVICE_REQUEST' | 'GIG_TASK';
  compensationText: string | null;
  locationText: string | null;
  scheduleText: string | null;
  photoUrl: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'FILLED' | 'CLOSED' | 'REJECTED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<HelpWantedPost['status'], string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  PUBLISHED: 'Published',
  FILLED: 'Filled',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

const STATUS_STYLES: Record<HelpWantedPost['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  FILLED: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-slate-200 text-slate-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const POSTING_TYPE_LABELS: Record<HelpWantedPost['postingType'], string> = {
  EMPLOYMENT: 'Employment',
  SERVICE_REQUEST: 'Service Request',
  GIG_TASK: 'Gig / Task',
};

export default function ManageHelpWantedPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [posts, setPosts] = useState<HelpWantedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  useEffect(() => {
    if (!isTrusted) {
      setIsLoading(false);
      return;
    }

    async function fetchMyPosts() {
      setIsLoading(true);
      setError('');

      try {
        const res = await fetch('/api/help-wanted?mine=1&limit=100');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch your posts');
        }

        setPosts(data.posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch your posts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyPosts();
  }, [isTrusted]);

  async function updatePostStatus(postId: string, nextStatus: HelpWantedPost['status']) {
    setActionLoading(postId);
    setError('');

    try {
      const res = await fetch(`/api/help-wanted/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update post status');
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: data.status,
                updatedAt: data.updatedAt,
                publishedAt: data.publishedAt,
              }
            : post
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post status');
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePost(postId: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This permanently removes the post.`)) {
      return;
    }

    setActionLoading(postId);
    setError('');

    try {
      const res = await fetch(`/api/help-wanted/${postId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete post');
      }

      setPosts((current) => current.filter((post) => post.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setActionLoading(null);
    }
  }

  const filteredPosts =
    filterStatus === 'all'
      ? posts
      : posts.filter((post) => post.status === filterStatus);

  const counts = useMemo(
    () => ({
      all: posts.length,
      DRAFT: posts.filter((post) => post.status === 'DRAFT').length,
      PENDING_REVIEW: posts.filter((post) => post.status === 'PENDING_REVIEW').length,
      PUBLISHED: posts.filter((post) => post.status === 'PUBLISHED').length,
      FILLED: posts.filter((post) => post.status === 'FILLED').length,
      CLOSED: posts.filter((post) => post.status === 'CLOSED').length,
      REJECTED: posts.filter((post) => post.status === 'REJECTED').length,
    }),
    [posts]
  );

  const activeCount = counts.PUBLISHED;
  const awaitingReviewCount = counts.PENDING_REVIEW;
  const needsAttentionCount = counts.DRAFT + counts.REJECTED;

  function renderActions(post: HelpWantedPost) {
    const isBusy = actionLoading === post.id;

    if (post.status === 'DRAFT') {
      return (
        <>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'PENDING_REVIEW')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-[#A51E30] text-white font-semibold disabled:opacity-60"
          >
            Submit for Review
          </button>
          <Link
            href={`/help-wanted/${post.id}/edit`}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => deletePost(post.id, post.title)}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg border border-red-200 text-red-700 font-semibold disabled:opacity-60"
          >
            Delete
          </button>
        </>
      );
    }

    if (post.status === 'REJECTED') {
      return (
        <>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'PENDING_REVIEW')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-[#A51E30] text-white font-semibold disabled:opacity-60"
          >
            Resubmit
          </button>
          <Link
            href={`/help-wanted/${post.id}/edit`}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
          >
            Revise
          </Link>
          <button
            type="button"
            onClick={() => deletePost(post.id, post.title)}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg border border-red-200 text-red-700 font-semibold disabled:opacity-60"
          >
            Delete
          </button>
        </>
      );
    }

    if (post.status === 'PENDING_REVIEW') {
      return (
        <>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'DRAFT')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold disabled:opacity-60"
          >
            Move to Draft
          </button>
          <Link
            href={`/help-wanted/${post.id}`}
            className="px-3 py-2 rounded-lg bg-blue-50 text-[#46A8CC] font-semibold hover:bg-blue-100"
          >
            View
          </Link>
        </>
      );
    }

    if (post.status === 'PUBLISHED') {
      return (
        <>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'FILLED')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 font-semibold disabled:opacity-60"
          >
            Mark Filled
          </button>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'CLOSED')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold disabled:opacity-60"
          >
            Close
          </button>
          <Link
            href={`/help-wanted/${post.id}`}
            className="px-3 py-2 rounded-lg bg-blue-50 text-[#46A8CC] font-semibold hover:bg-blue-100"
          >
            View
          </Link>
        </>
      );
    }

    if (post.status === 'FILLED' || post.status === 'CLOSED') {
      return (
        <>
          <button
            type="button"
            onClick={() => updatePostStatus(post.id, 'PUBLISHED')}
            disabled={isBusy}
            className="px-3 py-2 rounded-lg bg-green-100 text-green-800 font-semibold disabled:opacity-60"
          >
            Reopen
          </button>
          <Link
            href={`/help-wanted/${post.id}`}
            className="px-3 py-2 rounded-lg bg-blue-50 text-[#46A8CC] font-semibold hover:bg-blue-100"
          >
            View
          </Link>
        </>
      );
    }

    return null;
  }

  if (sessionStatus === 'loading' || isLoading) {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading your Help Wanted posts...</div>;
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-5 py-4">
        Sign in with a trusted account to manage Help Wanted posts.
      </div>
    );
  }

  if (!isTrusted) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-5 py-4">
        Trusted membership is required before you can create or manage Help Wanted posts.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="My Help Wanted Posts"
        actions={
          <Link
            href="/help-wanted/submit"
            className="inline-flex items-center rounded-full bg-white px-2 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M8 3.25v9.5M3.25 8h9.5" />
            </svg>
            Post Opportunity
          </Link>
        }
      />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Review drafts, resubmit rejected posts, and manage open opportunities.
      </p>

      {error ? (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Open Opportunities</p>
          <p className="text-3xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-sm text-gray-500 mt-2">Posts currently published and able to receive responses.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Awaiting Review</p>
          <p className="text-3xl font-bold text-gray-900">{awaitingReviewCount}</p>
          <p className="text-sm text-gray-500 mt-2">These posts are in moderation and not yet visible to the public.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Needs Attention</p>
          <p className="text-3xl font-bold text-gray-900">{needsAttentionCount}</p>
          <p className="text-sm text-gray-500 mt-2">Drafts and rejected posts can be edited, revised, and submitted again.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 mb-6 text-sm">
        Use <strong>Filled</strong> when someone has taken the role or completed the task. Use <strong>Closed</strong> when you no longer want responses, even if no one was selected.
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'DRAFT', label: 'Drafts' },
          { key: 'PENDING_REVIEW', label: 'Pending' },
          { key: 'PUBLISHED', label: 'Open' },
          { key: 'FILLED', label: 'Filled' },
          { key: 'CLOSED', label: 'Closed' },
          { key: 'REJECTED', label: 'Rejected' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filterStatus === key ? 'text-white' : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
            style={filterStatus === key ? { backgroundColor: '#A51E30' } : {}}
          >
            {label} ({counts[key as keyof typeof counts] || 0})
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🧰</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            {filterStatus === 'all' ? "You haven't posted to Help Wanted yet" : `No ${filterStatus.toLowerCase()} posts`}
          </h2>
          <p className="text-gray-500 mb-6">
            Create your first post or switch filters to review other opportunity states.
          </p>
          <Link
            href="/help-wanted/submit"
            className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
            style={{ backgroundColor: '#A51E30' }}
          >
            Post an Opportunity
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800">
                      {POSTING_TYPE_LABELS[post.postingType]}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{post.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{post.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span>Updated {new Date(post.updatedAt).toLocaleDateString()}</span>
                    {post.status === 'PUBLISHED' && post.publishedAt ? (
                      <span>Live since {new Date(post.publishedAt).toLocaleDateString()}</span>
                    ) : null}
                    {post.locationText ? <span>{post.locationText}</span> : null}
                    {post.scheduleText ? <span>{post.scheduleText}</span> : null}
                    {post.compensationText ? <span>{post.compensationText}</span> : null}
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    {post.status === 'DRAFT'
                      ? 'This post is private to you until you submit it for review.'
                      : post.status === 'PENDING_REVIEW'
                        ? 'Editors are reviewing this post before public publication.'
                        : post.status === 'PUBLISHED'
                          ? 'Trusted users can respond through your Messages inbox while this stays open.'
                          : post.status === 'FILLED'
                            ? 'Marked filled. Reopen it if the opportunity becomes available again.'
                            : post.status === 'CLOSED'
                              ? 'Closed to new responses. Reopen it if you want to accept replies again.'
                              : 'Rejected posts stay private until you revise and resubmit them.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {renderActions(post)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
