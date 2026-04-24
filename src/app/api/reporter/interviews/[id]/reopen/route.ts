import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';

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
    const existing = await db.reporterInterviewRequest.findUnique({
      where: { id: params.id },
      include: {
        reporterRun: {
          select: { id: true, communityId: true },
        },
        interviewee: {
          select: { id: true, email: true },
        },
      },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Reporter interview not found' }, { status: 404 });
    }

    if (!existing.inviteEmail && !existing.intervieweeUserId) {
      return NextResponse.json(
        { error: 'Add an interviewee account or invite email before reopening.' },
        { status: 400 }
      );
    }

    const updated = await db.reporterInterviewRequest.update({
      where: { id: existing.id },
      data: {
        status: existing.intervieweeUserId ? 'READY' : 'INVITED',
        completedAt: null,
        startedAt: null,
        invitedAt: existing.invitedAt || new Date(),
      },
      include: {
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        sessions: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            turns: {
              orderBy: [{ sortOrder: 'asc' }],
            },
            facts: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
            safetyFlags: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_INTERVIEW_REQUEST',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        reporterRunId: existing.reporterRun.id,
        inviteAction: 'reopened',
        status: updated.status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error reopening reporter interview:', error);
    return NextResponse.json(
      { error: 'Failed to reopen reporter interview' },
      { status: 500 }
    );
  }
}
