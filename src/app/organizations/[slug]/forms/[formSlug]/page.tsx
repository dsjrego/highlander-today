import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ClipboardList, Lock, LogIn } from 'lucide-react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import type { CustomSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import {
  formatOrganizationFormStatusLabel,
} from '@/lib/organization-forms';
import { hasTrustedAccess, type TrustLevelValue } from '@/lib/trust-access';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import OrganizationPublicForm from './OrganizationPublicForm';

interface PageProps {
  params: {
    slug: string;
    formSlug: string;
  };
}

async function getPublicOrganizationForm(params: { communityId: string; organizationSlug: string; formSlug: string }) {
  return db.organizationForm.findFirst({
    where: {
      slug: params.formSlug,
      organization: {
        communityId: params.communityId,
        slug: params.organizationSlug,
        status: 'APPROVED',
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      status: true,
      isPubliclyListed: true,
      minimumTrustLevel: true,
      opensAt: true,
      closesAt: true,
      updatedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      questions: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          prompt: true,
          helpText: true,
          type: true,
          isRequired: true,
          options: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              label: true,
            },
          },
        },
      },
      submissions: {
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function hasMinimumFormAccess(minimumTrustLevel: TrustLevelValue, session: CustomSession | null) {
  const trustLevel = session?.user?.trust_level || null;
  const role = session?.user?.role || null;

  if (!trustLevel || trustLevel === 'SUSPENDED') {
    return false;
  }

  if (minimumTrustLevel === 'REGISTERED') {
    return true;
  }

  return hasTrustedAccess({ trustLevel, role });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  if (!currentCommunity) {
    return {
      title: 'Organization Form',
    };
  }

  const form = await getPublicOrganizationForm({
    communityId: currentCommunity.id,
    organizationSlug: params.slug,
    formSlug: params.formSlug,
  });

  if (!form) {
    return {
      title: 'Organization Form',
    };
  }

  return {
    title: `${form.title} | ${form.organization.name} | Highlander Today`,
    description: form.description ?? `${form.organization.name} form on Highlander Today.`,
    alternates: {
      canonical: `/organizations/${form.organization.slug}/forms/${form.slug}`,
    },
  };
}

export default async function OrganizationFormPage({ params }: PageProps) {
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });

  if (!currentCommunity) {
    notFound();
  }

  const form = await getPublicOrganizationForm({
    communityId: currentCommunity.id,
    organizationSlug: params.slug,
    formSlug: params.formSlug,
  });

  if (!form) {
    notFound();
  }

  const session = (await getServerSession(authOptions)) as CustomSession | null;
  const isSignedIn = Boolean(session?.user?.id);
  const hasAccess = hasMinimumFormAccess(form.minimumTrustLevel, session);
  const descriptionHtml = form.description ? sanitizeArticleHtml(form.description) : '';
  const callbackUrl = `/organizations/${form.organization.slug}/forms/${form.slug}`;
  const canAcceptResponses = form.status === 'PUBLISHED';
  const hasExistingSubmission =
    isSignedIn && !!session?.user?.id
      ? (await db.organizationFormSubmission.findUnique({
          where: {
            formId_userId: {
              formId: form.id,
              userId: session.user.id,
            },
          },
          select: { id: true },
        }))
      : null;

  return (
    <div className="space-y-6">
      <InternalPageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title={form.title}
      />

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.97),rgba(19,43,68,0.96))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/88">
              {formatOrganizationFormStatusLabel(form.status)}
            </span>
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
              {form.minimumTrustLevel === 'TRUSTED' ? 'Trusted access' : 'Registered access'}
            </span>
            <Link href={`/organizations/${form.organization.slug}`} className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/12">
              {form.organization.name}
            </Link>
          </div>

          {descriptionHtml ? (
            <div
              className="prose prose-sm max-w-3xl text-white prose-headings:text-white prose-p:text-white/74 prose-strong:text-white prose-li:text-white/74 prose-a:text-cyan-200 prose-blockquote:text-white/78 prose-blockquote:border-white/30 prose-code:text-cyan-100 prose-pre:bg-slate-950/60 prose-hr:border-white/20 prose-img:rounded-xl prose-img:border prose-img:border-white/10"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          ) : (
            <p className="max-w-3xl text-sm leading-7 text-white/74">
              Complete this organization form on Highlander Today.
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
            <span>Opens {formatDateTime(form.opensAt)}</span>
            <span>Closes {formatDateTime(form.closesAt)}</span>
            <span>Updated {formatDateTime(form.updatedAt)}</span>
          </div>
        </div>
      </section>

      {!canAcceptResponses ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          This form is not currently accepting responses. It is in `{formatOrganizationFormStatusLabel(form.status)}` status.
        </section>
      ) : !isSignedIn ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-slate-200 p-2 text-slate-600">
              <LogIn className="h-4 w-4" />
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-950">Sign in to continue</h2>
              <p className="text-sm leading-6 text-slate-600">
                This form can be opened by link, but responses require a Highlander Today account.
              </p>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      ) : !hasAccess ? (
        <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-rose-200 p-2 text-rose-700">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-rose-950">Access requirement not met</h2>
              <p className="text-sm leading-6 text-rose-900">
                This form requires `{form.minimumTrustLevel}` access. Your account can open the link, but it cannot submit to this form yet.
              </p>
            </div>
          </div>
        </section>
      ) : hasExistingSubmission ? (
        <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-bold text-emerald-950">Already submitted</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            You have already submitted this form. This first pass supports one submission per signed-in user.
          </p>
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Form Questions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Answer the questions below and submit the form once. Published forms now accept responses here.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {form.questions.length > 0 ? (
              <OrganizationPublicForm
                actionUrl={`/api/organizations/${form.organization.slug}/forms/${form.slug}/submission`}
                questions={form.questions}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No questions have been added to this form yet.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
