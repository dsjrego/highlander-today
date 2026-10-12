import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { sanitizeArticleHtml, stripHtmlToText } from '@/lib/sanitize';
import { findIncompleteReporterCopy } from '@/lib/reporter/draft-validator';

const Input = z.object({
  intent: z.enum(['save', 'publish']),
  title: z.string().trim().min(3).max(255),
  body: z.string().min(10).max(200000),
  categoryId: z.string().uuid().nullable(),
  featuredImageUrl: z.string().max(2048).refine((value) => {
    if (!value || /^\/uploads\/[a-zA-Z0-9/_\-.]+$/.test(value)) return true;
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  }, 'Choose a valid image.').nullable().optional(),
  featuredImageCaption: z.string().trim().max(300).nullable().optional(),
  draftId: z.string().uuid(),
  runVersion: z.string().datetime(),
  articleVersion: z.string().datetime().nullable(),
  resolvedIssueIds: z.array(z.string().uuid()).max(100).default([]),
});
class EditorialError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role') || '';
    if (!userId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (
      !checkPermission(role, 'reporter:convert') ||
      !checkPermission(role, 'articles:edit')
    ) {
      return NextResponse.json(
        { error: 'An editor is required to save or publish this story.' },
        { status: 403 }
      );
    }
    const input = Input.parse(await request.json());
    if (
      input.intent === 'publish' &&
      !checkPermission(role, 'articles:approve')
    ) {
      return NextResponse.json(
        { error: 'An editor is required to publish.' },
        { status: 403 }
      );
    }
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community)
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    const html = sanitizeArticleHtml(input.body);
    if (input.intent === 'publish' && findIncompleteReporterCopy({ headline: input.title, dek: null, body: stripHtmlToText(html) })) {
      return NextResponse.json({ error: 'Complete the reporting and remove verification-workflow notes from the article before publishing.' }, { status: 422 });
    }
    if (stripHtmlToText(html).trim().length < 10) {
      return NextResponse.json(
        { error: 'The story needs at least 10 characters of text.' },
        { status: 400 }
      );
    }
    const result = await db.$transaction(async (tx) => {
      const run = await tx.reporterRun.findFirst({
        where: { id, communityId: community.id },
        include: {
          linkedArticle: true,
          sources: { select: { id: true } },
          drafts: {
            where: { draftType: 'ARTICLE_DRAFT' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          blockers: { where: { isResolved: false } },
          validationIssues: {
            where: { isResolved: false, severity: 'CRITICAL' },
          },
          interviewRequests: {
            include: {
              sessions: { where: { status: 'COMPLETED', reviewedAt: null } },
            },
          },
        },
      });
      if (!run) throw new EditorialError('Story not found.', 404);
      const draft = run.drafts[0];
      if (!draft || draft.id !== input.draftId || run.status === 'ARCHIVED') {
        throw new EditorialError(
          'The draft changed. Reload before continuing.',
          409
        );
      }
      if (run.linkedArticle && run.linkedArticle.communityId !== community.id) {
        throw new EditorialError('Article not found.', 404);
      }
      if (run.linkedArticle?.status === 'PUBLISHED') {
        throw new EditorialError(
          'This story is already published. Edit it from Articles.',
          409
        );
      }
      if (input.categoryId) {
        const category = await tx.category.findFirst({
          where: {
            id: input.categoryId,
            isArchived: false,
            OR: [{ communityId: community.id }, { communityId: null }],
            AND: [
              {
                OR: [
                  { contentModel: 'ARTICLE' },
                  { contentModel: 'MIXED' },
                  { contentModel: null },
                ],
              },
            ],
          },
        });
        if (!category)
          throw new EditorialError('Choose a valid article category.', 400);
      }
      const currentCriticalIssues = run.validationIssues.filter(
        (issue) => !issue.reporterDraftId || issue.reporterDraftId === draft.id
      );
      if (
        input.resolvedIssueIds.some(
          (issueId) =>
            !currentCriticalIssues.some((issue) => issue.id === issueId)
        )
      ) {
        throw new EditorialError(
          'The review notes changed. Reload before continuing.',
          409
        );
      }
      if (input.intent === 'publish') {
        if (!input.categoryId)
          throw new EditorialError('Choose a category before publishing.', 400);
        if (!run.sources.length)
          throw new EditorialError(
            'Add source material before publishing.',
            400
          );
        if (
          run.blockers.length ||
          currentCriticalIssues.some(
            (issue) => !input.resolvedIssueIds.includes(issue.id)
          ) ||
          run.interviewRequests.some((interview) => interview.sessions.length)
        ) {
          throw new EditorialError(
            'Resolve the reporting problems and review completed interviews before publishing.',
            400
          );
        }
      }
      // Claim this version before any article write; concurrent review/conversion rolls back.
      const claim = await tx.reporterRun.updateMany({
        where: {
          id,
          communityId: community.id,
          updatedAt: new Date(input.runVersion),
          linkedArticleId: run.linkedArticleId,
        },
        data: { status: 'CONVERTED_TO_ARTICLE', updatedAt: new Date() },
      });
      if (claim.count !== 1)
        throw new EditorialError(
          'This story changed in another window. Reload to continue.',
          409
        );
      if (input.resolvedIssueIds.length) {
        await tx.reporterValidationIssue.updateMany({
          where: {
            reporterRunId: id,
            id: { in: input.resolvedIssueIds },
            isResolved: false,
          },
          data: { isResolved: true },
        });
      }
      const data = {
        title: input.title,
        body: html,
        categoryId: input.categoryId,
        ...(input.featuredImageUrl !== undefined ? { featuredImageUrl: input.featuredImageUrl || null } : {}),
        ...(input.featuredImageUrl === null || input.featuredImageUrl === ''
          ? { featuredImageCaption: null }
          : input.featuredImageCaption !== undefined ? { featuredImageCaption: input.featuredImageCaption || null } : {}),
        excerpt: stripHtmlToText(html).slice(0, 500),
        status:
          input.intent === 'publish'
            ? ('PUBLISHED' as const)
            : ('DRAFT' as const),
        publishedAt: input.intent === 'publish' ? new Date() : null,
      };
      let article;
      if (run.linkedArticle) {
        const updated = await tx.article.updateMany({
          where: {
            id: run.linkedArticle.id,
            communityId: community.id,
            updatedAt: input.articleVersion
              ? new Date(input.articleVersion)
              : new Date(0),
            status: { not: 'PUBLISHED' },
          },
          data,
        });
        if (updated.count !== 1)
          throw new EditorialError(
            'The article changed. Reload before saving.',
            409
          );
        article = await tx.article.findUniqueOrThrow({
          where: { id: run.linkedArticle.id },
        });
      } else {
        const slugBase =
          input.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'story';
        article = await tx.article.create({
          data: {
            ...data,
            communityId: community.id,
            authorUserId: userId,
            slug: `${slugBase}-${run.id}`,
          },
        });
        await tx.reporterRun.update({
          where: { id },
          data: { linkedArticleId: article.id },
        });
      }
      await tx.reporterDraft.update({
        where: { id: draft.id },
        data: { status: 'CONVERTED_TO_ARTICLE' },
      });
      return {
        article,
        runVersion: (
          await tx.reporterRun.findUniqueOrThrow({ where: { id } })
        ).updatedAt.toISOString(),
      };
    });
    await logActivity({
      userId,
      action: input.intent === 'publish' ? 'APPROVE' : 'UPDATE',
      resourceType: 'ARTICLE',
      resourceId: result.article.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        reporterRunId: id,
        sourceReporterDraftId: input.draftId,
        status: result.article.status,
        resolvedIssueIds: input.resolvedIssueIds,
      },
    }).catch(() => {});
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Check the headline, story, category and image fields.' },
        { status: 400 }
      );
    if (error instanceof EditorialError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      ['P2002', 'P2034'].includes(String(error.code))
    ) {
      return NextResponse.json(
        { error: 'Another editor changed this story. Reload to continue.' },
        { status: 409 }
      );
    }
    console.error('Reporter editorial action failed:', error);
    return NextResponse.json(
      { error: 'Unable to save the story. Your edits are still on this page.' },
      { status: 500 }
    );
  }
}
