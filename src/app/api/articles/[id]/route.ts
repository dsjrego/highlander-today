import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { z } from 'zod';

const UpdateArticleSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  body: z.string().min(10).optional(),
  excerpt: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED']).optional(),
  tags: z.array(z.string()).optional(),
  featuredImageUrl: z.string().optional().nullable(),
  featuredImageCaption: z.string().max(300).optional().nullable(),
});

/**
 * GET /api/articles/[id]
 * Fetch a single article by ID. Public users only see PUBLISHED articles.
 * Authors and Editors can see their own DRAFT / PENDING_REVIEW articles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await db.article.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            bio: true,
            trustLevel: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true, parentCategoryId: true },
        },
        tags: {
          include: { tag: true },
        },
        comments: {
          where: {
            status: 'APPROVED',
            parentCommentId: null,
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
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Access control: non-published articles only visible to author or editors
    if (article.status !== 'PUBLISHED') {
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role') || '';
      const isAuthor = userId === article.authorUserId;
      const hasEditorRole = checkPermission(userRole, 'articles:approve');

      if (!isAuthor && !hasEditorRole) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/[id]
 * Update an article. Authors can edit their own DRAFT articles.
 * Editors+ can edit any article.
 * Editing a PENDING_REVIEW or PUBLISHED article (by author) resets it to DRAFT.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await db.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check authorization: author or Editor+
    const isAuthor = article.authorUserId === userId;
    const hasEditorRole = checkPermission(userRole, 'articles:edit');

    if (!isAuthor && !hasEditorRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateArticleSchema.parse(body);

    // Build update data
    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.body !== undefined) updateData.body = sanitizeArticleHtml(validated.body);
    if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt;
    if (validated.featuredImageUrl !== undefined) updateData.featuredImageUrl = validated.featuredImageUrl;
    if (validated.featuredImageCaption !== undefined) {
      updateData.featuredImageCaption = validated.featuredImageCaption?.trim() || null;
    }
    if (validated.categoryId !== undefined) updateData.categoryId = validated.categoryId;
    if (validated.status !== undefined) {
      updateData.status = validated.status;

      if (validated.status === 'PUBLISHED' && !article.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // Handle tags: replace all
    if (validated.tags !== undefined) {
      // Delete existing tag connections
      await db.articleTag.deleteMany({ where: { articleId: params.id } });

      // Create new ones
      const tagConnections = [];
      for (const tagName of validated.tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tag = await db.tag.upsert({
          where: { slug: tagSlug },
          create: { name: tagName, slug: tagSlug },
          update: {},
        });
        tagConnections.push({ tagId: tag.id });
      }
      updateData.tags = { create: tagConnections };
    }

    // If the author (not editor) edits an article that was already submitted/published,
    // reset it to DRAFT so it goes through review again
    if (isAuthor && !hasEditorRole && article.status !== 'DRAFT') {
      updateData.status = 'DRAFT';
      updateData.publishedAt = null;
    }

    const updated = await db.article.update({
      where: { id: params.id },
      data: updateData,
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
      metadata: { title: updated.title, status: updated.status },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[id]
 * Delete an article. Author can delete own drafts. Editors+ can delete any.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await db.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isAuthor = article.authorUserId === userId;
    const canDelete = checkPermission(userRole, 'articles:delete');

    // Authors can delete their own drafts; editors+ can delete anything
    if (!isAuthor && !canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Authors can only delete their own drafts
    if (isAuthor && !canDelete && article.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'You can only delete your own draft articles' },
        { status: 403 }
      );
    }

    await db.article.delete({ where: { id: params.id } });

    // Log activity
    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'ARTICLE',
      resourceId: params.id,
      ipAddress,
      metadata: { title: article.title, status: article.status },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
