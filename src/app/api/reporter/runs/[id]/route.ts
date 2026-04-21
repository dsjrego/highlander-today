import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun, canViewReporterRun } from '@/lib/reporter/permissions';
import { assertReporterRunStatusTransition } from '@/lib/reporter/status';

const UpdateReporterRunSchema = z.object({
  title: z.string().trim().min(1).optional().nullable(),
  topic: z.string().trim().min(1).optional(),
  subjectName: z.string().trim().optional().nullable(),
  requestedArticleType: z.string().trim().optional().nullable(),
  requestSummary: z.string().trim().optional().nullable(),
  editorNotes: z.string().trim().optional().nullable(),
  publicDescription: z.string().trim().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  status: z
    .enum([
      'NEW',
      'NEEDS_REVIEW',
      'SOURCE_PACKET_IN_PROGRESS',
      'READY_FOR_DRAFT',
      'BLOCKED',
      'DRAFT_CREATED',
      'CONVERTED_TO_ARTICLE',
      'ARCHIVED',
    ])
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userRole = request.headers.get('x-user-role') || '';
    if (!canViewReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const run = await db.reporterRun.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        linkedArticle: {
          select: { id: true, title: true, slug: true, status: true },
        },
        sources: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        blockers: {
          orderBy: [{ isResolved: 'asc' }, { createdAt: 'desc' }],
          include: {
            resolvedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        drafts: {
          orderBy: [{ createdAt: 'desc' }],
        },
        validationIssues: {
          orderBy: [{ createdAt: 'desc' }],
        },
      },
    });

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('Error fetching reporter run:', error);
    return NextResponse.json({ error: 'Failed to fetch reporter run' }, { status: 500 });
  }
}

export async function PATCH(
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
    const existing = await db.reporterRun.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true, status: true },
    });

    if (!existing || (currentCommunity && existing.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateReporterRunSchema.parse(body);

    if (validated.status && validated.status !== existing.status) {
      assertReporterRunStatusTransition(existing.status, validated.status);
    }

    const updated = await db.reporterRun.update({
      where: { id: params.id },
      data: {
        ...(validated.title !== undefined ? { title: validated.title || null } : {}),
        ...(validated.topic !== undefined ? { topic: validated.topic } : {}),
        ...(validated.subjectName !== undefined
          ? { subjectName: validated.subjectName || null }
          : {}),
        ...(validated.requestedArticleType !== undefined
          ? { requestedArticleType: validated.requestedArticleType || null }
          : {}),
        ...(validated.requestSummary !== undefined
          ? { requestSummary: validated.requestSummary || null }
          : {}),
        ...(validated.editorNotes !== undefined
          ? { editorNotes: validated.editorNotes || null }
          : {}),
        ...(validated.publicDescription !== undefined
          ? { publicDescription: validated.publicDescription || null }
          : {}),
        ...(validated.assignedToUserId !== undefined
          ? { assignedToUserId: validated.assignedToUserId || null }
          : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: updated.id,
      ipAddress,
      metadata: {
        status: updated.status,
        assignedToUserId: updated.assignedToUserId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating reporter run:', error);
    return NextResponse.json({ error: 'Failed to update reporter run' }, { status: 500 });
  }
}
