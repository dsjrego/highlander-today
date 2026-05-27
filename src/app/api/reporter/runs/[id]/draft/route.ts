import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canGenerateReporterDraft } from '@/lib/reporter/permissions';
import { createReporterDraftForRun, loadReporterRunForDraft } from '@/lib/reporter/draft-service';

const GenerateReporterDraftSchema = z.object({
  draftType: z.enum(['ARTICLE_DRAFT', 'SOURCE_PACKET_SUMMARY']).optional(),
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

    if (!canGenerateReporterDraft(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const run = await loadReporterRunForDraft(params.id);

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = GenerateReporterDraftSchema.parse(body);
    const { validation, persisted } = await createReporterDraftForRun({
      run,
      createdByUserId: userId,
      draftType: validated.draftType,
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'REPORTER_DRAFT',
      resourceId: persisted.id,
      ipAddress,
      metadata: {
        reporterRunId: run.id,
        hasCriticalIssues: validation.hasCriticalIssues,
        issueCount: validation.issues.length,
      },
    });

    return NextResponse.json({
      draft: persisted,
      validation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('Completed interview output must be reviewed')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error generating reporter draft:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate reporter draft' },
      { status: 500 }
    );
  }
}
