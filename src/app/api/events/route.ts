import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

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
  organizationId: z.string().uuid().optional().or(z.literal('')),
});

function buildDatetime(dateStr: string, timeStr?: string): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
  }
  return new Date(`${dateStr}T00:00:00`);
}

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

    const organizationId = validated.organizationId || undefined;

    if (organizationId) {
      const organization = await db.organization.findFirst({
        where: {
          id: organizationId,
          communityId: community.id,
        },
        select: {
          id: true,
        },
      });

      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
    }

    const startDatetime = buildDatetime(validated.startDate, validated.startTime);
    const endDatetime = validated.endDate
      ? buildDatetime(validated.endDate, validated.endTime)
      : null;

    const event = await db.event.create({
      data: {
        title: validated.title,
        description: validated.description || null,
        startDatetime,
        endDatetime,
        locationId: validated.locationId,
        venueLabel: validated.venueLabel || null,
        costText: validated.costText || null,
        contactInfo: validated.contactInfo || null,
        photoUrl: validated.imageUrl || null,
        submittedByUserId: userId,
        communityId: community.id,
        organizationId: organizationId || null,
        status: checkPermission(userRole, 'events:approve')
          ? validated.status || 'PENDING_REVIEW'
          : 'PENDING_REVIEW',
      },
      include: {
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

    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'EVENT',
      resourceId: event.id,
      ipAddress,
      metadata: { title: event.title, status: event.status },
    }).catch(() => {});

    return NextResponse.json(event, { status: 201 });
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
