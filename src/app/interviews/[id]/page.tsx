import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { LogIn, Lock, MessageSquareQuote } from 'lucide-react';
import type { CustomSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { canAccessReporterInterviewSession } from '@/lib/reporter/interview-access';
import { getReporterInterviewAccessState } from '@/lib/reporter/interview';
import InterviewSessionClient from './InterviewSessionClient';

interface PageProps {
  params: { id: string };
}

export default async function InterviewSessionPage({ params }: PageProps) {
  const session = (await getServerSession(authOptions)) as CustomSession | null;
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });
  const interview = await db.reporterInterviewRequest.findUnique({
    where: { id: params.id },
    include: {
      reporterRun: {
        select: {
          id: true,
          communityId: true,
          topic: true,
          title: true,
        },
      },
    },
  });

  if (
    !interview ||
    (currentCommunity && interview.reporterRun.communityId !== currentCommunity.id)
  ) {
    notFound();
  }

  const callbackUrl = `/interviews/${interview.id}`;

  if (!session?.user?.id) {
    return (
      <div className="mt-2 space-y-6 md:mt-3">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(10,32,51,0.96),rgba(18,67,107,0.92))] px-6 py-8 text-white shadow-[0_28px_70px_rgba(7,17,26,0.2)]">
          <div className="flex items-center gap-3">
            <MessageSquareQuote className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/74">
              Reporter Interview
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-amber-200">
            {interview.reporterRun.title || interview.reporterRun.topic}
          </h1>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-slate-200 p-2 text-slate-600">
              <LogIn className="h-4 w-4" />
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-950">Sign in to continue</h2>
              <p className="text-sm leading-7 text-slate-600">
                This interview is attached to your Highlander Today account. Sign in before starting the browser interview session.
              </p>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const hasAccess = canAccessReporterInterviewSession({
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role,
    intervieweeUserId: interview.intervieweeUserId,
    inviteEmail: interview.inviteEmail,
  });
  const accessState = getReporterInterviewAccessState(interview.status);

  if (!hasAccess || !accessState.canOpenSession) {
    return (
      <section className="mt-2 rounded-[28px] border border-rose-200 bg-rose-50 p-6 md:mt-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-rose-200 p-2 text-rose-700">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-rose-950">Interview access denied</h1>
            <p className="text-sm leading-7 text-rose-900">
              This interview link is tied to a specific invited account and only opens after staff marks the request as invited or ready. If you expected access, contact Highlander Today staff so they can update the interview request.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <InterviewSessionClient
      interviewId={interview.id}
      interviewTitle={interview.reporterRun.title || interview.reporterRun.topic}
      intervieweeName={interview.intervieweeName}
      purpose={interview.purpose}
      suggestedLanguage={interview.interviewLanguage || interview.suggestedLanguage}
      nativeLanguage={interview.nativeLanguage || null}
    />
  );
}
