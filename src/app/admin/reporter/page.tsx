import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { FileSearch } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { getReporterDailyCoverageDesk } from '@/lib/reporter/daily-coverage';
import { listReporterStoryCandidates } from '@/lib/reporter/story-candidates';
import { AdminPage } from '@/components/admin/AdminPage';
import ReporterRunsClient from './ReporterRunsClient';
import ReporterPageTabs from './ReporterPageTabs';
import AssignStoryButton from './AssignStoryButton';
import ArchiveStoryButton from './ArchiveStoryButton';

export default async function AdminReporterPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'reporter:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({
    headers: await headers(),
  });

  const [runs, assignees, interviewQueue, morningDesk, storyCandidates] =
    await Promise.all([
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
          linkedArticle: { select: { id: true, status: true, slug: true } },
          interviewRequests: {
            select: {
              sessions: {
                where: { status: 'COMPLETED', reviewedAt: null },
                select: { id: true },
              },
            },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              sources: true,
              blockers: { where: { isResolved: false } },
              drafts: { where: { draftType: 'ARTICLE_DRAFT' } },
              interviewRequests: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      currentCommunity?.id
        ? db.userCommunityMembership.findMany({
            where: {
              communityId: currentCommunity.id,
              role: {
                in: [
                  'CONTRIBUTOR',
                  'STAFF_WRITER',
                  'EDITOR',
                  'ADMIN',
                  'SUPER_ADMIN',
                ],
              },
            },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  trustLevel: true,
                },
              },
            },
            orderBy: [
              { user: { lastName: 'asc' } },
              { user: { firstName: 'asc' } },
            ],
          })
        : [],
      db.reporterInterviewRequest.findMany({
        where: {
          reporterRun: {
            ...(currentCommunity?.id
              ? { communityId: currentCommunity.id }
              : {}),
          },
          OR: [
            {
              status: {
                in: ['DRAFT', 'INVITED', 'READY', 'IN_PROGRESS', 'BLOCKED'],
              },
            },
            { sessions: { some: { status: 'COMPLETED', reviewedAt: null } } },
          ],
        },
        select: {
          id: true,
          status: true,
          interviewType: true,
          _count: {
            select: {
              sessions: { where: { status: 'COMPLETED', reviewedAt: null } },
            },
          },
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
      currentCommunity?.id
        ? getReporterDailyCoverageDesk({ communityId: currentCommunity.id })
        : Promise.resolve(null),
      currentCommunity?.id
        ? listReporterStoryCandidates({
            communityId: currentCommunity.id,
            limit: 5,
          })
        : Promise.resolve([]),
    ]);

  const editorReadyRuns = runs.filter(
    (run) =>
      run._count.drafts > 0 &&
      run.linkedArticle?.status !== 'PUBLISHED' &&
      run.status !== 'ARCHIVED'
  );
  const assignedRuns = runs.filter(
    (run) =>
      run._count.drafts === 0 && run.linkedArticle?.status !== 'PUBLISHED'
  );
  const eligibleReporters = assignees
    .filter(
      ({ user, role }) =>
        user.trustLevel === 'TRUSTED' && checkPermission(role, 'reporter:draft')
    )
    .map(({ user }) => user);

  return (
    <AdminPage title="Reporter">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-label">Morning Reporter Desk</div>
          </div>
        </div>
        <div className="admin-card-body space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Today&apos;s morning edition
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {morningDesk?.decision?.summary ||
                  'The morning pipeline has not recorded a decision yet.'}
              </div>
              {morningDesk?.decision?.reasons?.[0] ? (
                <div className="mt-1 text-xs text-slate-600">
                  {morningDesk.decision.reasons[0]}
                </div>
              ) : null}
              {morningDesk?.decision ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>{morningDesk.decision.readyCount} ready</span>
                  <span aria-hidden="true">•</span>
                  <span>{morningDesk.decision.attemptedCount} attempted</span>
                  {morningDesk.decision.blockedCount ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>
                        {morningDesk.decision.blockedCount} blocked or failed
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="text-right text-xs text-slate-500">
              Target: {morningDesk?.goal?.targetArticleCount || 3} clean drafts
            </div>
          </div>

          <div className="admin-list">
            <div
              className="admin-list-table-wrap"
            >
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Morning story</th>
                    <th className="admin-list-header-cell">
                      Production status
                    </th>
                    <th className="admin-list-header-cell">Priority score</th>
                    <th className="admin-list-header-cell">Validation</th>
                    <th className="admin-list-header-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {morningDesk?.decision?.items.length ? (
                    morningDesk.decision.items.map((item) => (
                      <tr key={item.id} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">
                            {item.storyCandidate?.title ||
                              item.reporterRun?.title ||
                              'Untitled story'}
                          </div>
                          <div className="text-xs text-slate-500">
                            Draft {item.rank} ·{' '}
                            {item.selectedReadiness?.replace(/-/g, ' ') ||
                              'selected'}
                          </div>
                        </td>
                        <td className="admin-list-cell">
                          <span className="font-medium text-slate-800">
                            {item.statusLabel}
                          </span>
                        </td>
                        <td className="admin-list-cell">
                          {item.selectedScore ?? '—'}
                        </td>
                        <td className="admin-list-cell">
                          {typeof item.articleIssueCount === 'number'
                            ? `${item.articleIssueCount} issue${item.articleIssueCount === 1 ? '' : 's'}`
                            : item.analysisStatusLabel || 'Not run'}
                        </td>
                        <td className="admin-list-cell">
                          {item.reporterRun ? (
                            <Link
                              href={
                                item.articleDraft
                                  ? `/admin/reporter/${item.reporterRun.id}/review`
                                  : `/admin/reporter/${item.reporterRun.id}?view=${item.status === 'blocked' ? 'blockers' : 'sources'}`
                              }
                              className="admin-list-link"
                            >
                              {item.articleDraft ? 'Review Draft' : 'Open Run'}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Unavailable
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={5}>
                        The overnight desk has not produced an edition for this
                        date yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ReporterPageTabs
        panels={{
          'editor-ready': (
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="flex items-center gap-0">
                  <div className="admin-card-header-label">Editor Ready</div>
                </div>
              </div>
              <div className="admin-card-body">
                <div className="admin-list">
                  <div
                    className="admin-list-table-wrap"
                  >
                    <table className="admin-list-table">
                      <thead className="admin-list-head">
                        <tr>
                          <th className="admin-list-header-cell">Story</th>
                          <th className="admin-list-header-cell">Assignee</th>
                          <th className="admin-list-header-cell">Updated</th>
                          <th className="admin-list-header-cell">
                            Next action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {editorReadyRuns.length === 0 ? (
                          <tr className="admin-list-row">
                            <td className="admin-list-empty" colSpan={4}>
                              No editor-ready reporter stories yet.
                            </td>
                          </tr>
                        ) : (
                          editorReadyRuns.map((run) => (
                            <tr key={run.id} className="admin-list-row">
                              <td className="admin-list-cell">
                                <Link
                                  href={`/admin/reporter/${run.id}/review`}
                                  className="admin-list-link"
                                >
                                  {run.title || run.topic}
                                </Link>
                                <div className="text-xs text-slate-500">
                                  {run.status === 'BLOCKED'
                                    ? 'Needs attention before publishing'
                                    : 'Draft ready for review'}
                                </div>
                              </td>
                              <td className="admin-list-cell">
                                {run.assignedTo
                                  ? `${run.assignedTo.firstName} ${run.assignedTo.lastName}`
                                  : 'Unassigned'}
                              </td>
                              <td className="admin-list-cell">
                                {new Date(run.updatedAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }
                                )}
                              </td>
                              <td className="admin-list-cell">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Link
                                    href={`/admin/reporter/${run.id}/review`}
                                    className="admin-list-link"
                                  >
                                    Review &amp; Publish
                                  </Link>
                                  {checkPermission(userRole, 'reporter:edit') ? (
                                    <ArchiveStoryButton runId={run.id} />
                                  ) : null}
                                </div>
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
          ),
          assigned: (
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="flex items-center gap-0">
                  <div className="admin-card-header-icon" aria-hidden="true">
                    <FileSearch className="h-4 w-4" />
                  </div>
                  <div className="admin-card-header-label">
                    Assigned Stories
                  </div>
                </div>
              </div>
              <div className="admin-card-body">
                <ReporterRunsClient
                  runs={assignedRuns}
                  canPrepare={checkPermission(userRole, 'reporter:draft')}
                  canAssign={checkPermission(userRole, 'reporter:assign')}
                  canArchive={checkPermission(userRole, 'reporter:edit')}
                  currentUserId={session?.user?.id || ''}
                  assignees={eligibleReporters}
                />
              </div>
            </div>
          ),
          candidates: (
            <div className="admin-card">
              <div className="admin-card-body">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Candidates
                  </div>
                  <div className="admin-list">
                    <div
                      className="admin-list-table-wrap"
                    >
                      <table className="admin-list-table">
                        <thead className="admin-list-head">
                          <tr>
                            <th className="admin-list-header-cell">
                              Candidate
                            </th>
                            <th className="admin-list-header-cell">
                              Readiness
                            </th>
                            <th className="admin-list-header-cell">
                              Priority score
                            </th>
                            <th className="admin-list-header-cell">Sources</th>
                            <th className="admin-list-header-cell">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {storyCandidates.length ? (
                            storyCandidates.map((candidate) => (
                              <tr key={candidate.id} className="admin-list-row">
                                <td className="admin-list-cell">
                                  <div className="font-medium text-slate-900">
                                    {candidate.title}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {candidate.summary}
                                  </div>
                                </td>
                                <td className="admin-list-cell">
                                  {candidate.linkedReporterRun
                                    ? 'Assigned'
                                    : 'Not assigned'}
                                </td>
                                <td className="admin-list-cell">
                                  {candidate.signal.score}
                                </td>
                                <td className="admin-list-cell">
                                  {candidate.sourceCount}
                                </td>
                                <td className="admin-list-cell">
                                  <AssignStoryButton
                                    candidateId={candidate.id}
                                    linkedRunId={
                                      candidate.linkedReporterRun?.id || null
                                    }
                                    reporters={eligibleReporters}
                                    canAssign={checkPermission(
                                      userRole,
                                      'reporter:assign'
                                    )}
                                  />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr className="admin-list-row">
                              <td className="admin-list-empty" colSpan={5}>
                                No active story candidates are available yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          interviews: (
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="flex items-center gap-0">
                  <div className="admin-card-header-label">Interviews</div>
                </div>
              </div>
              <div className="admin-card-body">
                <div className="admin-list">
                  <div
                    className="admin-list-table-wrap"
                  >
                    <table className="admin-list-table">
                      <thead className="admin-list-head">
                        <tr>
                          <th className="admin-list-header-cell">
                            Interviewee
                          </th>
                          <th className="admin-list-header-cell">Type</th>
                          <th className="admin-list-header-cell">Priority</th>
                          <th className="admin-list-header-cell">Status</th>
                          <th className="admin-list-header-cell">Story</th>
                          <th className="admin-list-header-cell">Schedule</th>
                          <th className="admin-list-header-cell">
                            Next action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {interviewQueue.length === 0 ? (
                          <tr className="admin-list-row">
                            <td className="admin-list-empty" colSpan={7}>
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
                              <td className="admin-list-cell">
                                {interview.interviewType
                                  .toLowerCase()
                                  .replace(/_/g, ' ')}
                              </td>
                              <td className="admin-list-cell">
                                {interview.priority}
                              </td>
                              <td className="admin-list-cell">
                                {interview._count.sessions
                                  ? 'Notes need review'
                                  : (
                                      {
                                        DRAFT: 'Needs invitation',
                                        INVITED: 'Awaiting response',
                                        READY: 'Ready to interview',
                                        IN_PROGRESS: 'Interview in progress',
                                        BLOCKED: 'Needs attention',
                                      } as Record<string, string>
                                    )[interview.status] || 'Needs review'}
                              </td>
                              <td className="admin-list-cell">
                                <Link
                                  href={`/admin/reporter/${interview.reporterRun.id}?view=interviews`}
                                  className="admin-list-link"
                                >
                                  {interview.reporterRun.title ||
                                    interview.reporterRun.topic}
                                </Link>
                              </td>
                              <td className="admin-list-cell">
                                {interview.scheduledFor
                                  ? new Date(
                                      interview.scheduledFor
                                    ).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })
                                  : 'Unscheduled'}
                              </td>
                              <td className="admin-list-cell">
                                <Link
                                  className="admin-list-link"
                                  href={`/admin/reporter/${interview.reporterRun.id}?view=interviews`}
                                >
                                  {interview._count.sessions
                                    ? 'Review Interview'
                                    : 'Manage Interview'}
                                </Link>
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
          ),
        }}
      />
    </AdminPage>
  );
}
