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

  return (
    <div className="space-y-8">
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

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
        <div className="max-w-4xl">
          {article.category && (
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/72">
              {article.category.name}
            </p>
          )}
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/78 md:text-lg">
              {article.excerpt}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3">
            <UserAvatar
              firstName={article.author.firstName}
              lastName={article.author.lastName}
              profilePhotoUrl={article.author.profilePhotoUrl}
              trustLevel={article.author.trustLevel}
              className="h-11 w-11"
              initialsClassName="bg-white/12 text-sm text-white/78"
            />
            <div>
              <Link
                href={`/profile/${article.author.id}`}
                className="text-sm font-semibold text-white transition-colors hover:text-cyan-200"
              >
                {article.author.firstName} {article.author.lastName}
              </Link>
              {publishedDate && <p className="text-xs text-white/60">{publishedDate}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Featured image */}
      {article.featuredImageUrl && (
        <div className="overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_55px_rgba(7,17,26,0.14)]">
          <img
            src={article.featuredImageUrl}
            alt={article.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Article body */}
      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <div
          className="prose prose-lg max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[#8f1d2c]"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </section>

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.tags.map((at) => (
            <span
              key={at.tag.id}
              className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white"
            >
              #{at.tag.name}
            </span>
          ))}
        </div>
      )}

      {/* About the author */}
      {article.author.bio && (
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <h3 className="mb-2 text-sm font-semibold text-cyan-100/70">About the Author</h3>
          <div className="flex items-start gap-3">
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
              <p className="mt-1 text-sm text-white/70">{article.author.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {article.status === 'PUBLISHED' && (
        <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <CommentThread
            comments={article.comments || []}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            canDeleteComment={(comment) =>
              session?.user?.id === comment.author.id ||
              ['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role || '')
            }
            isAuthenticated={Boolean(session?.user)}
          />
        </div>
      )}

      {/* Back link */}
      <div>
        <Link
          href="/local-life"
          className="text-sm font-semibold text-[#8f1d2c] hover:underline"
        >
          &larr; Back to Local Life
        </Link>
      </div>
    </div>
  );
}
