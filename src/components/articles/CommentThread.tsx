'use client';

import React, { useState } from 'react';

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

const CommentItem: React.FC<{
  comment: ThreadComment;
  onReply: (parentId: string, body: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  canDeleteComment?: (comment: ThreadComment) => boolean;
  isAuthenticated?: boolean;
  depth: number;
}> = ({ comment, onReply, onDelete, canDeleteComment, isAuthenticated = false, depth }) => {
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
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getTrustClasses(comment.author.trustLevel)}`}>
              {comment.author.trustLevel}
            </span>
          </div>
          <time className="text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>

        <p className="text-gray-700 text-sm mb-4 whitespace-pre-wrap">{comment.body}</p>

        <div className="flex gap-3 text-xs">
          {isAuthenticated && (
            <button
              onClick={() => setShowReplyForm((value) => !value)}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Reply
            </button>
          )}
          {onDelete && canDeleteComment?.(comment) && (
            <button
              onClick={async () => {
                setError('');
                try {
                  await onDelete(comment.id);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to delete comment');
                }
              }}
              className="text-red-600 hover:text-red-900 font-medium"
            >
              Delete
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {showReplyForm && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleReplySubmit}
                disabled={isSubmitting || !replyBody.trim()}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#46A8CC' }}
              >
                {isSubmitting ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                onClick={() => setShowReplyForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
  isLoading = false,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-6">Comments</h3>

      {isAuthenticated ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#46A8CC] mb-3"
            rows={4}
            disabled={isSubmitting || isLoading}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || isLoading || !newComment.trim()}
              className="px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: '#46A8CC' }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8 text-sm text-gray-500">
          Sign in to join the discussion.
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment.</p>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={onAddComment}
            onDelete={onDeleteComment}
            canDeleteComment={canDeleteComment}
            isAuthenticated={isAuthenticated}
            depth={0}
          />
        ))
      )}
    </div>
  );
};
