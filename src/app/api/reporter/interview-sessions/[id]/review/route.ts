import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun, canViewReporterRun } from '@/lib/reporter/permissions';

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

    if (!canEditReporterRun(userRole) && !canViewReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const existing = await db.reporterInterviewSession.findUnique({
      where: { id: params.id },
      include: {
        interviewRequest: {
          include: {
            reporterRun: {
              select: { id: true, communityId: true },
            },
          },
        },
        safetyFlags: {
          include: {
            blocker: true,
          },
        },
      },
    });

    if (
      !existing ||
      (currentCommunity &&
        existing.interviewRequest.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    if (existing.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed interview sessions can be marked reviewed.' },
        { status: 400 }
      );
    }

    const unresolvedSafetyFlags = existing.safetyFlags.filter(
      (flag) => flag.blockerId && !flag.blocker?.isResolved
    );

    if (unresolvedSafetyFlags.length > 0) {
      return NextResponse.json(
        {
          error:
            'Resolve linked interview safety blockers before marking this session reviewed.',
        },
        { status: 400 }
      );
    }

    const reviewedSession = await db.reporterInterviewSession.update({
      where: { id: existing.id },
      data: {
        reviewedAt: new Date(),
        reviewedByUserId: userId,
      },
      include: {
        turns: {
          orderBy: [{ sortOrder: 'asc' }],
        },
        facts: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        safetyFlags: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            blocker: true,
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_INTERVIEW_REQUEST',
      resourceId: existing.interviewRequestId,
      ipAddress,
      metadata: {
        reporterRunId: existing.interviewRequest.reporterRun.id,
        interviewSessionReviewed: reviewedSession.id,
      },
    });

    return NextResponse.json(reviewedSession);
  } catch (error) {
    console.error('Error reviewing reporter interview session:', error);
    return NextResponse.json(
      { error: 'Failed to review reporter interview session' },
      { status: 500 }
    );
  }
}
