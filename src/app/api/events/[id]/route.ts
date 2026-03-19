import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const UpdateEventSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional(),
  location: z.string().max(255).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  costText: z.string().max(255).optional().nullable(),
  contactInfo: z.string().max(255).optional().nullable(),
});

function buildDatetime(dateStr: string, timeStr?: string | null): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
  }
  return new Date(`${dateStr}T00:00:00`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await db.event.findUnique({
      where: { id: params.id },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            bio: true,
            trustLevel: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'PUBLISHED') {
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role') || '';
      const isAuthor = event.submittedByUserId === userId;
      const hasEditorRole = checkPermission(userRole, 'events:approve');

      if (!isAuthor && !hasEditorRole) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
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

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await db.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isAuthor = event.submittedByUserId === userId;
    const hasEditorRole = checkPermission(userRole, 'events:edit');

    if (!isAuthor && !hasEditorRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateEventSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.location !== undefined) updateData.locationText = validated.location;
    if (validated.imageUrl !== undefined) updateData.photoUrl = validated.imageUrl;
    if (validated.costText !== undefined) updateData.costText = validated.costText;
    if (validated.contactInfo !== undefined) updateData.contactInfo = validated.contactInfo;

    if (validated.startDate) {
      updateData.startDatetime = buildDatetime(validated.startDate, validated.startTime);
    }

    if (validated.endDate !== undefined) {
      updateData.endDatetime = validated.endDate
        ? buildDatetime(validated.endDate, validated.endTime)
        : null;
    }

    if (isAuthor && !hasEditorRole && event.status !== 'PENDING_REVIEW') {
      updateData.status = 'PENDING_REVIEW';
    }

    const updated = await db.event.update({
      where: { id: params.id },
      data: updateData,
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            bio: true,
            trustLevel: true,
          },
        },
      },
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'EVENT',
      resourceId: event.id,
      ipAddress,
      metadata: { title: updated.title, status: updated.status },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await db.event.findUnique({
      where: { id: params.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const isAuthor = event.submittedByUserId === userId;
    const canDelete = checkPermission(userRole, 'events:delete');

    if (!isAuthor && !canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await db.event.delete({
      where: { id: params.id },
    });

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'EVENT',
      resourceId: event.id,
      ipAddress,
      metadata: {
        title: event.title,
        status: event.status,
        startDatetime: event.startDatetime,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
