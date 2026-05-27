import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { upsertReporterDailyCoverageGoal } from '@/lib/reporter/daily-coverage';

const ReporterDailyCoverageGoalSchema = z.object({
  placeId: z.string().uuid().optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  targetArticleCount: z.number().int().min(1).max(3).optional(),
  minimumCandidateScore: z.number().int().min(1).max(20).optional(),
  freshnessWindowHours: z.number().int().min(6).max(168).optional(),
  allowNeedsReportingFallback: z.boolean().optional(),
  isActive: z.boolean().optional(),
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

    const payload = ReporterDailyCoverageGoalSchema.parse(await request.json());
    const goal = await upsertReporterDailyCoverageGoal({
      communityId: currentCommunity.id,
      ...payload,
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_DAILY_COVERAGE_DECISION',
      resourceId: goal.id,
      ipAddress,
      metadata: {
        communityId: currentCommunity.id,
        placeId: goal.placeId,
        minimumCandidateScore: goal.minimumCandidateScore,
        freshnessWindowHours: goal.freshnessWindowHours,
        allowNeedsReportingFallback: goal.allowNeedsReportingFallback,
      },
    });

    return NextResponse.json({ goal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving reporter daily coverage goal:', error);
    return NextResponse.json(
      { error: 'Failed to save reporter daily coverage goal' },
      { status: 500 }
    );
  }
}
