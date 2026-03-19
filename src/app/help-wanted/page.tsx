'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

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
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
        <div>
          <h1 className="text-2xl font-bold">Help Wanted</h1>
          <p className="text-sm text-gray-500 mt-1">
            Local jobs, service requests, and short-term tasks routed through trusted community messaging.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isTrusted ? (
            <Link
              href="/help-wanted/manage"
              className="px-4 py-2 bg-white text-gray-700 text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition"
            >
              My Posts
            </Link>
          ) : null}
          {isTrusted ? (
            <Link
              href="/help-wanted/submit"
              className="px-4 py-2 text-white text-sm font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
            >
              + Post Opportunity
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setShowResolved((current) => !current)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showResolved ? 'text-white' : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
            style={showResolved ? { backgroundColor: '#A51E30' } : {}}
          >
            {showResolved ? 'Showing Filled / Closed' : 'Show Resolved Too'}
          </button>
        </div>
      </div>

      {sessionStatus === 'authenticated' && !isTrusted ? (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl px-4 py-3 text-sm">
          Trusted membership is required to post or respond to Help Wanted opportunities. You can still browse public openings while you complete the trust flow.
        </div>
      ) : null}

      {sessionStatus !== 'authenticated' ? (
        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-3 text-sm">
          Public browsing is open. Sign in with a trusted account to post opportunities or respond through platform messaging after moderation.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Open Now</p>
          <p className="text-3xl font-bold text-gray-900">{openPosts}</p>
          <p className="text-sm text-gray-500 mt-2">Published opportunities currently accepting responses.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Recently Resolved</p>
          <p className="text-3xl font-bold text-gray-900">{filledPosts + closedPosts}</p>
          <p className="text-sm text-gray-500 mt-2">Filled or closed posts stay visible when resolved listings are shown.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">How It Works</p>
          <p className="text-sm text-gray-700">
            Trusted posters submit opportunities, staff review them, and trusted responders contact posters through Highlander Today messages.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            placeholder="Search opportunities, locations, schedules, or names"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedType === 'ALL' ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={selectedType === 'ALL' ? { backgroundColor: '#46A8CC' } : {}}
            >
              All
            </button>
            {Object.entries(POSTING_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedType(value as HelpWantedPost['postingType'])}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedType === value ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedType === value ? { backgroundColor: '#46A8CC' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
          Loading opportunities...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No matching opportunities yet</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Help Wanted posts will appear here after editor review. Try a different filter, or post the first one if you are trusted.
          </p>
          {isTrusted ? (
            <Link
              href="/help-wanted/submit"
              className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
              style={{ backgroundColor: '#A51E30' }}
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
              className="group block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4"
              style={{ borderColor: '#A51E30' }}
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
                    <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-teal-700">
                      {POSTING_TYPE_LABELS[post.postingType]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-xl font-bold group-hover:text-[#46A8CC] transition-colors">
                      {post.title}
                    </h2>
                  </div>

                  <p className="text-gray-500 text-sm mb-3 line-clamp-3">{post.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {post.locationText ? <span>{post.locationText}</span> : null}
                    {post.scheduleText ? <span>{post.scheduleText}</span> : null}
                    {post.compensationText ? <span>{post.compensationText}</span> : null}
                    <span>
                      {post.author.firstName} {post.author.lastName}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-medium text-[#A51E30] group-hover:underline">
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
