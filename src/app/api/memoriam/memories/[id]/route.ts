import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const UpdateMemorySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN']),
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

    if (!canReviewMemoriam(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const body = await request.json();
    const validated = UpdateMemorySchema.parse(body);

    const existingMemory = await db.memorialMemory.findFirst({
      where: {
        id: params.id,
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        communityId: true,
        memorialPageId: true,
        status: true,
      },
    });

    if (!existingMemory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const updated = await db.memorialMemory.update({
      where: { id: existingMemory.id },
      data: {
        status: validated.status,
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        auditLogs: {
          create: {
            communityId: existingMemory.communityId,
            memorialPageId: existingMemory.memorialPageId,
            actorUserId: userId,
            action: 'UPDATE_MEMORY',
            metadata: {
              previousStatus: existingMemory.status,
              nextStatus: validated.status,
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        reviewedAt: true,
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating memorial memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}
