'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import SendMessageButton from '@/app/profile/[id]/SendMessageButton';

interface HelpWantedDetail {
  id: string;
  title: string;
  description: string;
  postingType: 'EMPLOYMENT' | 'SERVICE_REQUEST' | 'GIG_TASK';
  compensationType: string | null;
  compensationText: string | null;
  locationText: string | null;
  scheduleText: string | null;
  photoUrl: string | null;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'FILLED' | 'CLOSED' | 'REJECTED';
  publishedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    trustLevel: string;
  };
}

const POSTING_TYPE_LABELS: Record<HelpWantedDetail['postingType'], string> = {
  EMPLOYMENT: 'Employment',
  SERVICE_REQUEST: 'Service Request',
  GIG_TASK: 'Gig / Task',
};

const POSTING_TYPE_GUIDANCE: Record<HelpWantedDetail['postingType'], string> = {
  EMPLOYMENT: 'Use this for standard jobs or longer-running paid roles from businesses or organizations.',
  SERVICE_REQUEST: 'Use this for local help needed from a person, contractor, or service provider.',
  GIG_TASK: 'Use this for short, bounded work that can be completed as a one-off or limited task.',
};

export default function HelpWantedDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const { data: session, status: sessionStatus } = useSession();

  const [post, setPost] = useState<HelpWantedDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPost() {
      setIsLoading(true);
      setError('');
      setNotFound(false);

      try {
        const res = await fetch(`/api/help-wanted/${postId}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
        } else if (res.status === 404) {
          setNotFound(true);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to fetch Help Wanted post');
        }
      } catch (err) {
        setError('Failed to fetch Help Wanted post');
      } finally {
        setIsLoading(false);
      }
    }

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const currentUser = session?.user as { id?: string; trust_level?: string } | undefined;
  const isTrusted = sessionStatus === 'authenticated' && currentUser?.trust_level === 'TRUSTED';
  const isOwnPost = currentUser?.id === post?.author.id;
  const canRespond = post?.status === 'PUBLISHED' && isTrusted && !isOwnPost;

  const statusBanner = useMemo(() => {
    if (!post || post.status === 'PUBLISHED') {
      return null;
    }

    if (post.status === 'PENDING_REVIEW') {
      return {
        className: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
        title: 'Pending review',
        body: 'This post is awaiting editor approval and is visible only to its author and moderators.',
      };
    }

    if (post.status === 'FILLED') {
      return {
        className: 'bg-yellow-50 text-yellow-900 border border-yellow-200',
        title: 'Filled',
        body: 'The poster marked this opportunity as filled. It remains visible for transparency, but new responses are disabled.',
      };
    }

    if (post.status === 'CLOSED') {
      return {
        className: 'bg-slate-100 text-slate-900 border border-slate-200',
        title: 'Closed',
        body: 'This opportunity has been closed and is no longer accepting new responses.',
      };
    }

    if (post.status === 'REJECTED') {
      return {
        className: 'bg-red-50 text-red-900 border border-red-200',
        title: 'Rejected',
        body: 'This post was rejected in moderation and is visible only to its author and moderators.',
      };
    }

    return {
      className: 'bg-gray-100 text-gray-800 border border-gray-200',
      title: 'Draft',
      body: 'This draft has not been submitted for public review yet.',
    };
  }, [post]);

  if (isLoading) {
    return <div className="flex justify-center items-center py-20 text-gray-500">Loading opportunity...</div>;
  }

  if (notFound || !post) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔨</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Opportunity Not Found</h1>
        <p className="text-gray-500 mb-6">This post may have been removed, is not yet published, or is not visible to your account.</p>
        <Link
          href="/help-wanted"
          className="inline-block px-6 py-3 text-white font-semibold rounded-full hover:opacity-90 transition"
          style={{ backgroundColor: '#A51E30' }}
        >
          Back to Help Wanted
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/help-wanted" className="text-sm font-medium hover:underline" style={{ color: '#A51E30' }}>
          Back to Help Wanted
        </Link>
      </div>

      {error ? (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
      ) : null}

      {statusBanner ? (
        <div className={`mb-6 rounded-xl px-4 py-3 ${statusBanner.className}`}>
          <p className="font-semibold">{statusBanner.title}</p>
          <p className="text-sm mt-1">{statusBanner.body}</p>
        </div>
      ) : null}

      {isOwnPost ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/help-wanted/manage"
            className="px-4 py-2 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200"
          >
            Manage My Posts
          </Link>
          <Link
            href={`/help-wanted/${post.id}/edit`}
            className="px-4 py-2 rounded-full text-white text-sm font-semibold"
            style={{ backgroundColor: '#A51E30' }}
          >
            Edit This Post
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/help-wanted" className="hover:text-[#A51E30] transition-colors">
          Help Wanted
        </Link>
        <span>/</span>
        <span>{post.title}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-teal-700">
          {POSTING_TYPE_LABELS[post.postingType]}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          {post.status === 'PUBLISHED' ? 'Open' : post.status}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>

      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {post.author.profilePhotoUrl ? (
            <img src={post.author.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {post.author.firstName[0]}{post.author.lastName[0]}
            </span>
          )}
        </div>
        <div>
          <Link
            href={`/profile/${post.author.id}`}
            className="font-semibold text-gray-800 hover:text-[#A51E30] transition-colors text-sm"
          >
            {post.author.firstName} {post.author.lastName}
          </Link>
          <p className="text-xs text-gray-400">
            Posted {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {post.photoUrl ? (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img src={post.photoUrl} alt={post.title} className="w-full h-auto" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold mb-3">Opportunity Details</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-5 py-4 mb-8">
            <h2 className="font-semibold mb-1">What kind of post is this?</h2>
            <p className="text-sm">{POSTING_TYPE_GUIDANCE[post.postingType]}</p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {post.locationText ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Location</h2>
                <p className="text-gray-800">{post.locationText}</p>
              </div>
            ) : null}
            {post.scheduleText ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Schedule</h2>
                <p className="text-gray-800">{post.scheduleText}</p>
              </div>
            ) : null}
            {post.compensationText ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Compensation</h2>
                <p className="text-gray-800">{post.compensationText}</p>
              </div>
            ) : null}
            {post.expiresAt ? (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">Closes</h2>
                <p className="text-gray-800">
                  {new Date(post.expiresAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ) : null}
          </div>

          {canRespond ? (
            <div className="space-y-3">
              <SendMessageButton profileUserId={post.author.id} />
              <div className="bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm">
                Your response opens a private Highlander Today conversation with the poster. Keep job details, follow-up questions, and next steps inside the platform.
              </div>
            </div>
          ) : post.status !== 'PUBLISHED' ? (
            <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm">
              This opportunity is not open for new responses.
            </div>
          ) : isOwnPost ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
              This is your post. Responses come through your Messages inbox.
            </div>
          ) : sessionStatus === 'authenticated' ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm">
              Trusted membership is required before you can respond through platform messaging.
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
              Sign in with a trusted account to respond through the platform.
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Response Rules</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Responses stay inside Highlander Today messaging.</li>
              <li>Public phone numbers and email addresses are intentionally not shown on Help Wanted posts.</li>
              <li>Only trusted users can start a response conversation.</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Poster Workflow</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>1. Submit the opportunity for moderator review.</li>
              <li>2. Once published, trusted users can respond through Messages.</li>
              <li>3. When the opportunity is resolved, the poster marks it filled or closed.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
