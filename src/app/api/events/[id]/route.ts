import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { EVENT_SERIES_CADENCE } from '@/lib/event-series';
import {
  deleteEventAndSeries,
  EventMutationError,
  SERIES_EDIT_SCOPE,
  updateEventAndSeries,
} from '@/lib/event-series-mutations';
import { z } from 'zod';

const UpdateEventSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  startDate: z.string().optional(),
  startTime: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  locationId: z.string().uuid().optional(),
  venueLabel: z.string().max(160).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  costText: z.string().max(255).optional().nullable(),
  contactInfo: z.string().max(255).optional().nullable(),
  status: z.enum(['PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED']).optional(),
  recurrenceCadence: z
    .enum([
      EVENT_SERIES_CADENCE.WEEKLY,
      EVENT_SERIES_CADENCE.MONTHLY_DATE,
      EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY,
    ])
    .optional(),
  seriesEditScope: z.enum([SERIES_EDIT_SCOPE.SINGLE, SERIES_EDIT_SCOPE.FUTURE, SERIES_EDIT_SCOPE.SERIES]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await db.event.findUnique({
      where: { id: params.id },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            summary: true,
            cadenceLabel: true,
            occurrenceCount: true,
            events: {
              orderBy: { startDatetime: 'asc' },
              select: {
                id: true,
                title: true,
                status: true,
                startDatetime: true,
                endDatetime: true,
                seriesPosition: true,
                seriesCount: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
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
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
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
    } else if (event.series) {
      event.series.events = event.series.events.filter((entry) => entry.status === 'PUBLISHED');
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
    const hasApprovalRole = checkPermission(userRole, 'events:approve');

    if (!isAuthor && !hasEditorRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateEventSchema.parse(body);

    const mutationResult = await updateEventAndSeries({
      event,
      userId,
      isAuthor,
      hasEditorRole,
      hasApprovalRole,
      validated,
    });

    const updated = await db.event.findUnique({
      where: { id: params.id },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            summary: true,
            cadenceLabel: true,
            occurrenceCount: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
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
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Event not found after update' }, { status: 404 });
    }

    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'EVENT',
      resourceId: event.id,
      ipAddress,
      metadata: {
        title: updated.title,
        status: updated.status,
        seriesEditScope: mutationResult.seriesEditScope,
        affectedEventCount: mutationResult.affectedEventCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      ...updated,
      affectedEventCount: mutationResult.affectedEventCount,
      seriesEditScope: mutationResult.seriesEditScope,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof EventMutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
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

    const requestedScope = event.seriesId
      ? z
          .object({
            seriesEditScope: z.enum([SERIES_EDIT_SCOPE.SINGLE, SERIES_EDIT_SCOPE.FUTURE, SERIES_EDIT_SCOPE.SERIES]).optional(),
          })
          .parse((await request.json().catch(() => ({}))) || {}).seriesEditScope
      : undefined;
    const mutationResult = await deleteEventAndSeries({
      event,
      seriesEditScope: requestedScope,
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
        seriesEditScope: mutationResult.seriesEditScope,
        affectedEventCount: mutationResult.deletedCount,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      deletedCount: mutationResult.deletedCount,
      seriesEditScope: mutationResult.seriesEditScope,
    });
  } catch (error) {
    if (error instanceof EventMutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
