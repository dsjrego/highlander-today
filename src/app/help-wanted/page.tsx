/* eslint-disable @next/next/no-img-element */

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

interface HelpWantedPost {
  id: string;
  title: string;
  description: string;
  postingType: 'EMPLOYMENT' | 'SERVICE_REQUEST' | 'GIG_TASK';
  compensationText: string | null;
  locationText: string | null;
  scheduleText: string | null;
  photoUrl: string | null;
  status: 'PUBLISHED' | 'FILLED' | 'CLOSED';
  publishedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    trustLevel: string;
  };
}

interface HelpWantedResponse {
  posts: HelpWantedPost[];
}

const POSTING_TYPE_LABELS: Record<HelpWantedPost['postingType'], string> = {
  EMPLOYMENT: 'Employment',
  SERVICE_REQUEST: 'Service Request',
  GIG_TASK: 'Gig / Task',
};

const STATUS_STYLES: Record<HelpWantedPost['status'], string> = {
  PUBLISHED: 'bg-green-100 text-green-800',
  FILLED: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-slate-200 text-slate-800',
};

const STATUS_LABELS: Record<HelpWantedPost['status'], string> = {
  PUBLISHED: 'Open',
  FILLED: 'Filled',
  CLOSED: 'Closed',
};

export default function HelpWantedPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [posts, setPosts] = useState<HelpWantedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | HelpWantedPost['postingType']>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ limit: '100' });
        if (showResolved) {
          params.set('includeResolved', 'true');
        }

        const res = await fetch(`/api/help-wanted?${params.toString()}`);
        const data: HelpWantedResponse | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Failed to fetch Help Wanted posts');
        }

        setPosts((data as HelpWantedResponse).posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch Help Wanted posts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, [showResolved]);

  const isTrusted =
    sessionStatus === 'authenticated' &&
    (session?.user as { trust_level?: string } | undefined)?.trust_level === 'TRUSTED';

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const typeMatch = selectedType === 'ALL' || post.postingType === selectedType;
      const searchMatch =
        !normalizedSearch ||
        [
          post.title,
          post.description,
          post.locationText,
          post.scheduleText,
          post.compensationText,
          post.author.firstName,
          post.author.lastName,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));

      return typeMatch && searchMatch;
    });
  }, [posts, searchTerm, selectedType]);

  const openPosts = posts.filter((post) => post.status === 'PUBLISHED').length;
  const filledPosts = posts.filter((post) => post.status === 'FILLED').length;
  const closedPosts = posts.filter((post) => post.status === 'CLOSED').length;

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Help Wanted"
        titleClassName="text-white"
        actions={
          <>
            {isTrusted ? (
              <Link
                href="/help-wanted/manage"
                aria-label="My posts"
                title="My posts"
                className="page-header-action border-white/14 bg-white/8 text-white hover:bg-white/12"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" d="M6 5.5h8" />
                  <path strokeLinecap="round" d="M6 10h8" />
                  <path strokeLinecap="round" d="M6 14.5h8" />
                  <circle cx="3.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
                  <circle cx="3.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
                  <circle cx="3.5" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
                </svg>
                <span className="page-header-action-label">My Posts</span>
              </Link>
            ) : null}
            {isTrusted ? (
              <Link
                href="/help-wanted/submit"
                aria-label="Post opportunity"
                title="Post opportunity"
                className="page-header-action border-white bg-white text-slate-950 hover:opacity-90"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3.25v9.5M3.25 8h9.5" />
                </svg>
                <span className="page-header-action-label">Post Opportunity</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setShowResolved((current) => !current)}
              aria-label={showResolved ? 'Showing filled / closed' : 'Show resolved too'}
              title={showResolved ? 'Showing filled / closed' : 'Show resolved too'}
              className={`page-header-action ${
                showResolved
                  ? 'border-white bg-white text-slate-950'
                  : 'border-white/14 bg-white/8 text-white/80 hover:bg-white/12 hover:text-white'
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2.5 8s2.5-4 5.5-4 5.5 4 5.5 4-2.5 4-5.5 4S2.5 8 2.5 8Z" />
                <circle cx="8" cy="8" r="1.5" />
              </svg>
              <span className="page-header-action-label">{showResolved ? 'Showing Filled / Closed' : 'Show Resolved Too'}</span>
            </button>
          </>
        }
      />
      <p className="page-intro-copy max-w-3xl text-sm leading-7">
        Local jobs, service requests, and short-term tasks routed through trusted community messaging.
      </p>

      {sessionStatus === 'authenticated' && !isTrusted ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Trusted membership is required to post or respond to Help Wanted opportunities. You can still browse public openings while you complete the trust flow.
        </div>
      ) : null}

      {sessionStatus !== 'authenticated' ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Public browsing is open. Sign in with a trusted account to post opportunities or respond through platform messaging after moderation.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="marketplace-summary-tile p-5">
          <p className="marketplace-summary-label mb-1 text-sm font-semibold uppercase tracking-wide">Open Now</p>
          <p className="marketplace-summary-value text-3xl font-bold">{openPosts}</p>
          <p className="page-intro-copy mt-2 text-sm">Published opportunities currently accepting responses.</p>
        </div>
        <div className="marketplace-summary-tile marketplace-summary-tile-accent p-5">
          <p className="marketplace-summary-label mb-1 text-sm font-semibold uppercase tracking-wide">Recently Resolved</p>
          <p className="marketplace-summary-value text-3xl font-bold">{filledPosts + closedPosts}</p>
          <p className="page-intro-copy mt-2 text-sm">Filled or closed posts stay visible when resolved listings are shown.</p>
        </div>
        <div className="marketplace-summary-tile marketplace-summary-tile-deep p-5">
          <p className="marketplace-summary-label mb-1 text-sm font-semibold uppercase tracking-wide">How It Works</p>
          <p className="page-intro-copy text-sm">
            Trusted posters submit opportunities, staff review them, and trusted responders contact posters through Highlander Today messages.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/82 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Search opportunities, locations, schedules, or names"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedType === 'ALL' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {Object.entries(POSTING_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value as HelpWantedPost['postingType'])}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedType === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 p-12 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading opportunities...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="marketplace-empty-state p-12 text-center">
          <h2 className="empty-state-title mb-2">No matching opportunities yet</h2>
          <p className="empty-state-copy mx-auto mb-6 max-w-md">
            Help Wanted posts will appear here after editor review. Try a different filter, or post the first one if you are trusted.
          </p>
          {isTrusted ? (
            <Link
              href="/help-wanted/submit"
              className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
            >
              Post an Opportunity
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/help-wanted/${post.id}`}
              className="group block rounded-[26px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
            >
              <div className="flex flex-col md:flex-row gap-5">
                {post.photoUrl ? (
                  <img
                    src={post.photoUrl}
                    alt={post.title}
                    className="w-full md:w-32 h-32 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-full md:w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0">
                    🔨
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-[#0f5771] px-3 py-1 text-xs font-semibold text-white">
                      {POSTING_TYPE_LABELS[post.postingType]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-xl font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">
                      {post.title}
                    </h2>
                  </div>

                  <p className="mb-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    {post.locationText ? <span>{post.locationText}</span> : null}
                    {post.scheduleText ? <span>{post.scheduleText}</span> : null}
                    {post.compensationText ? <span>{post.compensationText}</span> : null}
                    <span>
                      {post.author.firstName} {post.author.lastName}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-[#8f1d2c] group-hover:underline">
                    View details and response rules
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
