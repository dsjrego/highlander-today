import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildEventOccurrences, buildEventSeriesSummary, EVENT_SERIES_CADENCE } from '@/lib/event-series';
import { buildEventDatetime } from '@/lib/event-datetime';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const RecurrenceSchema = z.object({
  enabled: z.boolean().default(false),
  cadence: z.enum([
    EVENT_SERIES_CADENCE.WEEKLY,
    EVENT_SERIES_CADENCE.MONTHLY_DATE,
    EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY,
  ]).optional(),
  occurrenceCount: z.coerce.number().int().min(2).max(24).optional(),
});

const CreateEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  startDate: z.string(),      // date string from form (YYYY-MM-DD)
  startTime: z.string().optional(), // time string (HH:MM)
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  locationId: z.string().uuid(),
  venueLabel: z.string().trim().max(160).optional().or(z.literal('')),
  costText: z.string().optional(),
  contactInfo: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(['PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED']).optional(),
  organizationId: z.string().uuid(),
  recurrence: RecurrenceSchema.optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const communityId = request.headers.get('x-community-id') || '';

    const community = communityId
      ? await db.community.findUnique({ where: { id: communityId } })
      : await db.community.findFirst();
    if (!community) {
      return NextResponse.json({ events: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const where = {
      communityId: community.id,
      status: 'PUBLISHED' as const,
      startDatetime: {
        gte: new Date(),
      },
    };

    const total = await db.event.count({ where });
    const events = await db.event.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        series: {
          select: {
            id: true,
            cadenceLabel: true,
            summary: true,
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
          select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
      orderBy: { startDatetime: 'asc' },
    });

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'events:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateEventSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');

    const communityId = request.headers.get('x-community-id') || '';
    const community = communityId
      ? await db.community.findUnique({ where: { id: communityId } })
      : await db.community.findFirst();
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const location = await db.location.findFirst({
      where: {
        id: validated.locationId,
        communityId: community.id,
      },
      select: {
        id: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const organization = await db.organization.findFirst({
      where: {
        id: validated.organizationId,
        communityId: community.id,
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const startDatetime = buildEventDatetime(validated.startDate, validated.startTime);
    const endDatetime = validated.endDate
      ? buildEventDatetime(validated.endDate, validated.endTime)
      : null;

    const cadence = validated.recurrence?.enabled ? validated.recurrence.cadence || EVENT_SERIES_CADENCE.WEEKLY : null;
    const occurrenceCount = validated.recurrence?.enabled ? validated.recurrence.occurrenceCount || 2 : 1;
    const nextStatus = checkPermission(userRole, 'events:approve')
      ? validated.status || 'PENDING_REVIEW'
      : 'PENDING_REVIEW';

    const created = await db.$transaction(async (tx) => {
      const series = cadence
        ? await tx.eventSeries.create({
            data: {
              communityId: community.id,
              createdByUserId: userId,
              organizationId: validated.organizationId,
              title: validated.title,
              summary: buildEventSeriesSummary({ startDatetime, cadenceLabel: cadence, occurrenceCount }),
              cadenceLabel: cadence,
              occurrenceCount,
            },
            select: { id: true },
          })
        : null;

      const occurrences = cadence
        ? buildEventOccurrences({
            startDatetime,
            endDatetime,
            cadenceLabel: cadence,
            occurrenceCount,
          })
        : [{ startDatetime, endDatetime, seriesPosition: null }];

      const createdEvents = [];

      for (const occurrence of occurrences) {
        const createdEvent = await tx.event.create({
          data: {
            title: validated.title,
            description: validated.description || null,
            startDatetime: occurrence.startDatetime,
            endDatetime: occurrence.endDatetime,
            locationId: validated.locationId,
            venueLabel: validated.venueLabel || null,
            costText: validated.costText || null,
            contactInfo: validated.contactInfo || null,
            photoUrl: validated.imageUrl || null,
            submittedByUserId: userId,
            communityId: community.id,
            organizationId: validated.organizationId,
            status: nextStatus,
            isRecurring: Boolean(series),
            recurrenceRule: series ? buildEventSeriesSummary({ startDatetime, cadenceLabel: cadence!, occurrenceCount }) : null,
            seriesId: series?.id || null,
            seriesPosition: occurrence.seriesPosition,
            seriesCount: series ? occurrenceCount : null,
          },
          include: {
            series: {
              select: {
                id: true,
                cadenceLabel: true,
                summary: true,
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
            organization: {
              select: { id: true, name: true },
            },
            submittedBy: {
              select: { id: true, firstName: true, lastName: true, profilePhotoUrl: true },
            },
          },
        });

        createdEvents.push(createdEvent);
      }

      return {
        primaryEvent: createdEvents[0],
        createdEvents,
      };
    });

    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'EVENT',
      resourceId: created.primaryEvent.id,
      ipAddress,
      metadata: {
        title: created.primaryEvent.title,
        status: created.primaryEvent.status,
        createdCount: created.createdEvents.length,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        ...created.primaryEvent,
        primaryEvent: created.primaryEvent,
        createdEvents: created.createdEvents,
        createdCount: created.createdEvents.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
