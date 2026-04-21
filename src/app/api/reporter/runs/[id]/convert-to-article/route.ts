import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { sanitizeArticleHtml, stripHtmlToText } from '@/lib/sanitize';
import { canConvertReporterToArticle } from '@/lib/reporter/permissions';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function draftBodyToArticleHtml(body: string) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`);

  return sanitizeArticleHtml(paragraphs.join(''));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canConvertReporterToArticle(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const run = await db.reporterRun.findUnique({
      where: { id: params.id },
      include: {
        linkedArticle: {
          select: { id: true, title: true, slug: true, status: true },
        },
        drafts: {
          orderBy: [{ createdAt: 'desc' }],
        },
      },
    });

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    if (run.linkedArticle) {
      return NextResponse.json(
        { error: 'Reporter run is already linked to an article draft' },
        { status: 400 }
      );
    }

    const draft = run.drafts[0];
    if (!draft) {
      return NextResponse.json({ error: 'No reporter draft found' }, { status: 400 });
    }

    const baseSlug = slugify(draft.headline || run.title || run.topic || 'reporter-draft');
    const existingSlug = await db.article.findUnique({
      where: {
        communityId_slug: {
          communityId: run.communityId,
          slug: baseSlug,
        },
      },
      select: { id: true },
    });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const article = await db.$transaction(async (tx) => {
      const createdArticle = await tx.article.create({
        data: {
          communityId: run.communityId,
          authorUserId: userId,
          title: draft.headline || run.title || run.topic,
          slug,
          excerpt: stripHtmlToText(draft.dek || draft.body).slice(0, 500) || null,
          body: draftBodyToArticleHtml(draft.body),
          status: 'DRAFT',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
        },
      });

      await tx.reporterRun.update({
        where: { id: run.id },
        data: {
          linkedArticleId: createdArticle.id,
          status: 'CONVERTED_TO_ARTICLE',
        },
      });

      await tx.reporterDraft.update({
        where: { id: draft.id },
        data: { status: 'CONVERTED_TO_ARTICLE' },
      });

      return createdArticle;
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'ARTICLE',
      resourceId: article.id,
      ipAddress,
      metadata: {
        sourceReporterRunId: run.id,
        sourceReporterDraftId: draft.id,
        title: article.title,
        status: article.status,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error converting reporter run to article:', error);
    return NextResponse.json(
      { error: 'Failed to convert reporter run to article' },
      { status: 500 }
    );
  }
}
