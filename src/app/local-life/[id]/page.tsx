'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CommentThread, type ThreadComment } from '@/components/articles/CommentThread';

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  bio: string | null;
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
      <div className="flex justify-center items-center py-20">
        <div className="text-gray-500">Loading article...</div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📄</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Article Not Found</h1>
        <p className="text-gray-500 mb-6">This article may have been removed or is not yet published.</p>
        <Link
          href="/local-life"
          className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
          style={{ backgroundColor: '#A51E30' }}
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
    <div className="max-w-3xl mx-auto">
      {/* Status banner for non-published articles */}
      {showStatusBanner && (
        <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${
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
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/local-life" className="hover:text-[#A51E30] transition-colors">
          Local Life
        </Link>
        {article.category && (
          <>
            <span>/</span>
            <Link
              href={`/local-life?category=${article.category.slug}`}
              className="hover:text-[#A51E30] transition-colors"
            >
              {article.category.name}
            </Link>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
        {article.title}
      </h1>

      {/* Author + Date */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {article.author.profilePhotoUrl ? (
            <img src={article.author.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {article.author.firstName[0]}{article.author.lastName[0]}
            </span>
          )}
        </div>
        <div>
          <Link
            href={`/profile/${article.author.id}`}
            className="font-semibold text-gray-800 hover:text-[#A51E30] transition-colors text-sm"
          >
            {article.author.firstName} {article.author.lastName}
          </Link>
          {publishedDate && (
            <p className="text-xs text-gray-400">{publishedDate}</p>
          )}
        </div>
      </div>

      {/* Featured image */}
      {article.featuredImageUrl && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img
            src={article.featuredImageUrl}
            alt={article.title}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Article body */}
      <div
        className="prose prose-lg max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      {/* Tags */}
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 pt-6 border-t border-gray-200">
          {article.tags.map((at) => (
            <span
              key={at.tag.id}
              className="px-3 py-1 text-xs font-medium rounded-full text-white"
              style={{ backgroundColor: '#A51E30' }}
            >
              #{at.tag.name}
            </span>
          ))}
        </div>
      )}

      {/* About the author */}
      {article.author.bio && (
        <div className="bg-gray-50 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">About the Author</h3>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
              {article.author.profilePhotoUrl ? (
                <img src={article.author.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gray-500">
                  {article.author.firstName[0]}{article.author.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <Link
                href={`/profile/${article.author.id}`}
                className="font-semibold text-gray-800 hover:text-[#A51E30] transition-colors"
              >
                {article.author.firstName} {article.author.lastName}
              </Link>
              <p className="text-sm text-gray-500 mt-1">{article.author.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {article.status === 'PUBLISHED' && (
        <div className="border-t border-gray-200 pt-8">
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
      <div className="mt-8 pt-6 border-t border-gray-200">
        <Link
          href="/local-life"
          className="text-sm font-medium hover:underline"
          style={{ color: '#A51E30' }}
        >
          &larr; Back to Local Life
        </Link>
      </div>
    </div>
  );
}
