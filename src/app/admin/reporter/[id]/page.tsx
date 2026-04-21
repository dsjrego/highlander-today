import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FileSearch } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import ReporterRunDetailClient from './ReporterRunDetailClient';

interface PageProps {
  params: { id: string };
}

export default async function AdminReporterDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'reporter:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const [run, assignees] = await Promise.all([
    db.reporterRun.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        linkedArticle: { select: { id: true, title: true, slug: true, status: true } },
        sources: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        blockers: {
          orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
          include: {
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        drafts: { orderBy: [{ createdAt: 'desc' }] },
        validationIssues: { orderBy: [{ createdAt: 'desc' }] },
      },
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
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
        })
      : [],
  ]);

  if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-3">
            <div className="admin-card-header-icon" aria-hidden="true">
              <FileSearch className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Reporter &gt; {run.title || run.topic}</div>
          </div>
          <div className="admin-card-header-actions">
            <Link href="/admin/reporter" className="page-header-action">
              Back to Reporter
            </Link>
          </div>
        </div>
        <div className="admin-card-body space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
              {run.title || run.topic}
            </h1>
            <p className="text-sm text-slate-600">
              Manage the source packet, blockers, assignment, and early draft state for this reporting run.
            </p>
          </div>
          <ReporterRunDetailClient
            run={run}
            assignees={assignees.map(({ user }) => user)}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}
