'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  trustLevel: string;
}

interface PendingArticle {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: string;
  author: Author;
  category: { id: string; name: string; slug: string } | null;
  tags: { tag: { id: string; name: string } }[];
  updatedAt: string;
}

interface PendingEvent {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDatetime: string;
  endDatetime: string | null;
  locationText: string | null;
  photoUrl: string | null;
  submittedBy: Author;
  updatedAt: string;
}

interface PendingHelpWantedPost {
  id: string;
  title: string;
  description: string;
  postingType: string;
  status: string;
  compensationText: string | null;
  locationText: string | null;
  scheduleText: string | null;
  photoUrl: string | null;
  updatedAt: string;
  author: Author;
}

interface Stats {
  pendingReview: number;
  pendingArticles: number;
  pendingEvents: number;
  pendingHelpWanted: number;
  pendingStores: number;
  publishedToday: number;
  totalPublished: number;
}

function TrustBadge({ trustLevel }: { trustLevel: string }) {
  switch (trustLevel) {
    case 'TRUSTED':
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Trusted</span>;
    case 'REGISTERED':
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Unverified</span>;
    default:
      return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{trustLevel}</span>;
  }
}

export default function ContentApprovalPage() {
  const [articles, setArticles] = useState<PendingArticle[]>([]);
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [helpWantedPosts, setHelpWantedPosts] = useState<PendingHelpWantedPost[]>([]);
  const [stats, setStats] = useState<Stats>({
    pendingReview: 0,
    pendingArticles: 0,
    pendingEvents: 0,
    pendingHelpWanted: 0,
    pendingStores: 0,
    publishedToday: 0,
    totalPublished: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedHelpWantedId, setExpandedHelpWantedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ type: 'article' | 'event' | 'helpWanted'; id: string } | null>(null);

  useEffect(() => {
    fetchPendingContent();
  }, []);

  async function fetchPendingContent() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setEvents(data.events || []);
        setHelpWantedPosts(data.helpWantedPosts || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Failed to fetch pending content:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function updateStatsAfterDecision(type: 'article' | 'event' | 'helpWanted', approved: boolean) {
    setStats((prev) => ({
      ...prev,
      pendingReview: prev.pendingReview - 1,
      pendingArticles: type === 'article' ? prev.pendingArticles - 1 : prev.pendingArticles,
      pendingEvents: type === 'event' ? prev.pendingEvents - 1 : prev.pendingEvents,
      pendingHelpWanted:
        type === 'helpWanted' ? prev.pendingHelpWanted - 1 : prev.pendingHelpWanted,
      publishedToday: approved ? prev.publishedToday + 1 : prev.publishedToday,
      totalPublished: approved ? prev.totalPublished + 1 : prev.totalPublished,
    }));
  }

  async function moderateArticle(articleId: string, approved: boolean) {
    setActionLoading(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejectionReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update article');
        return;
      }

      setArticles((prev) => prev.filter((article) => article.id !== articleId));
      updateStatsAfterDecision('article', approved);
      setRejectTarget(null);
      setRejectionReason('');
    } catch (err) {
      alert('Failed to update article');
    } finally {
      setActionLoading(null);
    }
  }

  async function moderateEvent(eventId: string, approved: boolean) {
    setActionLoading(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejectionReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update event');
        return;
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      updateStatsAfterDecision('event', approved);
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      }
      setRejectTarget(null);
      setRejectionReason('');
    } catch (err) {
      alert('Failed to update event');
    } finally {
      setActionLoading(null);
    }
  }

  async function moderateHelpWanted(postId: string, approved: boolean) {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/help-wanted/${postId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejectionReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update Help Wanted post');
        return;
      }

      setHelpWantedPosts((prev) => prev.filter((post) => post.id !== postId));
      updateStatsAfterDecision('helpWanted', approved);
      if (expandedHelpWantedId === postId) {
        setExpandedHelpWantedId(null);
      }
      setRejectTarget(null);
      setRejectionReason('');
    } catch (err) {
      alert('Failed to update Help Wanted post');
    } finally {
      setActionLoading(null);
    }
  }

  function getHelpWantedLabel(postingType: string) {
    switch (postingType) {
      case 'EMPLOYMENT':
        return 'Employment';
      case 'SERVICE_REQUEST':
        return 'Service Request';
      case 'GIG_TASK':
        return 'Gig / Task';
      default:
        return postingType;
    }
  }

  const hasPendingContent =
    articles.length > 0 || events.length > 0 || helpWantedPosts.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        Content Approval Queue
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#eab308' }}>
          <p className="text-gray-500 text-sm mb-1">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingReview}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#46A8CC' }}>
          <p className="text-gray-500 text-sm mb-1">Pending Articles</p>
          <p className="text-3xl font-bold" style={{ color: '#46A8CC' }}>{stats.pendingArticles}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#A51E30' }}>
          <p className="text-gray-500 text-sm mb-1">Pending Events</p>
          <p className="text-3xl font-bold" style={{ color: '#A51E30' }}>{stats.pendingEvents}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#0f766e' }}>
          <p className="text-gray-500 text-sm mb-1">Pending Help Wanted</p>
          <p className="text-3xl font-bold text-teal-700">{stats.pendingHelpWanted}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#7c3aed' }}>
          <p className="text-gray-500 text-sm mb-1">Pending Stores</p>
          <p className="text-3xl font-bold text-violet-700">{stats.pendingStores}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#22c55e' }}>
          <p className="text-gray-500 text-sm mb-1">Published Today</p>
          <p className="text-3xl font-bold text-green-600">{stats.publishedToday}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4" style={{ borderColor: '#6b7280' }}>
          <p className="text-gray-500 text-sm mb-1">Total Published</p>
          <p className="text-3xl font-bold text-gray-700">{stats.totalPublished}</p>
        </div>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-violet-900">Store moderation has moved</p>
          <p className="text-sm text-violet-800">
            Review, approve, reject, and suspend storefronts from the dedicated store-management page.
          </p>
        </div>
        <Link
          href="/admin/stores"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold"
        >
          Open Store Management
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 py-12">Loading approval queue...</div>
      ) : !hasPendingContent ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">All caught up!</h2>
          <p className="text-gray-500">No articles, events, or Help Wanted posts are waiting for review right now.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Articles</h2>
              <span className="text-sm text-gray-500">{articles.length} pending</span>
            </div>
            {articles.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-500">No articles pending review.</div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => {
                  const isExpanded = expandedArticleId === article.id;
                  const isProcessing = actionLoading === article.id;

                  return (
                    <div key={article.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {article.category && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#46A8CC' }}>
                                  {article.category.name}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                Submitted {new Date(article.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{article.title}</h3>
                            {article.excerpt && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{article.excerpt}</p>}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium">{article.author.firstName} {article.author.lastName}</span>
                              <TrustBadge trustLevel={article.author.trustLevel} />
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                            >
                              {isExpanded ? 'Collapse' : 'Review'}
                            </button>
                            <button
                              onClick={() => moderateArticle(article.id, true)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              {isProcessing ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectTarget({ type: 'article', id: article.id })}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                          <h4 className="text-sm font-semibold text-gray-600 mb-3">Article Content Preview:</h4>
                          <div className="bg-white rounded-lg p-4 border border-gray-200 prose prose-sm max-w-none max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: article.body }} />
                          {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {article.tags.map((at) => (
                                <span key={at.tag.id} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                  #{at.tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Events</h2>
              <span className="text-sm text-gray-500">{events.length} pending</span>
            </div>
            {events.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-500">No events pending review.</div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => {
                  const isExpanded = expandedEventId === event.id;
                  const isProcessing = actionLoading === event.id;

                  return (
                    <div key={event.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: '#A51E30' }}>
                                Event
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(event.startDatetime).toLocaleString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{event.title}</h3>
                            {event.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{event.description}</p>}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium">{event.submittedBy.firstName} {event.submittedBy.lastName}</span>
                              <TrustBadge trustLevel={event.submittedBy.trustLevel} />
                              {event.locationText && <span>• {event.locationText}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                            >
                              {isExpanded ? 'Collapse' : 'Review'}
                            </button>
                            <button
                              onClick={() => moderateEvent(event.id, true)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              {isProcessing ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectTarget({ type: 'event', id: event.id })}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                          {event.photoUrl && (
                            <img
                              src={event.photoUrl}
                              alt={event.title}
                              className="w-full max-h-80 object-cover rounded-lg mb-4"
                            />
                          )}
                          <div className="grid gap-3 text-sm text-gray-600">
                            <p><span className="font-semibold text-gray-800">Starts:</span> {new Date(event.startDatetime).toLocaleString()}</p>
                            {event.endDatetime && <p><span className="font-semibold text-gray-800">Ends:</span> {new Date(event.endDatetime).toLocaleString()}</p>}
                            {event.locationText && <p><span className="font-semibold text-gray-800">Location:</span> {event.locationText}</p>}
                            {event.description && <p>{event.description}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Help Wanted</h2>
              <span className="text-sm text-gray-500">{helpWantedPosts.length} pending</span>
            </div>
            {helpWantedPosts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-500">No Help Wanted posts pending review.</div>
            ) : (
              <div className="space-y-4">
                {helpWantedPosts.map((post) => {
                  const isExpanded = expandedHelpWantedId === post.id;
                  const isProcessing = actionLoading === post.id;

                  return (
                    <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-teal-700">
                                {getHelpWantedLabel(post.postingType)}
                              </span>
                              <span className="text-xs text-gray-400">
                                Submitted {new Date(post.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{post.title}</h3>
                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">{post.description}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                              <span className="font-medium">{post.author.firstName} {post.author.lastName}</span>
                              <TrustBadge trustLevel={post.author.trustLevel} />
                              {post.locationText && <span>• {post.locationText}</span>}
                              {post.compensationText && <span>• {post.compensationText}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedHelpWantedId(isExpanded ? null : post.id)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                            >
                              {isExpanded ? 'Collapse' : 'Review'}
                            </button>
                            <button
                              onClick={() => moderateHelpWanted(post.id, true)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              {isProcessing ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectTarget({ type: 'helpWanted', id: post.id })}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                          {post.photoUrl && (
                            <img
                              src={post.photoUrl}
                              alt={post.title}
                              className="w-full max-h-80 object-cover rounded-lg mb-4"
                            />
                          )}
                          <div className="grid gap-3 text-sm text-gray-600">
                            <p><span className="font-semibold text-gray-800">Type:</span> {getHelpWantedLabel(post.postingType)}</p>
                            {post.locationText && <p><span className="font-semibold text-gray-800">Location:</span> {post.locationText}</p>}
                            {post.scheduleText && <p><span className="font-semibold text-gray-800">Schedule:</span> {post.scheduleText}</p>}
                            {post.compensationText && <p><span className="font-semibold text-gray-800">Compensation:</span> {post.compensationText}</p>}
                            <p>{post.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              Reject {rejectTarget.type === 'article' ? 'Article' : rejectTarget.type === 'event' ? 'Event' : 'Help Wanted Post'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {rejectTarget.type === 'article'
                ? 'The article will be returned to DRAFT so the author can revise and resubmit.'
                : rejectTarget.type === 'event'
                  ? 'The event will be moved to UNPUBLISHED. The author can edit it and submit it for review again.'
                  : 'The Help Wanted post will be marked REJECTED. The author can revise it and resubmit for review.'}
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
              placeholder="Optional feedback for the author"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  rejectTarget.type === 'article'
                    ? moderateArticle(rejectTarget.id, false)
                    : rejectTarget.type === 'event'
                      ? moderateEvent(rejectTarget.id, false)
                      : moderateHelpWanted(rejectTarget.id, false)
                }
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
