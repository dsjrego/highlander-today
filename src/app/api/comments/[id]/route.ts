import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const UpdateCommentSchema = z.object({
  status: z.enum(['APPROVED', 'HIDDEN']),
});

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

    if (!checkPermission(userRole, 'comments:moderate')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateCommentSchema.parse(body);

    const comment = await db.comment.findUnique({
      where: { id: params.id },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const updated = await db.comment.update({
      where: { id: params.id },
      data: { status: validated.status },
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
      action: 'UPDATE',
      resourceType: 'COMMENT',
      resourceId: updated.id,
      ipAddress,
      metadata: { status: updated.status },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

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

    const comment = await db.comment.findUnique({
      where: { id: params.id },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const isAuthor = comment.authorUserId === userId;
    const canModerate = checkPermission(userRole, 'comments:delete');

    if (!isAuthor && !canModerate) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await db.comment.delete({
      where: { id: params.id },
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'COMMENT',
      resourceId: params.id,
      ipAddress,
      metadata: { articleId: comment.articleId },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
