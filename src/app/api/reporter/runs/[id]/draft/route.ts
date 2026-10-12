import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canGenerateReporterDraft } from '@/lib/reporter/permissions';
import { createReporterDraftForRun, loadReporterRunForDraft } from '@/lib/reporter/draft-service';
import { ReporterNeedsReportingError } from '@/lib/reporter/research-service';

export const maxDuration = 300;

const GenerateReporterDraftSchema = z.object({
  draftType: z.enum(['ARTICLE_DRAFT', 'SOURCE_PACKET_SUMMARY']).optional(),
  forceRefresh: z.boolean().optional(),
});

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    if (!run || (!currentCommunity || run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = GenerateReporterDraftSchema.parse(body);
    const { validation, persisted } = await createReporterDraftForRun({
      run,
      createdByUserId: userId,
      draftType: validated.draftType,
      forceRefresh: validated.forceRefresh,
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
        forceRefresh: validated.forceRefresh === true,
      },
    });

    return NextResponse.json({
      draft: persisted,
      validation,
    });
  } catch (error) {
    if (error instanceof ReporterNeedsReportingError) {
      return NextResponse.json({ error: error.message, needsReporting: true }, { status: 422 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && ['Completed interview output must be reviewed', 'Add at least one source', 'Resolve the open reporting issues', 'Reopen this story'].some((message) => error.message.includes(message))) {
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
