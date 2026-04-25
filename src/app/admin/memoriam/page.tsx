import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Heart } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import MemoriamAdminClient from './MemoriamAdminClient';

const MEMORIAM_LAUNCH_RULES = [
  'Only signed-in users can interact with obituary workflows.',
  'Only trusted users should be able to initiate a public death-notice or memorial submission.',
  'Public publication should require family authority, institutional authority, or additional trusted confirmation.',
  'Core factual identity fields should lock after approval unless staff re-open them.',
  'Memories and photo contributions should stay moderated instead of becoming open comments.',
] as const;

export default async function AdminMemoriamPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const [memoriamCategories, submissions, memorialPages, memories, assigneeMemberships] = await Promise.all([
    db.category.findMany({
      where: {
        contentModel: 'MEMORIAM',
        isArchived: false,
        OR: currentCommunity?.id
          ? [{ communityId: currentCommunity.id }, { communityId: null }]
          : [{ communityId: null }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        communityId: true,
        parentCategory: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    db.memorialSubmission.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        submissionType: true,
        status: true,
        relationshipToDeceased: true,
        requesterName: true,
        requesterEmail: true,
        summary: true,
        reviewNotes: true,
        updatedAt: true,
        createdAt: true,
        reviewedAt: true,
        memorialPerson: {
          select: {
            fullName: true,
            deathDate: true,
            townName: true,
          },
        },
        memorialPage: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            pageType: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            verifications: true,
            auditLogs: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    db.memorialPage.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        pageType: true,
        updatedAt: true,
        memorialPerson: {
          select: {
            fullName: true,
            deathDate: true,
            townName: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            memories: true,
            photos: true,
            verifications: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    db.memorialMemory.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        status: true,
        displayName: true,
        relationshipToDeceased: true,
        body: true,
        createdAt: true,
        reviewedAt: true,
        memorialPage: {
          select: {
            title: true,
            slug: true,
            memorialPerson: {
              select: {
                fullName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    }),
    currentCommunity?.id
      ? db.userCommunityMembership.findMany({
          where: {
            communityId: currentCommunity.id,
            role: {
              in: ['CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'],
            },
          },
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
        })
      : [],
  ]);

  return (
    <AdminPage title="Memoriam" count={submissions.length}>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Heart className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Memoriam workflow</div>
          </div>
        </div>
        <div className="admin-card-body space-y-4">
          <p className="text-sm leading-6 text-slate-700">
            Memoriam now has a first live internal workflow. Trusted-user submissions land as
            dedicated memoriam records instead of articles, and this admin queue can assign,
            review, approve, or reject them before the public experience exists.
          </p>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Submissions
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{submissions.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pending review
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {submissions.filter((submission) => submission.status === 'PENDING_REVIEW').length}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Memorial pages
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{memorialPages.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pending memories
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {memories.filter((memory) => memory.status === 'PENDING').length}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Launch rules</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {MEMORIAM_LAUNCH_RULES.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Assigned categories</h2>
              {memoriamCategories.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">
                  No Memoriam categories are assigned yet. Use Navigation to reserve the section
                  structure before public launch.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {memoriamCategories.map((category) => (
                    <li key={category.id}>
                      <span className="font-medium text-slate-900">{category.name}</span>
                      {' · '}
                      {category.slug}
                      {' · '}
                      {category.parentCategory?.name || 'Top level'}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <MemoriamAdminClient
        submissions={submissions}
        memorialPages={memorialPages}
        memories={memories}
        assignees={assigneeMemberships.map(({ user }) => user)}
      />
    </AdminPage>
  );
}
