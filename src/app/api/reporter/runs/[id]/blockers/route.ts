import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';

const CreateReporterBlockerSchema = z.object({
  code: z.string().trim().min(2).max(100),
  message: z.string().trim().min(3).max(500),
});

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

    if (!canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const existingRun = await db.reporterRun.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true },
    });

    if (!existingRun || (currentCommunity && existingRun.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateReporterBlockerSchema.parse(body);

    const blocker = await db.reporterBlocker.create({
      data: {
        reporterRunId: existingRun.id,
        code: validated.code,
        message: validated.message,
      },
    });

    await db.reporterRun.update({
      where: { id: existingRun.id },
      data: { status: 'BLOCKED' },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existingRun.id,
      ipAddress,
      metadata: { blockerAdded: blocker.id, code: blocker.code },
    });

    return NextResponse.json(blocker, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating reporter blocker:', error);
    return NextResponse.json({ error: 'Failed to create blocker' }, { status: 500 });
  }
}
