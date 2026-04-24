import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
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
  normalizeOptionalReporterText,
} from '@/lib/reporter/interview';
import { normalizeReporterInterviewIdentity } from '@/lib/reporter/interview-identity';

const CreateReporterInterviewSchema = z.object({
  status: z.nativeEnum(ReporterInterviewRequestStatus).optional(),
  interviewType: z.nativeEnum(ReporterInterviewType),
  priority: z.nativeEnum(ReporterInterviewPriority).optional(),
  intervieweeName: z.string().trim().min(1),
  intervieweeUserId: z.string().uuid().optional().nullable(),
  inviteEmail: z.string().trim().email().optional().nullable().or(z.literal('')),
  relationshipToStory: z.string().trim().optional().nullable(),
  purpose: z.string().trim().min(1),
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
    const run = await db.reporterRun.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        communityId: true,
      },
    });

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const interviews = await db.reporterInterviewRequest.findMany({
      where: { reporterRunId: params.id },
      include: {
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        sessions: {
          orderBy: [{ createdAt: 'desc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error('Error fetching reporter interviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporter interviews' },
      { status: 500 }
    );
  }
}

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

    if (!canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const run = await db.reporterRun.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        communityId: true,
      },
    });

    if (!run || (currentCommunity && run.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json();
    const payload = CreateReporterInterviewSchema.parse(body);
    const normalizedIdentity = await normalizeReporterInterviewIdentity({
      communityId: run.communityId,
      intervieweeUserId: payload.intervieweeUserId || null,
      inviteEmail: normalizeOptionalReporterText(payload.inviteEmail),
      intervieweeName: payload.intervieweeName,
    });

    const createdInterview = await db.reporterInterviewRequest.create({
      data: {
        reporterRunId: params.id,
        status: payload.status || 'DRAFT',
        interviewType: payload.interviewType,
        priority: payload.priority || 'NORMAL',
        intervieweeName: normalizedIdentity.intervieweeName,
        intervieweeUserId: normalizedIdentity.intervieweeUserId,
        inviteEmail: normalizedIdentity.inviteEmail,
        relationshipToStory: normalizeOptionalReporterText(payload.relationshipToStory),
        purpose: payload.purpose.trim(),
        editorBrief: normalizeOptionalReporterText(payload.editorBrief),
        mustLearn: normalizeOptionalReporterText(payload.mustLearn),
        knownContext: normalizeOptionalReporterText(payload.knownContext),
        sensitivityNotes: normalizeOptionalReporterText(payload.sensitivityNotes),
        suggestedLanguage: payload.suggestedLanguage || 'ENGLISH',
        nativeLanguage: payload.nativeLanguage || null,
        interviewLanguage: payload.interviewLanguage || null,
        requiresTranslationSupport: Boolean(payload.requiresTranslationSupport),
        scheduledFor: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
        createdByUserId: userId,
      },
      include: {
        interviewee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        sessions: {
          orderBy: [{ createdAt: 'desc' }],
        },
      },
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'REPORTER_INTERVIEW_REQUEST',
      resourceId: createdInterview.id,
      ipAddress,
      metadata: {
        reporterRunId: params.id,
        interviewType: createdInterview.interviewType,
        priority: createdInterview.priority,
        status: createdInterview.status,
      },
    });

    return NextResponse.json(createdInterview, { status: 201 });
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
    console.error('Error creating reporter interview:', error);
    return NextResponse.json(
      { error: 'Failed to create reporter interview' },
      { status: 500 }
    );
  }
}
