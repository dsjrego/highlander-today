import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { checkPermission } from '@/lib/permissions';
import { getCategories } from '@/lib/categories';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { reporterTextToHtml } from '@/lib/reporter/editorial';
import { canGenerateReporterDraft } from '@/lib/reporter/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import ReviewStoryClient from './ReviewStoryClient';

export default async function ReviewStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || '';
  if (!checkPermission(role, 'reporter:view')) redirect('/');
  const community = await getCurrentCommunity({ headers: await headers() });
  if (!community) notFound();
  const run = await db.reporterRun.findFirst({
    where: { id, communityId: community.id },
    include: {
      sources: { orderBy: { sortOrder: 'asc' } },
      drafts: {
        where: { draftType: 'ARTICLE_DRAFT' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      linkedArticle: true,
      blockers: { where: { isResolved: false } },
      validationIssues: { where: { isResolved: false } },
      interviewRequests: {
        include: {
          sessions: { where: { status: 'COMPLETED', reviewedAt: null } },
        },
      },
    },
  });
  if (
    !run ||
    (run.linkedArticle && run.linkedArticle.communityId !== community.id)
  )
    notFound();
  const draft = run.drafts[0];
  if (!draft) redirect(`/admin/reporter?section=assigned`);
  const useSavedArticle = run.linkedArticle &&
    (run.linkedArticle.status === 'PUBLISHED' || draft.status === 'CONVERTED_TO_ARTICLE');
  const categories = (await getCategories()).filter(
    (category) =>
      !category.contentModel ||
      ['ARTICLE', 'MIXED'].includes(category.contentModel)
  );
  const issues = run.validationIssues.filter(
    (issue) => !issue.reporterDraftId || issue.reporterDraftId === draft.id
  );
  const problems = [
    ...run.blockers.map((blocker) => blocker.message),
    ...(!run.sources.length ? ['Add source material before publishing.'] : []),
    ...(run.interviewRequests.some((interview) => interview.sessions.length)
      ? ['Review completed interview notes before publishing.']
      : []),
    ...(run.status === 'ARCHIVED'
      ? ['This story is archived. Reopen it before continuing.']
      : []),
  ];
  return (
    <AdminPage
      title="Review & Publish"
      breadcrumb={
        <Link href="/admin/reporter" className="admin-list-link">
          Reporter
        </Link>
      }
    >
      <ReviewStoryClient
        runId={id}
        draftId={draft.id}
        initialRunVersion={run.updatedAt.toISOString()}
        initialArticle={
          run.linkedArticle
            ? {
                id: run.linkedArticle.id,
                status: run.linkedArticle.status,
                slug: run.linkedArticle.slug,
                updatedAt: run.linkedArticle.updatedAt.toISOString(),
              }
            : null
        }
        initialTitle={
          (useSavedArticle ? run.linkedArticle?.title : null) || draft.headline || run.title || run.topic
        }
        initialBody={
          useSavedArticle && run.linkedArticle?.body
            ? sanitizeArticleHtml(run.linkedArticle.body)
            : reporterTextToHtml(draft.body)
        }
        initialCategoryId={run.linkedArticle?.categoryId || ''}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.parentCategory
            ? `${category.parentCategory.name} / ${category.name}`
            : category.name,
        }))}
        canSave={
          checkPermission(role, 'reporter:convert') &&
          checkPermission(role, 'articles:edit')
        }
        canPublish={checkPermission(role, 'articles:approve')}
        canRerun={canGenerateReporterDraft(role)}
        criticalIssues={issues
          .filter((issue) => issue.severity === 'CRITICAL')
          .map((issue) => ({ id: issue.id, message: issue.message }))}
        interviewReviewRequired={run.interviewRequests.some(
          (interview) => interview.sessions.length > 0
        )}
        problems={problems}
        warnings={issues
          .filter((issue) => issue.severity !== 'CRITICAL')
          .map((issue) => issue.message)}
        sources={run.sources.map((source) => ({
          id: source.id,
          title: source.title || source.publisher || 'Source',
          url: source.url,
          text: source.contentText || source.excerpt || source.note || '',
          reliability: source.reliabilityTier,
        }))}
      />
    </AdminPage>
  );
}
