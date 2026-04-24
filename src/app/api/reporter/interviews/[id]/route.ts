import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  Prisma,
  ReporterInterviewPriority,
  ReporterInterviewRequestStatus,
  ReporterInterviewType,
  ReporterSupportedLanguage,
} from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun, canViewReporterRun } from '@/lib/reporter/permissions';
import {
  getReporterInterviewAccessState,
  normalizeOptionalReporterText,
} from '@/lib/reporter/interview';
import { normalizeReporterInterviewIdentity } from '@/lib/reporter/interview-identity';

const UpdateReporterInterviewSchema = z.object({
  status: z.nativeEnum(ReporterInterviewRequestStatus).optional(),
  interviewType: z.nativeEnum(ReporterInterviewType).optional(),
  priority: z.nativeEnum(ReporterInterviewPriority).optional(),
  intervieweeName: z.string().trim().min(1).optional(),
  intervieweeUserId: z.string().uuid().optional().nullable(),
  inviteEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  relationshipToStory: z.string().trim().optional().nullable(),
  purpose: z.string().trim().min(1).optional(),
  editorBrief: z.string().trim().optional().nullable(),
  mustLearn: z.string().trim().optional().nullable(),
  knownContext: z.string().trim().optional().nullable(),
  sensitivityNotes: z.string().trim().optional().nullable(),
  suggestedLanguage: z.nativeEnum(ReporterSupportedLanguage).optional(),
  nativeLanguage: z.nativeEnum(ReporterSupportedLanguage).optional().nullable(),
  interviewLanguage: z.nativeEnum(ReporterSupportedLanguage).optional().nullable(),
  requiresTranslationSupport: z.boolean().optional(),
  scheduledFor: z.string().datetime().optional().nullable().or(z.literal('')),
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
    const interview = await db.reporterInterviewRequest.findUnique({
      where: { id: params.id },
      include: {
        reporterRun: {
          select: { id: true, communityId: true, topic: true, title: true },
        },
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
    });

    if (
      !interview ||
      (currentCommunity && interview.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Reporter interview not found' }, { status: 404 });
    }

    return NextResponse.json(interview);
  } catch (error) {
    console.error('Error fetching reporter interview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporter interview' },
      { status: 500 }
    );
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
    const existing = await db.reporterInterviewRequest.findUnique({
      where: { id: params.id },
      include: {
        reporterRun: {
          select: { id: true, communityId: true },
        },
      },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Reporter interview not found' }, { status: 404 });
    }

    const body = await request.json();
    const payload = UpdateReporterInterviewSchema.parse(body);
    const nextInviteEmail =
      payload.inviteEmail !== undefined
        ? normalizeOptionalReporterText(payload.inviteEmail)
        : existing.inviteEmail;
    const nextIntervieweeUserId =
      payload.intervieweeUserId !== undefined
        ? payload.intervieweeUserId || null
        : existing.intervieweeUserId;
    const nextIntervieweeName =
      payload.intervieweeName !== undefined
        ? payload.intervieweeName.trim()
        : existing.intervieweeName;
    const normalizedIdentity = await normalizeReporterInterviewIdentity({
      communityId: existing.reporterRun.communityId,
      intervieweeUserId: nextIntervieweeUserId,
      inviteEmail: nextInviteEmail,
      intervieweeName: nextIntervieweeName,
    });
    const nextStatus = payload.status ?? existing.status;
    const accessState = getReporterInterviewAccessState(nextStatus);
    const data: Prisma.ReporterInterviewRequestUncheckedUpdateInput = {
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.interviewType !== undefined
        ? { interviewType: payload.interviewType }
        : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      intervieweeName: normalizedIdentity.intervieweeName,
      intervieweeUserId: normalizedIdentity.intervieweeUserId,
      inviteEmail: normalizedIdentity.inviteEmail,
      ...(payload.relationshipToStory !== undefined
          ? { relationshipToStory: normalizeOptionalReporterText(payload.relationshipToStory) }
          : {}),
      ...(payload.purpose !== undefined ? { purpose: payload.purpose.trim() } : {}),
      ...(payload.editorBrief !== undefined
        ? { editorBrief: normalizeOptionalReporterText(payload.editorBrief) }
        : {}),
      ...(payload.mustLearn !== undefined
        ? { mustLearn: normalizeOptionalReporterText(payload.mustLearn) }
        : {}),
      ...(payload.knownContext !== undefined
        ? { knownContext: normalizeOptionalReporterText(payload.knownContext) }
        : {}),
      ...(payload.sensitivityNotes !== undefined
        ? { sensitivityNotes: normalizeOptionalReporterText(payload.sensitivityNotes) }
        : {}),
      ...(payload.suggestedLanguage !== undefined
        ? { suggestedLanguage: payload.suggestedLanguage }
        : {}),
      ...(payload.nativeLanguage !== undefined
        ? { nativeLanguage: payload.nativeLanguage || null }
        : {}),
      ...(payload.interviewLanguage !== undefined
        ? { interviewLanguage: payload.interviewLanguage || null }
        : {}),
      ...(payload.requiresTranslationSupport !== undefined
        ? { requiresTranslationSupport: payload.requiresTranslationSupport }
        : {}),
      ...(payload.scheduledFor !== undefined
        ? { scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null }
        : {}),
      ...(accessState.isDraft || accessState.isClosed
        ? { invitedAt: null }
        : {}),
    };

    const updatedInterview = await db.reporterInterviewRequest.update({
      where: { id: params.id },
      data,
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
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_INTERVIEW_REQUEST',
      resourceId: updatedInterview.id,
      ipAddress,
      metadata: {
        reporterRunId: existing.reporterRun.id,
        status: updatedInterview.status,
        interviewType: updatedInterview.interviewType,
        priority: updatedInterview.priority,
      },
    });

    return NextResponse.json(updatedInterview);
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
    console.error('Error updating reporter interview:', error);
    return NextResponse.json(
      { error: 'Failed to update reporter interview' },
      { status: 500 }
    );
  }
}
