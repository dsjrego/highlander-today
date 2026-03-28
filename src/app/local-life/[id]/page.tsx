'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CommentThread, type ThreadComment } from '@/components/articles/CommentThread';
import UserAvatar from '@/components/shared/UserAvatar';

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  trustLevel: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featuredImageUrl: string | null;
  featuredImageCaption: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  author: Author;
  category: { id: string; name: string; slug: string; parentCategoryId: string | null } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  comments: ThreadComment[];
}

export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;
  const { data: session } = useSession();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
        } else if (res.status === 404) {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch article:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (articleId) fetchArticle();
  }, [articleId]);

  async function refreshArticle() {
    try {
      const res = await fetch(`/api/articles/${articleId}`);
      if (res.ok) {
        const data = await res.json();
        setArticle(data);
      }
    } catch (err) {
      console.error('Failed to refresh article:', err);
    }
  }

  async function handleAddComment(parentId: string | null, body: string) {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId,
        parentCommentId: parentId,
        body,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to post comment');
    }

    await refreshArticle();
  }

  async function handleDeleteComment(commentId: string) {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete comment');
    }

    await refreshArticle();
  }

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading article...
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] py-20 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">Local Life</p>
        <h1 className="mb-2 text-2xl font-bold text-white">Article Not Found</h1>
        <p className="mb-6 text-white/70">This article may have been removed or is not yet published.</p>
        <Link
          href="/local-life"
          className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          Back to Local Life
        </Link>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Draft/pending indicator for authors/editors
  const showStatusBanner = article.status !== 'PUBLISHED';
  const viewerTrustLevel = session?.user?.trust_level || '';
  const canComment = viewerTrustLevel === 'TRUSTED';

  return (
    <div className="space-y-4">
      {/* Status banner for non-published articles */}
      {showStatusBanner && (
        <div className={`rounded-2xl p-3 text-sm font-medium ${
          article.status === 'DRAFT'
            ? 'bg-gray-100 text-gray-700'
            : article.status === 'PENDING_REVIEW'
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : 'bg-red-50 text-red-700'
        }`}>
          {article.status === 'DRAFT' && 'This article is a draft and is only visible to you.'}
          {article.status === 'PENDING_REVIEW' && 'This article is pending editor review.'}
          {article.status === 'UNPUBLISHED' && 'This article has been unpublished.'}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/local-life" className="transition-colors hover:text-[#8f1d2c]">
          Local Life
        </Link>
        {article.category && (
          <>
            <span>/</span>
            <Link
              href={`/local-life?category=${article.category.slug}`}
              className="transition-colors hover:text-[#8f1d2c]"
            >
              {article.category.name}
            </Link>
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)] xl:items-start">
        <div className="min-w-0 space-y-0.5">
          <article className="article-card">
            <div className="article-card-header">
              <div className="article-card-header-content">
                <h1 className="article-card-header-title">{article.title}</h1>
              </div>
              <div className="article-card-header-actions">
                <span className="article-card-header-badge">Article</span>
              </div>
            </div>

            {article.featuredImageUrl ? (
              <figure className="article-card-image">
                <img
                  src={article.featuredImageUrl}
                  alt={article.title}
                  className="article-card-image-element"
                />
                <figcaption className="article-card-image-hero-caption">
                  {article.featuredImageCaption?.trim() ||
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'}
                </figcaption>
              </figure>
            ) : null}

            <div className="article-card-body">
              <p className="article-card-date">{publishedDate || 'Not published yet'}</p>
              <p className="article-card-author">
                {article.author.firstName} {article.author.lastName}
              </p>
              <div
                className="article-card-content"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            </div>

            <div className="article-card-footer">
              <span>{article.category?.name || 'Local Life'}</span>
              <div className="article-card-footer-actions">
                <Link href="/local-life" className="article-card-footer-link">
                  Back to Local Life
                </Link>
              </div>
            </div>
          </article>

          {article.status === 'PUBLISHED' && (
            <div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/82 p-0 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
              <CommentThread
                comments={article.comments || []}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                canDeleteComment={(comment) =>
                  session?.user?.id === comment.author.id ||
                  ['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '')
                }
                isAuthenticated={Boolean(session?.user)}
                canComment={canComment}
              />
            </div>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6">
          {article.tags.length > 0 && (
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#2c7f9e]">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((at) => (
                  <span
                    key={at.tag.id}
                    className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
                  >
                    #{at.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Author</p>
            <div className="mt-4 flex items-start gap-3">
              <UserAvatar
                firstName={article.author.firstName}
                lastName={article.author.lastName}
                profilePhotoUrl={article.author.profilePhotoUrl}
                trustLevel={article.author.trustLevel}
                className="h-12 w-12"
                initialsClassName="bg-white/12 text-sm text-white/78"
              />
              <div>
                <Link
                  href={`/profile/${article.author.id}`}
                  className="font-semibold text-white transition-colors hover:text-cyan-200"
                >
                  {article.author.firstName} {article.author.lastName}
                </Link>
                {article.author.bio ? (
                  <p className="mt-2 text-sm text-white/70">{article.author.bio}</p>
                ) : (
                  <p className="mt-2 text-sm text-white/50">No author bio yet.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
