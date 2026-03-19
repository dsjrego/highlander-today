import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const ApproveSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'events:approve')) {
      return NextResponse.json(
        { error: 'Insufficient permissions — Editor or above required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = ApproveSchema.parse(body);

    const event = await db.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Event is not pending review (current status: ${event.status})` },
        { status: 400 }
      );
    }

    const updated = await db.event.update({
      where: { id: params.id },
      data: {
        status: validated.approved ? 'PUBLISHED' : 'UNPUBLISHED',
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: validated.approved ? 'APPROVE' : 'REJECT',
      resourceType: 'EVENT',
      resourceId: event.id,
      ipAddress,
      metadata: {
        title: event.title,
        approved: validated.approved,
        rejectionReason: validated.rejectionReason,
      },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error approving event:', error);
    return NextResponse.json(
      { error: 'Failed to approve event' },
      { status: 500 }
    );
  }
}
