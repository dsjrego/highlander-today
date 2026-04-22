/* eslint-disable @next/next/no-img-element */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import SendMessageButton from '@/app/profile/[id]/SendMessageButton';
import UserAvatar from '@/components/shared/UserAvatar';

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
    return <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Loading opportunity...</div>;
  }

  if (notFound || !post) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] py-20 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">Help Wanted</p>
        <h1 className="mb-2 text-2xl font-bold text-white">Opportunity Not Found</h1>
        <p className="mb-6 text-white/70">This post may have been removed, is not yet published, or is not visible to your account.</p>
        <Link
          href="/help-wanted"
          className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          Back to Help Wanted
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/help-wanted" className="text-sm font-semibold text-[var(--brand-accent)] hover:underline">
          Back to Help Wanted
        </Link>
      </div>

      {error ? (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
      ) : null}

      {statusBanner ? (
        <div className={`rounded-2xl px-4 py-3 ${statusBanner.className}`}>
          <p className="font-semibold">{statusBanner.title}</p>
          <p className="text-sm mt-1">{statusBanner.body}</p>
        </div>
      ) : null}

      {isOwnPost ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/help-wanted/manage"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Manage My Posts
          </Link>
          <Link
            href={`/help-wanted/${post.id}/edit`}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Edit This Post
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/help-wanted" className="transition-colors hover:text-[var(--brand-accent)]">
          Help Wanted
        </Link>
        <span>/</span>
        <span>{post.title}</span>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--brand-primary)] px-3 py-1 text-xs font-semibold text-white">
          {POSTING_TYPE_LABELS[post.postingType]}
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-950">
          {post.status === 'PUBLISHED' ? 'Open' : post.status}
        </span>
      </div>

      <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">{post.title}</h1>

      <div className="mt-6 flex items-center gap-3">
        <UserAvatar
          firstName={post.author.firstName}
          lastName={post.author.lastName}
          profilePhotoUrl={post.author.profilePhotoUrl}
          trustLevel={post.author.trustLevel}
          className="h-11 w-11"
          initialsClassName="bg-white/12 text-sm text-white/78"
        />
        <div>
          <Link
            href={`/profile/${post.author.id}`}
            className="text-sm font-semibold text-white transition-colors hover:text-cyan-200"
          >
            {post.author.firstName} {post.author.lastName}
          </Link>
          <p className="text-xs text-white/60">
            Posted {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      </section>

      {post.photoUrl ? (
        <div className="overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_55px_rgba(7,17,26,0.14)]">
          <img src={post.photoUrl} alt={post.title} className="w-full h-auto" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="text-lg font-bold mb-3">Opportunity Details</h2>
            <p className="whitespace-pre-wrap text-slate-700">{post.description}</p>
          </div>

          <div className="mb-8 rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] px-5 py-4 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
            <h2 className="font-semibold mb-1">What kind of post is this?</h2>
            <p className="text-sm text-white/72">{POSTING_TYPE_GUIDANCE[post.postingType]}</p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
            {post.locationText ? (
              <div>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Location</h2>
                <p className="text-slate-800">{post.locationText}</p>
              </div>
            ) : null}
            {post.scheduleText ? (
              <div>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Schedule</h2>
                <p className="text-slate-800">{post.scheduleText}</p>
              </div>
            ) : null}
            {post.compensationText ? (
              <div>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Compensation</h2>
                <p className="text-slate-800">{post.compensationText}</p>
              </div>
            ) : null}
            {post.expiresAt ? (
              <div>
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Closes</h2>
                <p className="text-slate-800">
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
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                Your response opens a private Highlander Today conversation with the poster. Keep job details, follow-up questions, and next steps inside the platform.
              </div>
            </div>
          ) : post.status !== 'PUBLISHED' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-800">
              This opportunity is not open for new responses.
            </div>
          ) : isOwnPost ? (
            <div className="rounded-xl border border-blue-200 bg-[var(--article-card-badge-bg)] px-4 py-3 text-sm text-blue-800">
              This is your post. Responses come through your Messages inbox.
            </div>
          ) : sessionStatus === 'authenticated' ? (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Trusted membership is required before you can respond through platform messaging.
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-[var(--article-card-badge-bg)] px-4 py-3 text-sm text-blue-800">
              Sign in with a trusted account to respond through the platform.
            </div>
          )}

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
            <h3 className="mb-2 text-sm font-semibold text-cyan-100/70">Response Rules</h3>
            <ul className="space-y-2 text-sm text-white/72">
              <li>Responses stay inside Highlander Today messaging.</li>
              <li>Public phone numbers and email addresses are intentionally not shown on Help Wanted posts.</li>
              <li>Only trusted users can start a response conversation.</li>
            </ul>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/82 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Poster Workflow</h3>
            <ul className="space-y-2 text-sm text-slate-600">
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
