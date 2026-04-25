import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import MemorialMemoryForm from './MemorialMemoryForm';

interface PageProps {
  params: {
    slug: string;
  };
}

function formatDate(value: Date | null) {
  if (!value) {
    return 'Date unavailable';
  }

  return value.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRole(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

async function getPublishedMemorialPage(slug: string, communityId?: string) {
  return db.memorialPage.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      ...(communityId ? { communityId } : {}),
    },
    select: {
      id: true,
      title: true,
      shortSummary: true,
      biography: true,
      lifeStory: true,
      serviceDetails: true,
      familyDetails: true,
      provenanceNote: true,
      pageType: true,
      approvedAt: true,
      publishedAt: true,
      updatedAt: true,
      category: {
        select: {
          name: true,
        },
      },
      memorialPerson: {
        select: {
          fullName: true,
          preferredName: true,
          age: true,
          birthDate: true,
          deathDate: true,
          townName: true,
          birthTownName: true,
          deathTownName: true,
        },
      },
      submissions: {
        select: {
          submissionType: true,
          relationshipToDeceased: true,
          reviewedAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      verifications: {
        where: {
          status: 'CONFIRMED',
        },
        select: {
          verificationRole: true,
          verifierOrganization: true,
          verifiedAt: true,
        },
        orderBy: { verifiedAt: 'desc' },
      },
      contributors: {
        where: {
          status: 'ACTIVE',
          role: {
            in: ['STEWARD', 'CO_STEWARD'],
          },
        },
        select: {
          role: true,
          displayName: true,
          relationshipToDeceased: true,
        },
        orderBy: { approvedAt: 'asc' },
      },
      memories: {
        where: {
          status: 'APPROVED',
        },
        select: {
          id: true,
          displayName: true,
          relationshipToDeceased: true,
          body: true,
          createdAt: true,
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const page = await getPublishedMemorialPage(params.slug, currentCommunity?.id);

  if (!page) {
    return {
      title: 'Memoriam',
      description: 'Memorial page on Highlander Today.',
    };
  }

  const description =
    page.shortSummary?.trim() ||
    page.biography?.trim() ||
    page.lifeStory?.trim() ||
    `Memoriam record for ${page.memorialPerson.fullName}.`;

  return {
    title: page.title,
    description: description.slice(0, 200),
    alternates: {
      canonical: `/memoriam/${params.slug}`,
    },
  };
}

export default async function MemorialDetailPage({ params }: PageProps) {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const page = await getPublishedMemorialPage(params.slug, currentCommunity?.id);

  if (!page) {
    notFound();
  }

  const initialSubmission = page.submissions[0] || null;
  const confirmedVerificationRoles = page.verifications.map((verification) => {
    const role = formatRole(verification.verificationRole);
    return verification.verifierOrganization
      ? `${role} (${verification.verifierOrganization})`
      : role;
  });

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title={page.title}
        description={page.shortSummary || undefined}
        mobileAlign="start"
        actions={
          <Link href="/memoriam" className="page-header-action">
            <span className="page-header-action-label">Back To Memoriam</span>
          </Link>
        }
      />

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.97),rgba(31,41,55,0.94))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/76">
              {page.category?.name || (page.pageType === 'DEATH_NOTICE' ? 'Death Notice' : 'Memorial Page')}
            </p>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-white">
              {page.memorialPerson.preferredName || page.memorialPerson.fullName}
            </h1>
            <p className="text-sm leading-7 text-white/72">
              {page.memorialPerson.townName || 'Community connection not listed'}
            </p>
          </div>
          <div className="space-y-1 text-sm text-white/78">
            <p>Published {formatDate(page.publishedAt)}</p>
            <p>Last updated {formatDate(page.updatedAt)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <div className="space-y-6">
          {page.biography?.trim() ? (
            <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-bold text-slate-950">Biography</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {page.biography}
              </p>
            </section>
          ) : null}

          {page.lifeStory?.trim() ? (
            <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-bold text-slate-950">Life Story</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {page.lifeStory}
              </p>
            </section>
          ) : null}

          {page.serviceDetails?.trim() ? (
            <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-bold text-slate-950">Service Details</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {page.serviceDetails}
              </p>
            </section>
          ) : null}

          {page.familyDetails?.trim() ? (
            <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-bold text-slate-950">Family</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {page.familyDetails}
              </p>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <h2 className="text-xl font-bold text-slate-950">Memories</h2>
            {page.memories.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                No reviewed memories are public yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {page.memories.map((memory) => {
                  const fallbackName = `${memory.createdBy?.firstName || ''} ${memory.createdBy?.lastName || ''}`.trim();
                  return (
                    <article key={memory.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {memory.body}
                      </p>
                      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {memory.displayName || fallbackName || 'Community member'}
                        {memory.relationshipToDeceased ? ` · ${memory.relationshipToDeceased}` : ''}
                        {' · '}
                        {formatDate(memory.createdAt)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <MemorialMemoryForm memorialPageId={page.id} />
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-bold text-slate-950">Record</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Full name:</span>{' '}
                {page.memorialPerson.fullName}
              </p>
              {page.memorialPerson.age ? (
                <p>
                  <span className="font-semibold text-slate-950">Age:</span> {page.memorialPerson.age}
                </p>
              ) : null}
              {page.memorialPerson.birthDate ? (
                <p>
                  <span className="font-semibold text-slate-950">Birth date:</span>{' '}
                  {formatDate(page.memorialPerson.birthDate)}
                </p>
              ) : null}
              {page.memorialPerson.deathDate ? (
                <p>
                  <span className="font-semibold text-slate-950">Death date:</span>{' '}
                  {formatDate(page.memorialPerson.deathDate)}
                </p>
              ) : null}
              {page.memorialPerson.birthTownName ? (
                <p>
                  <span className="font-semibold text-slate-950">Birth town:</span>{' '}
                  {page.memorialPerson.birthTownName}
                </p>
              ) : null}
              {page.memorialPerson.deathTownName ? (
                <p>
                  <span className="font-semibold text-slate-950">Death town:</span>{' '}
                  {page.memorialPerson.deathTownName}
                </p>
              ) : null}
            </div>
          </section>

          {page.provenanceNote?.trim() ? (
            <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <h2 className="text-lg font-bold text-slate-950">Provenance</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {page.provenanceNote}
              </p>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-white/10 bg-white/86 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            <h2 className="text-lg font-bold text-slate-950">Review Signals</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Publication:</span>{' '}
                Staff reviewed and published this record
                {page.approvedAt ? ` on ${formatDate(page.approvedAt)}` : ''}.
              </p>
              {initialSubmission?.relationshipToDeceased ? (
                <p>
                  <span className="font-semibold text-slate-950">Submitted by:</span>{' '}
                  {initialSubmission.relationshipToDeceased}
                </p>
              ) : null}
              <p>
                <span className="font-semibold text-slate-950">Verification:</span>{' '}
                {confirmedVerificationRoles.length > 0
                  ? confirmedVerificationRoles.join(', ')
                  : 'Reviewed by staff; no public verifier is listed.'}
              </p>
              {page.contributors.length > 0 ? (
                <p>
                  <span className="font-semibold text-slate-950">Stewardship:</span>{' '}
                  {page.contributors
                    .map((contributor) =>
                      [
                        contributor.displayName || formatRole(contributor.role),
                        contributor.relationshipToDeceased,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    )
                    .join('; ')}
                </p>
              ) : (
                <p>
                  <span className="font-semibold text-slate-950">Stewardship:</span>{' '}
                  Managed through Highlander Today staff review.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
