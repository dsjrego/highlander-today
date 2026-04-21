import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FileSearch } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import ReporterRunsClient from './ReporterRunsClient';

export default async function AdminReporterPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'reporter:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const [runs, assignees] = await Promise.all([
    db.reporterRun.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        status: true,
        mode: true,
        requestType: true,
        topic: true,
        title: true,
        subjectName: true,
        requesterName: true,
        requesterEmail: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { sources: true, blockers: true, drafts: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
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

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <FileSearch className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Reporter</div>
          </div>
          <div className="admin-card-header-actions">
            <Link href="/report-a-story" className="page-header-action">
              Public Intake
            </Link>
          </div>
        </div>
        <div className="admin-card-body">
          <ReporterRunsClient
            runs={runs}
            assignees={assignees.map(({ user }) => user)}
          />
        </div>
      </div>
    </div>
  );
}
