import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FileSearch } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import ReporterRunsClient from './ReporterRunsClient';

export default async function AdminReporterPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'reporter:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const [runs, assignees, interviewQueue] = await Promise.all([
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
          select: { sources: true, blockers: true, drafts: true, interviewRequests: true },
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
    db.reporterInterviewRequest.findMany({
      where: {
        reporterRun: {
          ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
        },
        status: {
          in: ['DRAFT', 'INVITED', 'READY', 'IN_PROGRESS', 'BLOCKED'],
        },
      },
      select: {
        id: true,
        status: true,
        interviewType: true,
        priority: true,
        intervieweeName: true,
        suggestedLanguage: true,
        scheduledFor: true,
        createdAt: true,
        reporterRun: {
          select: {
            id: true,
            topic: true,
            title: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 25,
    }),
  ]);

  return (
    <AdminPage
      title="Reporter"
      actions={
        <Link href="/report-a-story" className="page-header-action">
          Public Intake
        </Link>
      }
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <FileSearch className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Reporter</div>
          </div>
        </div>
        <div className="admin-card-body">
          <ReporterRunsClient
            runs={runs}
            assignees={assignees.map(({ user }) => user)}
          />
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-label">Interview Queue</div>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Interviewee</th>
                    <th className="admin-list-header-cell">Type</th>
                    <th className="admin-list-header-cell">Priority</th>
                    <th className="admin-list-header-cell">Status</th>
                    <th className="admin-list-header-cell">Run</th>
                    <th className="admin-list-header-cell">Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {interviewQueue.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={6}>
                        No open interview requests yet.
                      </td>
                    </tr>
                  ) : (
                    interviewQueue.map((interview) => (
                      <tr key={interview.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">
                            {interview.intervieweeName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {interview.suggestedLanguage}
                          </div>
                        </td>
                        <td className="admin-list-cell">{interview.interviewType}</td>
                        <td className="admin-list-cell">{interview.priority}</td>
                        <td className="admin-list-cell">{interview.status}</td>
                        <td className="admin-list-cell">
                          <Link
                            href={`/admin/reporter/${interview.reporterRun.id}`}
                            className="admin-list-link"
                          >
                            {interview.reporterRun.title || interview.reporterRun.topic}
                          </Link>
                        </td>
                        <td className="admin-list-cell">
                          {interview.scheduledFor
                            ? new Date(interview.scheduledFor).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Unscheduled'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
