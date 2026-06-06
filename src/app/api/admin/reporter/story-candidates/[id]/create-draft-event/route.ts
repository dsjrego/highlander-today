import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermission } from '@/lib/permissions';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { db } from '@/lib/db';
import { buildEventDatetime } from '@/lib/event-datetime';
import { REPORTER_EVENT_ORIENTED_SOURCE_TYPE_OPTIONS } from '@/lib/reporter/monitored-sources';

const CreateDraftEventSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal('')),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable().or(z.literal('')),
  locationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  venueLabel: z.string().trim().max(160).optional().nullable().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
});

const EVENT_ORIENTED_SOURCE_TYPE_SET = new Set<string>(REPORTER_EVENT_ORIENTED_SOURCE_TYPE_OPTIONS);

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

    if (!checkPermission(userRole, 'events:create') || !checkPermission(userRole, 'reporter:view')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers as Headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateDraftEventSchema.parse(body);

    const candidate = await db.reporterStoryCandidate.findFirst({
      where: {
        id: params.id,
        communityId: currentCommunity.id,
      },
      select: {
        id: true,
        title: true,
        summary: true,
        candidateType: true,
        eventExtractionJson: true,
        candidateItems: {
          select: {
            ingestionItem: {
              select: {
                monitoredSource: {
                  select: {
                    sourceType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Story candidate not found' }, { status: 404 });
    }

    const canSeedDraftEvent = candidate.candidateItems.some(({ ingestionItem }) =>
      EVENT_ORIENTED_SOURCE_TYPE_SET.has(ingestionItem.monitoredSource.sourceType)
    );

    if (
      candidate.candidateType === 'NEITHER' ||
      (!candidate.eventExtractionJson && !canSeedDraftEvent)
    ) {
      return NextResponse.json(
        { error: 'This story candidate does not have usable event extraction data.' },
        { status: 400 }
      );
    }

    const existingDraftEvent = await db.event.findFirst({
      where: {
        communityId: currentCommunity.id,
        reporterStoryCandidateId: candidate.id,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (existingDraftEvent) {
      return NextResponse.json(
        {
          error: 'A draft event has already been created from this reporter candidate.',
          event: existingDraftEvent,
        },
        { status: 409 }
      );
    }

    const [location, organization] = await Promise.all([
      db.location.findFirst({
        where: {
          id: validated.locationId,
          communityId: currentCommunity.id,
        },
        select: {
          id: true,
          name: true,
          addressLine1: true,
          city: true,
          state: true,
        },
      }),
      db.organization.findFirst({
        where: {
          id: validated.organizationId,
          communityId: currentCommunity.id,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const startDatetime = buildEventDatetime(validated.startDate, validated.startTime || null);
    const endDatetime = validated.endDate
      ? buildEventDatetime(validated.endDate, validated.endTime || null)
      : null;

    const createdEvent = await db.event.create({
      data: {
        title: validated.title,
        description: validated.description || candidate.summary || null,
        startDatetime,
        endDatetime,
        reporterStoryCandidateId: candidate.id,
        locationId: location.id,
        venueLabel: validated.venueLabel || null,
        photoUrl: validated.imageUrl || null,
        submittedByUserId: userId,
        communityId: currentCommunity.id,
        organizationId: organization.id,
        status: 'PENDING_REVIEW',
        isRecurring: false,
        recurrenceRule: null,
        seriesId: null,
        seriesPosition: null,
        seriesCount: null,
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
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'EVENT',
      resourceId: createdEvent.id,
      ipAddress,
      metadata: {
        seededFromReporterStoryCandidateId: candidate.id,
        seededFromReporterCandidateType: candidate.candidateType,
        seededWithoutEventExtraction: !candidate.eventExtractionJson,
        title: createdEvent.title,
        status: createdEvent.status,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        event: createdEvent,
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

    console.error('Failed to create draft event from reporter story candidate:', error);
    return NextResponse.json(
      { error: 'Failed to create draft event' },
      { status: 500 }
    );
  }
}
