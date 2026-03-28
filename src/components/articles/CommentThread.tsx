'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
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
}

function getTrustClasses(trustLevel: string) {
  switch (trustLevel) {
    case 'TRUSTED':
      return 'bg-green-100 text-green-700';
    case 'REGISTERED':
      return 'bg-red-100 text-red-700';
    case 'SUSPENDED':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function TrustedCheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#16a34a" />
      <path
        d="M5 8.2 7 10l4-4.2"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

  async function handleReplySubmit() {
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
    <div style={{ marginLeft: depth > 0 ? `${Math.min(depth * 2, 8)}rem` : 0 }}>
      <div className="relative mb-2 rounded-lg border border-gray-200 bg-white p-2 text-[12px]">
        {onDelete && canDeleteComment?.(comment) ? (
          <button
            onClick={async () => {
              setError('');
              try {
                await onDelete(comment.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete comment');
              }
            }}
            className="absolute right-2 top-2 inline-flex items-center justify-center p-0 m-0 leading-none"
            aria-label="Delete comment"
            title="Delete"
          >
            <span className="text-[17px] leading-none text-rose-700" aria-hidden="true">
              ✕
            </span>
          </button>
        ) : null}

        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-gray-900">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            {comment.author.trustLevel === 'TRUSTED' ? (
              <span className="inline-flex items-center" title="Trusted user" aria-label="Trusted user">
                <TrustedCheckIcon />
              </span>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-xs ${getTrustClasses(comment.author.trustLevel)}`}>
                {comment.author.trustLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-[5px] pr-4">
            <time className="text-[10px] text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </div>

        <p className="mb-2 text-[12px] whitespace-pre-wrap text-gray-700">{comment.body}</p>

        {isAuthenticated && canComment ? (
          <button
            onClick={() => setShowReplyForm((value) => !value)}
            className="inline-flex items-center justify-center p-0 m-0 leading-none"
            aria-label={showReplyForm ? 'Close reply form' : 'Reply'}
            title="Reply"
          >
            <span className="text-[18px] leading-none text-slate-700" aria-hidden="true">
              ↩
            </span>
          </button>
        ) : null}

        {error && (
          <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[12px] text-red-700">
            {error}
          </div>
        )}

        {showReplyForm && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="w-full rounded-lg border border-gray-300 p-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              rows={3}
            />
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={handleReplySubmit}
                disabled={isSubmitting || !replyBody.trim()}
                className="rounded-lg px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#46A8CC' }}
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                onClick={() => setShowReplyForm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {comment.childComments && comment.childComments.length > 0 && (
        <div>
          {comment.childComments.map((reply) => (
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
      )}
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
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTrustInfoDialog, setShowTrustInfoDialog] = useState(false);
  const newCommentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = newCommentRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [newComment]);

  async function handleAddComment() {
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
    <div className="rounded-lg bg-gray-50 p-3">
      <h3 className="mb-3 text-[1rem] font-bold">Comments</h3>

      {isAuthenticated && canComment ? (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-2">
          {error && (
            <div className="mb-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[12px] text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white p-2 focus-within:ring-2 focus-within:ring-[#46A8CC]">
            <textarea
              ref={newCommentRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="h-[20px] min-h-0 flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 text-[12px] leading-5 focus:outline-none"
              rows={1}
              disabled={isSubmitting || isLoading}
            />
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || isLoading || !newComment.trim()}
              className="rounded-lg px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#46A8CC' }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : isAuthenticated ? (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[12px] text-slate-700">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setShowTrustInfoDialog(true)}
              className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-semibold leading-none text-white"
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
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-2 text-[12px] text-gray-500">
          Sign in to join the discussion.
        </div>
      )}

      {showTrustInfoDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trusted-comment-dialog-title"
          onClick={() => setShowTrustInfoDialog(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-4 shadow-[0_28px_80px_rgba(2,8,23,0.55)] md:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
                  Commenting Access
                </p>
                <h2 id="trusted-comment-dialog-title" className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Trusted users only
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowTrustInfoDialog(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4 text-sm leading-6 text-slate-200">
              <p className="m-0">
                Someone in the community must vouch for you as a real member of the community
                before you can comment.
              </p>
              <p className="mt-3 mb-0">
                This helps prevent bots and other anonymous or misleading behavior, and keeps
                discussion tied to real accountable community members.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {comments.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-gray-500">No comments yet. Be the first to comment.</p>
      ) : (
        comments.map((comment) => (
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
        ))
      )}
    </div>
  );
};
