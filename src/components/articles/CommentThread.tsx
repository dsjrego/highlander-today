'use client';

import React, { useId, useMemo, useRef, useState } from 'react';
import UserAvatar from '@/components/shared/UserAvatar';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';

interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  trustLevel: string;
}

export interface ThreadComment {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  childComments?: ThreadComment[];
}

interface CommentThreadProps {
  comments: ThreadComment[];
  onAddComment: (parentId: string | null, body: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  canDeleteComment?: (comment: ThreadComment) => boolean;
  isAuthenticated?: boolean;
  canComment?: boolean;
  isLoading?: boolean;
  currentUserName?: string;
  currentUserTrustLevel?: string;
  currentUserSubtitle?: string;
}

type SortOrder = 'oldest' | 'recent';

function formatRelativeTime(dateString: string) {
  const target = new Date(dateString).getTime();
  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

function countComments(comments: ThreadComment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countComments(comment.childComments ?? []),
    0
  );
}

function sortComments(comments: ThreadComment[], sort: SortOrder): ThreadComment[] {
  const sorted = [...comments].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === 'recent' ? bTime - aTime : aTime - bTime;
  });

  return sorted.map((comment) => ({
    ...comment,
    childComments: sortComments(comment.childComments ?? [], sort),
  }));
}

function trustSubtitle(trustLevel?: string) {
  if (trustLevel === 'TRUSTED') {
    return 'trusted community member';
  }
  if (trustLevel === 'REGISTERED') {
    return 'registered community member';
  }
  return 'community member';
}

const CommentItem: React.FC<{
  comment: ThreadComment;
  onReply: (parentId: string, body: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  canDeleteComment?: (comment: ThreadComment) => boolean;
  isAuthenticated?: boolean;
  canComment?: boolean;
  depth: number;
}> = ({ comment, onReply, onDelete, canDeleteComment, isAuthenticated = false, canComment = false, depth }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyBody.trim()) return;

    setError('');
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyBody);
      setReplyBody('');
      setShowReplyForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ marginLeft: depth > 0 ? '48px' : 0 }}>
      <article className="border-t border-[var(--surface-border)] py-5">
        <div className="flex items-start gap-3">
          <UserAvatar
            firstName={comment.author.firstName}
            lastName={comment.author.lastName}
            profilePhotoUrl={comment.author.profilePhotoUrl}
            trustLevel={comment.author.trustLevel}
            className="h-9 w-9"
            initialsClassName="text-[11px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5">
              <span className="font-semibold text-[var(--page-title)]">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <time className="text-xs text-slate-500">{formatRelativeTime(comment.createdAt)}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{comment.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
              {isAuthenticated && canComment ? (
                <button
                  type="button"
                  onClick={() => setShowReplyForm((value) => !value)}
                  className="transition hover:text-[var(--brand-primary)]"
                >
                  Reply
                </button>
              ) : null}
              {onDelete && canDeleteComment?.(comment) ? (
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    try {
                      await onDelete(comment.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to delete comment');
                    }
                  }}
                  className="transition hover:text-[var(--brand-accent)]"
                >
                  Delete
                </button>
              ) : null}
            </div>

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {showReplyForm ? (
              <form
                onSubmit={handleReplySubmit}
                className="mt-4 rounded-[var(--radius-card)] border border-[var(--rule-strong)] bg-white p-4 shadow-[var(--surface-shadow)]"
              >
                <textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write a reply..."
                  className="block min-h-[96px] w-full resize-y rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-2)] px-4 py-3 text-[16px] leading-[1.5] text-[var(--page-title)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:bg-white"
                />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReplyForm(false)}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyBody.trim() || isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Posting...' : 'Post reply'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      </article>

      {(comment.childComments ?? []).map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          onReply={onReply}
          onDelete={onDelete}
          canDeleteComment={canDeleteComment}
          isAuthenticated={isAuthenticated}
          canComment={canComment}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  onAddComment,
  onDeleteComment,
  canDeleteComment,
  isAuthenticated = false,
  canComment = false,
  isLoading = false,
  currentUserName = 'You',
  currentUserTrustLevel,
  currentUserSubtitle,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTrustInfoDialog, setShowTrustInfoDialog] = useState(false);
  const [sort, setSort] = useState<SortOrder>('recent');
  const trustDialogTitleId = useId();
  const trustDialogDescriptionId = useId();
  const trustDialogRef = useRef<HTMLDivElement | null>(null);
  const trustDialogCloseRef = useRef<HTMLButtonElement | null>(null);

  useDialogAccessibility({
    isOpen: showTrustInfoDialog,
    onClose: () => setShowTrustInfoDialog(false),
    containerRef: trustDialogRef,
    initialFocusRef: trustDialogCloseRef,
  });

  const totalComments = useMemo(() => countComments(comments), [comments]);
  const visibleComments = useMemo(() => sortComments(comments, sort), [comments, sort]);

  async function handleAddComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newComment.trim()) return;

    setError('');
    setIsSubmitting(true);
    try {
      await onAddComment(null, newComment);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="comments" className="mt-10 border-t-2 border-[var(--page-title)] pt-6">
      <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 font-serif text-[26px] font-black text-[var(--page-title)]">
          Comments
          <span className="ml-2 text-[16px] font-normal text-slate-500">{totalComments}</span>
        </h2>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOrder)}
            className="rounded-lg border border-[var(--rule-strong)] bg-white px-3 py-2 text-sm text-[var(--page-title)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)]"
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {isAuthenticated && canComment ? (
        <form
          onSubmit={handleAddComment}
          className="mb-7 rounded-[var(--radius-card)] border border-[var(--rule-strong)] bg-white p-[14px] shadow-[var(--surface-shadow)]"
        >
          <div className="mb-[10px] flex items-center gap-[10px] text-[14px]">
            <UserAvatar
              firstName={currentUserName.split(' ')[0] || 'Y'}
              lastName={currentUserName.split(' ').slice(1).join(' ') || 'U'}
              trustLevel={currentUserTrustLevel}
              className="h-8 w-8"
              initialsClassName="text-[11px]"
            />
            <div className="min-w-0">
              <span className="font-semibold text-[var(--page-title)]">Posting as {currentUserName}</span>
              <span className="text-slate-500">
                {' '}
                · {currentUserSubtitle || trustSubtitle(currentUserTrustLevel)}
              </span>
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <label className="mb-2 block text-sm font-semibold text-[var(--page-title)]">
            Add a comment
          </label>
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Share a thought. Please be kind and keep it on-topic."
            className="block min-h-[96px] w-full resize-y rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-2)] px-[14px] py-3 text-[16px] leading-[1.5] text-[var(--page-title)] focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:bg-white"
            disabled={isSubmitting || isLoading}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-slate-500">
              Be respectful.{' '}
              <Linkish />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewComment('')}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || !newComment.trim()}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Posting...' : 'Post comment'}
              </button>
            </div>
          </div>
        </form>
      ) : isAuthenticated ? (
        <div className="mb-7 rounded-[var(--radius-card)] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setShowTrustInfoDialog(true)}
              className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold leading-none text-white"
              aria-label="Why trusted users only can comment"
              title="Why trusted users only can comment"
            >
              i
            </button>
            <div>
              <p className="m-0 font-medium text-sky-900">You must be a trusted user to comment.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-7 rounded-[var(--radius-card)] border border-[var(--rule-strong)] bg-white px-4 py-3 text-sm text-slate-600 shadow-[var(--surface-shadow)]">
          Sign in to join the discussion.
        </div>
      )}

      {showTrustInfoDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={trustDialogTitleId}
          aria-describedby={trustDialogDescriptionId}
          onClick={() => setShowTrustInfoDialog(false)}
        >
          <div
            ref={trustDialogRef}
            className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-4 shadow-[0_28px_80px_rgba(2,8,23,0.55)] md:p-5"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
                  Commenting Access
                </p>
                <h2 id={trustDialogTitleId} className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Trusted users only
                </h2>
              </div>
              <button
                ref={trustDialogCloseRef}
                type="button"
                onClick={() => setShowTrustInfoDialog(false)}
                className="btn btn-ghost border-white/15 text-white hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <div
              id={trustDialogDescriptionId}
              className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-slate-200"
            >
              <p className="m-0">
                Someone in the community must vouch for you as a real member of the community
                before you can comment.
              </p>
              <p className="mb-0 mt-3">
                This helps prevent bots and other anonymous or misleading behavior, and keeps
                discussion tied to real accountable community members.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {visibleComments.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--rule-strong)] bg-white px-4 py-5 text-center text-sm text-slate-500 shadow-[var(--surface-shadow)]">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div>
          {visibleComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={onAddComment}
              onDelete={onDeleteComment}
              canDeleteComment={canDeleteComment}
              isAuthenticated={isAuthenticated}
              canComment={canComment}
              depth={0}
            />
          ))}
        </div>
      )}
    </section>
  );
};

function Linkish() {
  return (
    <a
      href="/guidelines"
      className="text-[var(--brand-primary)] underline underline-offset-2 transition hover:text-[var(--brand-accent)]"
    >
      Community guidelines
    </a>
  );
}
