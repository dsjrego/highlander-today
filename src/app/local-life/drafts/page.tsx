'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  PENDING_REVIEW: { label: 'Pending Review', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PUBLISHED: { label: 'Published', bg: 'bg-green-100', text: 'text-green-700' },
  UNPUBLISHED: { label: 'Unpublished', bg: 'bg-red-100', text: 'text-red-700' },
};

export default function MyDraftsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (!userId) return;

    async function fetchMyArticles() {
      setIsLoading(true);
      try {
        // Fetch articles for each status the author would care about
        const statuses = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED'];
        const allArticles: Article[] = [];

        for (const status of statuses) {
          const res = await fetch(
            `/api/articles?authorId=${userId}&status=${status}&limit=50`
          );
          if (res.ok) {
            const data = await res.json();
            allArticles.push(...data.articles);
          }
        }

        // Sort by updatedAt descending
        allArticles.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setArticles(allArticles);
      } catch (err) {
        console.error('Failed to fetch articles:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyArticles();
  }, [userId]);

  async function handleSubmitForReview(articleId: string) {
    setActionLoading(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}/submit`, {
        method: 'POST',
      });
      if (res.ok) {
        // Update local state
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId ? { ...a, status: 'PENDING_REVIEW' as const } : a
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit');
      }
    } catch (err) {
      alert('Failed to submit article');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(articleId: string) {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    setActionLoading(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== articleId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete article');
    } finally {
      setActionLoading(null);
    }
  }

  const filteredArticles =
    filterStatus === 'all'
      ? articles
      : articles.filter((a) => a.status === filterStatus);

  const counts = {
    all: articles.length,
    DRAFT: articles.filter((a) => a.status === 'DRAFT').length,
    PENDING_REVIEW: articles.filter((a) => a.status === 'PENDING_REVIEW').length,
    PUBLISHED: articles.filter((a) => a.status === 'PUBLISHED').length,
  };

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-gray-500">Loading your articles...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <h1 className="text-2xl font-bold">My Articles</h1>
        <Link
          href="/local-life/submit"
          className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
          style={{ backgroundColor: '#A51E30' }}
        >
          + Write Article
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'DRAFT', label: 'Drafts' },
          { key: 'PENDING_REVIEW', label: 'Pending Review' },
          { key: 'PUBLISHED', label: 'Published' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filterStatus === key
                ? 'text-white'
                : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
            style={filterStatus === key ? { backgroundColor: '#A51E30' } : {}}
          >
            {label} ({counts[key as keyof typeof counts] || 0})
          </button>
        ))}
      </div>

      {/* Articles list */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">
            {filterStatus === 'DRAFT' ? '📝' : filterStatus === 'PENDING_REVIEW' ? '⏳' : '📄'}
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            {filterStatus === 'all'
              ? "You haven't written any articles yet"
              : `No ${STATUS_STYLES[filterStatus]?.label.toLowerCase() || ''} articles`}
          </h2>
          <p className="text-gray-500 mb-6">
            {filterStatus === 'all' || filterStatus === 'DRAFT'
              ? 'Start writing and share your story with the community.'
              : 'Check back soon.'}
          </p>
          {(filterStatus === 'all' || filterStatus === 'DRAFT') && (
            <Link
              href="/local-life/submit"
              className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              Write Your First Article
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => {
            const statusStyle = STATUS_STYLES[article.status] || STATUS_STYLES.DRAFT;
            const isActionInProgress = actionLoading === article.id;

            return (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status + Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {statusStyle.label}
                      </span>
                      {article.category && (
                        <span className="text-xs text-gray-400">
                          {article.category.name}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="text-xs text-gray-400">
                      {article.status === 'PUBLISHED' && article.publishedAt
                        ? `Published ${new Date(article.publishedAt).toLocaleDateString()}`
                        : `Last edited ${new Date(article.updatedAt).toLocaleDateString()}`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {article.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleSubmitForReview(article.id)}
                          disabled={isActionInProgress}
                          className="px-4 py-1.5 text-white text-xs font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
                          style={{ backgroundColor: '#A51E30' }}
                        >
                          {isActionInProgress ? '...' : 'Submit for Review'}
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={isActionInProgress}
                          className="px-4 py-1.5 text-red-600 text-xs font-medium border border-red-200 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {article.status === 'PENDING_REVIEW' && (
                      <span className="text-xs text-yellow-600 font-medium text-center">
                        Awaiting editor review
                      </span>
                    )}
                    {article.status === 'PUBLISHED' && (
                      <Link
                        href={`/local-life/${article.id}`}
                        className="px-4 py-1.5 text-xs font-semibold rounded-full hover:opacity-90 transition text-center"
                        style={{ color: '#A51E30', border: '1px solid #A51E30' }}
                      >
                        View
                      </Link>
                    )}
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
