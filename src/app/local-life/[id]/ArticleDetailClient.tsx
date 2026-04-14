/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { CommentThread, type ThreadComment } from '@/components/articles/CommentThread';
import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';

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

interface ArticleDetailClientProps {
  articleId: string;
}

export default function ArticleDetailClient({ articleId }: ArticleDetailClientProps) {
  const { data: session } = useSession();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      setIsLoading(true);
      setNotFound(false);

      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
        } else if (res.status === 404) {
          setArticle(null);
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch article:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (articleId) {
      fetchArticle();
    }
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

  async function handleShare() {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy article URL:', error);
      setShareMessage('Unable to copy URL');
    }
  }

  useEffect(() => {
    if (!shareMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareMessage(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [shareMessage]);

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

  const showStatusBanner = article.status !== 'PUBLISHED';
  const viewerTrustLevel = session?.user?.trust_level || '';
  const canComment = viewerTrustLevel === 'TRUSTED';
  const imageUrl = getArticleUiImageUrl(article.featuredImageUrl);
  const isEditorialArticle = /editorial-(dropcap|pullquote|recipe-card|note-box)/.test(
    article.body || ''
  );

  return (
    <div className="space-y-4">
      {showStatusBanner && (
        <div
          className={`rounded-2xl p-3 text-sm font-medium ${
            article.status === 'DRAFT'
              ? 'bg-gray-100 text-gray-700'
              : article.status === 'PENDING_REVIEW'
                ? 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {article.status === 'DRAFT' && 'This article is a draft and is only visible to you.'}
          {article.status === 'PENDING_REVIEW' && 'This article is pending editor review.'}
          {article.status === 'UNPUBLISHED' && 'This article has been unpublished.'}
        </div>
      )}

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
          {isEditorialArticle ? (
            <article className="editorial-article-surface overflow-hidden p-6 md:p-8">
              <div className="editorial-article-shell">
                <header className="editorial-article-header">
                  <p className="editorial-article-kicker">{article.category?.name || 'Local Life'}</p>
                  <h1 className="editorial-article-title">{article.title}</h1>
                  {article.excerpt?.trim() ? (
                    <p className="editorial-article-dek">{article.excerpt.trim()}</p>
                  ) : null}
                  <div className="editorial-article-meta">
                    <span>
                      {article.author.firstName} {article.author.lastName}
                    </span>
                    <span>{publishedDate || 'Not published yet'}</span>
                  </div>
                </header>

                {imageUrl ? (
                  <figure className="editorial-article-image article-detail-editorial-hero">
                    <img src={imageUrl} alt={article.title} />
                    {article.featuredImageCaption?.trim() ? (
                      <figcaption className="editorial-article-image-caption">
                        {article.featuredImageCaption.trim()}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}

                <div
                  className="article-card-content article-detail-content editorial-article-body mt-8"
                  dangerouslySetInnerHTML={{ __html: article.body }}
                />

                <div className="article-card-footer mt-8 border-t border-[color:var(--surface-border)] pt-4">
                  <span>{article.category?.name || 'Local Life'}</span>
                  <div className="article-card-footer-actions">
                    <Link href="/local-life" className="article-card-footer-link">
                      Back to Local Life
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <article className="article-card">
              <div className="article-card-header">
                <div className="article-detail-main-column article-card-header-shell">
                  <div className="article-card-header-content">
                    <h1 className="article-card-header-title">{article.title}</h1>
                  </div>
                  <div className="article-card-header-actions">
                    <span className="article-card-header-badge">Article</span>
                  </div>
                </div>
              </div>

              <figure className="article-card-image article-detail-hero">
                {imageUrl ? (
                  <div className="article-detail-hero-media">
                    <img
                      src={imageUrl}
                      alt={article.title}
                      className="article-card-image-element"
                    />
                    <div className="article-detail-hero-overlay">
                      {article.featuredImageCaption?.trim() ? (
                        <p className="article-detail-hero-caption">{article.featuredImageCaption.trim()}</p>
                      ) : null}
                      <p className="article-detail-hero-eyebrow">{article.category?.name || 'Local Life'}</p>
                      <p className="article-detail-hero-meta">
                        {article.author.firstName} {article.author.lastName}
                        {publishedDate ? ` • ${publishedDate}` : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="article-card-image-placeholder min-h-[18rem] rounded-none border-x-0 border-t-0 px-6 py-10">
                    <div>
                      <p className="article-card-image-placeholder-label text-xs font-semibold uppercase tracking-[0.28em]">
                        {article.category?.name || 'Local Life'}
                      </p>
                    </div>
                  </div>
                )}
              </figure>

              <div className="article-card-body">
                <div className="article-detail-main-column">
                  <div
                    className="article-card-content article-detail-content"
                    dangerouslySetInnerHTML={{ __html: article.body }}
                  />
                </div>
              </div>

              <div className="article-card-footer">
                <div className="article-detail-main-column article-card-footer-shell">
                  <span>{article.category?.name || 'Local Life'}</span>
                  <div className="article-card-footer-actions">
                    <Link href="/local-life" className="article-card-footer-link">
                      Back to Local Life
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )}

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
          <div className="article-detail-aside-card rounded-[26px] p-5">
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <span
                className={`text-xs text-slate-500 transition-opacity duration-500 ${
                  shareMessage ? 'opacity-100' : 'opacity-0'
                }`}
                aria-live="polite"
              >
                {shareMessage ?? 'URL copied to clipboard'}
              </span>
            </div>
            <p className="article-detail-aside-label text-xs font-semibold uppercase tracking-[0.28em]">Author</p>
            <div className="mt-4 flex items-start gap-3">
              <UserAvatar
                firstName={article.author.firstName}
                lastName={article.author.lastName}
                profilePhotoUrl={article.author.profilePhotoUrl}
                trustLevel={article.author.trustLevel}
                className="h-12 w-12"
                initialsClassName="bg-black/10 text-sm text-current dark:bg-white/12"
              />
              <div>
                <Link
                  href={`/profile/${article.author.id}`}
                  className="article-detail-aside-link font-semibold"
                >
                  {article.author.firstName} {article.author.lastName}
                </Link>
                {article.author.bio ? (
                  <p className="article-detail-aside-text mt-2 text-sm">{article.author.bio}</p>
                ) : (
                  <p className="article-detail-aside-text-muted mt-2 text-sm">No author bio yet.</p>
                )}
              </div>
            </div>
          </div>

          {article.tags.length > 0 && (
            <div className="article-detail-aside-card rounded-[26px] p-5">
              <p className="article-detail-aside-label text-xs font-semibold uppercase tracking-[0.28em]">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {article.tags.map((at) => (
                  <span
                    key={at.tag.id}
                    className="article-detail-tag rounded-full px-3 py-1 text-xs font-medium"
                  >
                    #{at.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
