/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, Printer, Share2 } from 'lucide-react';
import { CommentThread, type ThreadComment } from '@/components/articles/CommentThread';
import UserAvatar from '@/components/shared/UserAvatar';
import { getArticleUiImageUrl } from '@/lib/article-images';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import type { ContentReactionType } from '@/lib/analytics/types';

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
  currentUserReaction: ContentReactionType | null;
}

interface ArticleDetailClientProps {
  articleId: string;
}

const TEXT_SIZES = [16, 18, 20, 22] as const;
const REACTION_OPTIONS: Array<{ value: ContentReactionType; label: string }> = [
  { value: 'useful', label: 'Useful' },
  { value: 'important', label: 'Important' },
  { value: 'interesting', label: 'Interesting' },
  { value: 'needs_follow_up', label: 'Needs Follow-Up' },
];

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateReadMinutes(html: string) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function countComments(comments: ThreadComment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.childComments ?? []),
    0
  );
}

export default function ArticleDetailClient({ articleId }: ArticleDetailClientProps) {
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; name?: string | null; role?: string; trust_level?: string }
    | undefined;

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [textSizeIndex, setTextSizeIndex] = useState(1);
  const [reactionStatus, setReactionStatus] = useState<string | null>(null);
  const [isSavingReaction, setIsSavingReaction] = useState(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedArticles = JSON.parse(window.localStorage.getItem('saved-articles') ?? '[]') as string[];
    setIsSaved(savedArticles.includes(articleId));
  }, [articleId]);

  useEffect(() => {
    if (!shareMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareMessage(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [shareMessage]);

  useEffect(() => {
    if (!reactionStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReactionStatus(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [reactionStatus]);

  useEffect(() => {
    if (!article || article.status !== 'PUBLISHED') {
      return;
    }

    trackAnalyticsEvent({
      eventName: 'page_view',
      contentType: 'ARTICLE',
      contentId: article.id,
      pageType: 'article-detail',
    });
    trackAnalyticsEvent({
      eventName: 'content_open',
      contentType: 'ARTICLE',
      contentId: article.id,
      pageType: 'article-detail',
      metadata: {
        categorySlug: article.category?.slug ?? null,
      },
    });
  }, [article?.id, article?.status, article?.category?.slug]);

  useEffect(() => {
    if (!article || article.status !== 'PUBLISHED' || typeof window === 'undefined') {
      return;
    }

    const trackedArticleId = article.id;
    const milestones = [25, 50, 75, 100];
    const reached = new Set<number>();

    function handleScroll() {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        return;
      }

      const depth = Math.min(100, Math.round((window.scrollY / maxScroll) * 100));

      for (const milestone of milestones) {
        if (depth >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          trackAnalyticsEvent({
            eventName: 'scroll_depth_reached',
            contentType: 'ARTICLE',
            contentId: trackedArticleId,
            pageType: 'article-detail',
            metadata: { percent: milestone },
          });
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [article?.id, article?.status]);

  useEffect(() => {
    if (!article || article.status !== 'PUBLISHED' || typeof window === 'undefined') {
      return;
    }

    let pingCount = 0;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      pingCount += 1;
      trackAnalyticsEvent({
        eventName: 'engaged_time_ping',
        contentType: 'ARTICLE',
        contentId: article.id,
        pageType: 'article-detail',
        metadata: {
          engagedSeconds: pingCount * 15,
        },
      });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [article?.id, article?.status]);

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
      trackAnalyticsEvent({
        eventName: 'share_clicked',
        contentType: 'ARTICLE',
        contentId: articleId,
        pageType: 'article-detail',
      });
      trackAnalyticsEvent({
        eventName: 'copy_link_clicked',
        contentType: 'ARTICLE',
        contentId: articleId,
        pageType: 'article-detail',
      });
      setShareMessage('Link copied');
    } catch (error) {
      console.error('Failed to copy article URL:', error);
      setShareMessage('Unable to copy');
    }
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      trackAnalyticsEvent({
        eventName: 'cta_clicked',
        contentType: 'ARTICLE',
        contentId: articleId,
        pageType: 'article-detail',
        metadata: { cta: 'print' },
      });
      window.print();
    }
  }

  function handleToggleSave() {
    if (typeof window === 'undefined') {
      return;
    }

    const savedArticles = new Set(
      JSON.parse(window.localStorage.getItem('saved-articles') ?? '[]') as string[]
    );

    if (savedArticles.has(articleId)) {
      savedArticles.delete(articleId);
      setIsSaved(false);
      setShareMessage('Removed from saved');
    } else {
      savedArticles.add(articleId);
      setIsSaved(true);
      setShareMessage('Saved for later');
    }

    window.localStorage.setItem('saved-articles', JSON.stringify(Array.from(savedArticles)));
  }

  async function handleReaction(nextReaction: ContentReactionType) {
    if (!article || !sessionUser?.id || isSavingReaction) {
      return;
    }

    setIsSavingReaction(true);

    try {
      const removing = article.currentUserReaction === nextReaction;
      const response = await fetch(
        removing
          ? `/api/reactions?contentType=ARTICLE&contentId=${article.id}`
          : '/api/reactions',
        {
          method: removing ? 'DELETE' : 'PUT',
          headers: removing ? undefined : { 'Content-Type': 'application/json' },
          body: removing
            ? undefined
            : JSON.stringify({
                contentType: 'ARTICLE',
                contentId: article.id,
                reactionType: nextReaction,
              }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save reaction');
      }

      setArticle((previous) =>
        previous
          ? {
              ...previous,
              currentUserReaction: removing ? null : nextReaction,
            }
          : previous
      );
      setReactionStatus(removing ? 'Reaction removed' : 'Reaction saved');
    } catch (error) {
      console.error('Failed to save article reaction:', error);
      setReactionStatus('Unable to save reaction');
    } finally {
      setIsSavingReaction(false);
    }
  }

  function handleCycleTextSize() {
    setTextSizeIndex((current) => (current + 1) % TEXT_SIZES.length);
  }

  const publishedDate = article?.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const showStatusBanner = article?.status !== 'PUBLISHED';
  const viewerTrustLevel = sessionUser?.trust_level || '';
  const canComment = viewerTrustLevel === 'TRUSTED';
  const imageUrl = getArticleUiImageUrl(article?.featuredImageUrl ?? null);
  const readMinutes = useMemo(() => (article ? estimateReadMinutes(article.body) : 1), [article]);
  const totalComments = useMemo(() => countComments(article?.comments ?? []), [article?.comments]);
  const readingSize = TEXT_SIZES[textSizeIndex];
  const currentUserName = sessionUser?.name?.trim() || 'You';
  const currentUserSubtitle = canComment ? 'trusted community member' : 'signed-in community member';

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[820px] rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading article...
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-[820px] rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] py-20 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
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

  return (
    <div className="mx-auto max-w-[820px] space-y-8 px-5">
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

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/local-life" className="transition-colors hover:text-[var(--brand-accent)]">
            Home
          </Link>
          <span>/</span>
          <Link href="/local-life" className="transition-colors hover:text-[var(--brand-accent)]">
            Local Life
          </Link>
          <span>/</span>
          <span className="text-slate-700">{article.title}</span>
        </div>

        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-accent)]">
            {article.category?.name || 'Local Life'}
            <span className="mx-2 text-slate-400">•</span>
            Feature
          </p>

          <div className="space-y-4 border-b border-[var(--surface-border)] pb-4">
            <h1 className="font-serif text-[clamp(2.75rem,6vw,4rem)] font-black leading-[0.94] tracking-[-0.055em] text-[var(--page-title)]">
              {article.title}
            </h1>
            {article.excerpt?.trim() ? (
              <p className="max-w-4xl text-[clamp(1.25rem,2vw,1.55rem)] leading-[1.35] text-slate-600">
                {article.excerpt.trim()}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-[14px] border-y border-[var(--rule-strong)] py-[14px]">
            <UserAvatar
              firstName={article.author.firstName}
              lastName={article.author.lastName}
              profilePhotoUrl={article.author.profilePhotoUrl}
              trustLevel={article.author.trustLevel}
              className="h-10 w-10"
              initialsClassName="text-sm"
            />
            <div className="text-[14px] leading-[1.35]">
              <div className="font-bold text-[var(--page-title)]">
                By{' '}
                <Link
                  href={`/profile/${article.author.id}`}
                  className="text-[var(--brand-primary)] no-underline transition hover:text-[var(--brand-accent)]"
                >
                  {article.author.firstName} {article.author.lastName}
                </Link>
              </div>
              <div className="text-slate-500">
                Published {publishedDate || 'Not published yet'} · {readMinutes} min read · {totalComments} comments
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSave}
                aria-pressed={isSaved}
                aria-label={isSaved ? 'Remove article from saved items' : 'Save article for later'}
                className="btn btn-ghost text-sm"
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Copy article link"
                className="btn btn-ghost text-sm"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={handlePrint}
                aria-label="Print article"
                className="btn btn-ghost text-sm"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleCycleTextSize}
                aria-label={`Increase reading text size. Current size ${readingSize} pixels`}
                className="btn btn-ghost px-4 text-sm"
              >
                A+
              </button>
            </div>
            <span className="min-w-[4.5rem] text-right text-xs text-slate-500" aria-live="polite">
              {shareMessage ?? ''}
            </span>
          </div>
        </div>
      </div>

      <article className="space-y-6">
        <figure className="overflow-hidden rounded-[12px] border border-[var(--surface-border)] bg-white shadow-[var(--surface-shadow)]">
          {imageUrl ? (
            <img src={imageUrl} alt={article.title} className="block w-full" />
          ) : (
            <div className="article-card-image-placeholder min-h-[20rem] rounded-none border-x-0 border-y-0 px-6 py-10">
              <div>
                <p className="article-card-image-placeholder-copy">Portrait image placeholder</p>
              </div>
            </div>
          )}
          {article.featuredImageCaption?.trim() ? (
            <figcaption className="border-t border-[var(--surface-border)] px-4 py-3 text-sm leading-6 text-slate-500">
              {article.featuredImageCaption.trim()}
            </figcaption>
          ) : null}
        </figure>

        <div
          className={`article-card-content article-reading-content ${!article.body.includes('editorial-') ? 'article-reading-dropcap' : 'editorial-article-body'}`}
          style={{ ['--article-reading-size' as string]: `${readingSize}px` }}
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-[var(--surface-border)] pt-4">
            {article.tags.map((at) => (
              <span
                key={at.tag.id}
                className="rounded-full border border-[var(--surface-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              >
                {at.tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {article.status === 'PUBLISHED' ? (
          <div className="rounded-[16px] border border-[var(--surface-border)] bg-white px-4 py-4 shadow-[var(--surface-shadow)]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[12rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reaction
                </p>
                <p className="text-sm text-slate-700">How should the newsroom treat this piece?</p>
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                {REACTION_OPTIONS.map((option) => {
                  const isActive = article.currentUserReaction === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => void handleReaction(option.value)}
                      disabled={!sessionUser?.id || isSavingReaction}
                      aria-pressed={isActive}
                      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[var(--brand-accent)] bg-[var(--article-card-badge-bg)] text-[var(--brand-primary)]'
                          : 'border-[var(--surface-border)] bg-white text-slate-600 hover:border-[var(--brand-accent)] hover:text-[var(--brand-primary)]'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <span className="min-w-[8rem] text-right text-xs text-slate-500" aria-live="polite">
                {reactionStatus ?? (sessionUser?.id ? '' : 'Sign in to react')}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-4 py-1 text-sm text-slate-500">
          <Link href="/local-life" className="font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent)]">
            Back to Local Life
          </Link>
        </div>
      </article>

      {article.status === 'PUBLISHED' ? (
        <CommentThread
          comments={article.comments || []}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          canDeleteComment={(comment) =>
            sessionUser?.id === comment.author.id ||
            ['EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(sessionUser?.role || '')
          }
          isAuthenticated={Boolean(sessionUser)}
          canComment={canComment}
          currentUserName={currentUserName}
          currentUserTrustLevel={sessionUser?.trust_level}
          currentUserSubtitle={currentUserSubtitle}
        />
      ) : null}
    </div>
  );
}
