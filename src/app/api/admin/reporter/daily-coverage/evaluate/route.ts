import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { evaluateReporterDailyCoverage } from '@/lib/reporter/daily-coverage';

const ReporterDailyCoverageEvaluationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId || !canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const payload = ReporterDailyCoverageEvaluationSchema.parse(
      await request.json().catch(() => ({}))
    );

    const desk = await evaluateReporterDailyCoverage({
      communityId: currentCommunity.id,
      date: payload.date,
      createdByUserId: userId,
    });

    if (desk.decision) {
      await logActivity({
        userId,
        action: 'UPDATE',
        resourceType: 'REPORTER_DAILY_COVERAGE_DECISION',
        resourceId: desk.decision.id,
        ipAddress,
        metadata: {
          communityId: currentCommunity.id,
          date: desk.date,
          outcome: desk.decision.outcome,
          storyCandidateId: desk.decision.storyCandidate?.id || null,
          reporterRunId: desk.decision.reporterRun?.id || null,
          selectedScore: desk.decision.selectedScore,
          analysisStatus: desk.decision.analysisStatus,
          analysisDraftId: desk.decision.analysisDraft?.id || null,
          articleStatus: desk.decision.articleStatus,
          articleDraftId: desk.decision.articleDraft?.id || null,
        },
      });
    }

    return NextResponse.json(desk);
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
      { error: 'Failed to evaluate reporter daily coverage desk' },
      { status: 500 }
    );
  }
}
