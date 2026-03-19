import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const ApproveSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

/**
 * POST /api/articles/[id]/approve
 * Approve or reject a PENDING_REVIEW article. Requires REVIEW_ARTICLE permission (Editor+).
 * Approve → PUBLISHED with publishedAt timestamp.
 * Reject → DRAFT (author can revise and resubmit).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json(
        { error: 'Insufficient permissions — Editor or above required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = ApproveSchema.parse(body);

    const article = await db.article.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Article is not pending review (current status: ${article.status})` },
        { status: 400 }
      );
    }

    const updated = await db.article.update({
      where: { id: params.id },
      data: {
        status: validated.approved ? 'PUBLISHED' : 'DRAFT',
        publishedAt: validated.approved ? new Date() : null,
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
      action: validated.approved ? 'APPROVE' : 'REJECT',
      resourceType: 'ARTICLE',
      resourceId: article.id,
      ipAddress,
      metadata: {
        title: article.title,
        approved: validated.approved,
        rejectionReason: validated.rejectionReason,
      },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error approving article:', error);
    return NextResponse.json(
      { error: 'Failed to approve article' },
      { status: 500 }
    );
  }
}
