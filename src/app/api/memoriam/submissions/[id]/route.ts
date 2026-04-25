import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const UpdateMemoriamSubmissionSchema = z.object({
  status: z
    .enum(['DRAFT', 'PENDING_REVIEW', 'NEEDS_CLARIFICATION', 'APPROVED', 'REJECTED'])
    .optional(),
  reviewNotes: z.string().trim().max(4000).nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canReviewMemoriam(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const body = await request.json();
    const validated = UpdateMemoriamSubmissionSchema.parse(body);

    const existingSubmission = await db.memorialSubmission.findFirst({
      where: {
        id: params.id,
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
      },
      select: {
        id: true,
        communityId: true,
        status: true,
        memorialPerson: {
          select: {
            fullName: true,
          },
        },
        memorialPage: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Memoriam submission not found' }, { status: 404 });
    }

    const nextStatus = validated.status ?? existingSubmission.status;
    const nextPageStatus =
      nextStatus === 'APPROVED'
        ? 'PUBLISHED'
        : nextStatus === 'REJECTED'
          ? 'REJECTED'
          : nextStatus === 'PENDING_REVIEW'
            ? 'PENDING_REVIEW'
            : 'DRAFT';

    const updated = await db.$transaction(async (tx) => {
      const submission = await tx.memorialSubmission.update({
        where: { id: existingSubmission.id },
        data: {
          ...(validated.status ? { status: validated.status } : {}),
          ...(validated.assignedToUserId !== undefined
            ? { assignedToUserId: validated.assignedToUserId }
            : {}),
          ...(validated.reviewNotes !== undefined
            ? { reviewNotes: validated.reviewNotes?.trim() || null }
            : {}),
          ...(validated.status === 'APPROVED' || validated.status === 'REJECTED'
            ? {
                reviewedByUserId: userId,
                reviewedAt: new Date(),
              }
            : {}),
          auditLogs: {
            create: {
              communityId: existingSubmission.communityId,
              actorUserId: userId,
              action: 'UPDATE_SUBMISSION',
              note: validated.reviewNotes?.trim() || null,
              metadata: {
                previousStatus: existingSubmission.status,
                nextStatus,
                assignedToUserId: validated.assignedToUserId ?? null,
              },
            },
          },
        },
        select: {
          id: true,
          submissionType: true,
          status: true,
          relationshipToDeceased: true,
          requesterName: true,
          requesterEmail: true,
          summary: true,
          reviewNotes: true,
          updatedAt: true,
          reviewedAt: true,
          memorialPerson: {
            select: {
              fullName: true,
              deathDate: true,
              townName: true,
            },
          },
          memorialPage: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              pageType: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              verifications: true,
              auditLogs: true,
            },
          },
        },
      });

      if (existingSubmission.memorialPage?.id) {
        await tx.memorialPage.update({
          where: { id: existingSubmission.memorialPage.id },
          data: {
            status: nextPageStatus,
            ...(nextStatus === 'APPROVED'
              ? {
                  approvedByUserId: userId,
                  approvedAt: new Date(),
                  publishedAt: new Date(),
                }
              : {}),
          },
        });
      }

      return submission;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating memoriam submission:', error);
    return NextResponse.json(
      { error: 'Failed to update memoriam submission' },
      { status: 500 }
    );
  }
}
