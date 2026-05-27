import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { materializeReporterStoryCandidates } from '@/lib/reporter/story-candidates';

const refreshStoryCandidatesSchema = z.object({
  limit: z.number().int().min(1).max(25).optional(),
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

    const body = await request.json().catch(() => ({}));
    const payload = refreshStoryCandidatesSchema.parse(body);

    const result = await materializeReporterStoryCandidates({
      communityId: currentCommunity.id,
      limit: payload.limit,
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_STORY_CANDIDATE',
      resourceId: currentCommunity.id,
      ipAddress,
      metadata: {
        communityId: currentCommunity.id,
        candidateCount: result.candidateCount,
        limit: payload.limit || null,
      },
    });

    return NextResponse.json({
      community: currentCommunity,
      candidateCount: result.candidateCount,
      candidates: result.candidates,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error refreshing reporter story candidates:', error);
    return NextResponse.json(
      { error: 'Failed to refresh reporter story candidates' },
      { status: 500 }
    );
  }
}
