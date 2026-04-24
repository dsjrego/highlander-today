import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { createAnalyticsEvent } from '@/lib/analytics/server';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  articleId: z.string().uuid(),
  parentCommentId: z.string().uuid().optional().nullable(),
  body: z.string().trim().min(1).max(5000),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'articleId is required' },
        { status: 400 }
      );
    }

    const comments = await db.comment.findMany({
      where: {
        articleId,
        parentCommentId: null,
        status: 'APPROVED',
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        childComments: {
          where: { status: 'APPROVED' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
                trustLevel: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const userTrustLevel = request.headers.get('x-user-trust-level') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userTrustLevel !== 'TRUSTED') {
      return NextResponse.json(
        { error: 'You must be a trusted user to comment' },
        { status: 403 }
      );
    }

    if (!checkPermission(userRole, 'comments:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateCommentSchema.parse(body);

    const article = await db.article.findUnique({
      where: { id: validated.articleId },
      select: { id: true, status: true, communityId: true },
    });

    if (!article || article.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (validated.parentCommentId) {
      const parent = await db.comment.findUnique({
        where: { id: validated.parentCommentId },
        select: { id: true, articleId: true },
      });

      if (!parent || parent.articleId !== validated.articleId) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    const comment = await db.comment.create({
      data: {
        articleId: validated.articleId,
        authorUserId: userId,
        parentCommentId: validated.parentCommentId || null,
        body: validated.body,
        status: 'APPROVED',
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'COMMENT',
      resourceId: comment.id,
      ipAddress,
      metadata: { articleId: comment.articleId, parentCommentId: comment.parentCommentId },
    }).catch(() => {});

    createAnalyticsEvent({
      communityId: article.communityId,
      siteDomain: request.headers.get('x-community-domain') || request.headers.get('host'),
      userId,
      eventName: 'comment_created',
      contentType: 'ARTICLE',
      contentId: comment.articleId,
      pageType: 'article-detail',
      pagePath: `/local-life/${comment.articleId}`,
      metadata: {
        commentId: comment.id,
        parentCommentId: comment.parentCommentId,
      },
    }).catch(() => {});

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
