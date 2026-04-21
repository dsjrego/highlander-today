import { NextRequest, NextResponse } from 'next/server';
import { ReporterDraftStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canGenerateReporterDraft } from '@/lib/reporter/permissions';
import { buildReporterSourcePacket } from '@/lib/reporter/source-packet';
import { generateReporterDraftWithValidation } from '@/lib/reporter/draft-generator';

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
    const run = await db.reporterRun.findUnique({
      where: { id: params.id },
      include: {
        sources: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = GenerateReporterDraftSchema.parse(body);
    const packet = buildReporterSourcePacket(run, run.sources);
    const { draft, validation } = await generateReporterDraftWithValidation(
      packet,
      validated.draftType
    );

    const persisted = await db.$transaction(async (tx) => {
      const createdDraft = await tx.reporterDraft.create({
        data: {
          reporterRunId: run.id,
          headline: draft.headline,
          dek: draft.dek,
          body: draft.body,
          draftType: draft.draftType,
          status: ReporterDraftStatus.GENERATED,
          modelProvider: draft.modelProvider,
          modelName: draft.modelName,
          generationNotes: draft.generationNotes,
          createdByUserId: userId,
        },
      });

      if (validation.issues.length > 0) {
        await tx.reporterValidationIssue.createMany({
          data: validation.issues.map((issue) => ({
            reporterRunId: run.id,
            reporterDraftId: createdDraft.id,
            code: issue.code,
            severity: issue.severity,
            message: issue.message,
            evidenceSpan: issue.evidenceSpan || null,
          })),
        });
      }

      await tx.reporterRun.update({
        where: { id: run.id },
        data: {
          status:
            draft.draftType === 'SOURCE_PACKET_SUMMARY'
              ? validation.hasCriticalIssues
                ? 'BLOCKED'
                : run.status
              : validation.hasCriticalIssues
                ? 'BLOCKED'
                : run.linkedArticleId
                  ? 'CONVERTED_TO_ARTICLE'
                  : 'DRAFT_CREATED',
        },
      });

      return createdDraft;
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
