import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * POST /api/articles/[id]/submit
 * Submit a DRAFT article for review. Only the author can submit their own drafts.
 * Transitions DRAFT → PENDING_REVIEW.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await db.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Only the author can submit their own article
    if (article.authorUserId !== userId) {
      return NextResponse.json(
        { error: 'Only the author can submit an article for review' },
        { status: 403 }
      );
    }

    if (article.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Article cannot be submitted (current status: ${article.status})` },
        { status: 400 }
      );
    }

    // Validate article has enough content to submit
    if (!article.body || article.body.length < 10) {
      return NextResponse.json(
        { error: 'Article must have at least 10 characters of content before submitting' },
        { status: 400 }
      );
    }

    if (!article.categoryId) {
      return NextResponse.json(
        { error: 'Article must have a category before submitting' },
        { status: 400 }
      );
    }

    const updated = await db.article.update({
      where: { id: params.id },
      data: {
        status: 'PENDING_REVIEW',
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    // Log activity
    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'ARTICLE',
      resourceId: article.id,
      ipAddress,
      metadata: { title: article.title, statusChange: 'DRAFT → PENDING_REVIEW' },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error submitting article:', error);
    return NextResponse.json(
      { error: 'Failed to submit article for review' },
      { status: 500 }
    );
  }
}
