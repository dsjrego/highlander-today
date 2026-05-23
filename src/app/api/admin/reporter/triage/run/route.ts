import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { runReporterTriageForRun } from '@/lib/reporter/reporter-triage-service';

const RunReporterTriageSchema = z.object({
  reporterRunId: z.string().uuid(),
});

async function fetchReporterRunDetail(runId: string) {
  return db.reporterRun.findUnique({
    where: { id: runId },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      linkedArticle: { select: { id: true, title: true, slug: true, status: true } },
      sources: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      blockers: {
        orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
        include: {
          resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      agentTasks: {
        orderBy: [{ createdAt: 'desc' }],
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          traces: {
            orderBy: [{ createdAt: 'desc' }],
          },
        },
      },
      agentTraces: {
        orderBy: [{ createdAt: 'desc' }],
      },
      claims: {
        orderBy: [{ createdAt: 'desc' }],
        include: {
          reporterSource: {
            select: {
              id: true,
              sourceType: true,
              title: true,
              url: true,
              publisher: true,
            },
          },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      drafts: { orderBy: [{ createdAt: 'desc' }] },
      validationIssues: { orderBy: [{ createdAt: 'desc' }] },
      interviewRequests: {
        orderBy: [{ createdAt: 'desc' }],
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
                include: {
                  blocker: true,
                },
              },
              reviewedBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function POST(request: NextRequest) {
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

    const payload = RunReporterTriageSchema.parse(await request.json());
    const currentCommunity = await getCurrentCommunity({ headers: request.headers });

    const existingRun = await db.reporterRun.findUnique({
      where: { id: payload.reporterRunId },
      select: { id: true, communityId: true, topic: true, title: true },
    });

    if (!existingRun || (currentCommunity && existingRun.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const result = await runReporterTriageForRun({
      reporterRunId: existingRun.id,
      createdByUserId: userId,
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existingRun.id,
      ipAddress,
      metadata: {
        triageTaskId: result.task.id,
        triageTraceId: result.trace.id,
        classifications: result.triageSummary.classifications,
      },
    });

    const run = await fetchReporterRunDetail(existingRun.id);

    return NextResponse.json({
      task: result.task,
      trace: result.trace,
      triageSummary: result.triageSummary,
      run,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Failed to run reporter triage' },
      { status: 500 }
    );
  }
}
