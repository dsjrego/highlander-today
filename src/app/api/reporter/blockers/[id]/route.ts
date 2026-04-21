import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';

const UpdateReporterBlockerSchema = z.object({
  isResolved: z.boolean().optional(),
  code: z.string().trim().min(2).max(100).optional(),
  message: z.string().trim().min(3).max(500).optional(),
});

export async function PATCH(
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

    if (!canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const existing = await db.reporterBlocker.findUnique({
      where: { id: params.id },
      include: { reporterRun: { select: { id: true, communityId: true } } },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Blocker not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateReporterBlockerSchema.parse(body);

    const blocker = await db.reporterBlocker.update({
      where: { id: params.id },
      data: {
        ...(validated.code !== undefined ? { code: validated.code } : {}),
        ...(validated.message !== undefined ? { message: validated.message } : {}),
        ...(validated.isResolved !== undefined
          ? {
              isResolved: validated.isResolved,
              resolvedAt: validated.isResolved ? new Date() : null,
              resolvedByUserId: validated.isResolved ? userId : null,
            }
          : {}),
      },
      include: {
        resolvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existing.reporterRunId,
      ipAddress,
      metadata: { blockerUpdated: blocker.id, isResolved: blocker.isResolved },
    });

    return NextResponse.json(blocker);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating reporter blocker:', error);
    return NextResponse.json({ error: 'Failed to update blocker' }, { status: 500 });
  }
}
