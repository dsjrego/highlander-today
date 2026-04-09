import {
  EVENT_SERIES_CADENCE,
  type EventSeriesCadence,
  buildEventOccurrences,
  buildEventSeriesSummary,
  buildSeriesEventPositions,
  getScopedSeriesEventIds,
} from '@/lib/event-series';
import { db } from '@/lib/db';
import { buildEventDatetime, formatEventDateInput, formatEventTimeInput } from '@/lib/event-datetime';

export const SERIES_EDIT_SCOPE = {
  SINGLE: 'SINGLE',
  FUTURE: 'FUTURE',
  SERIES: 'SERIES',
} as const;

export type SeriesEditScope = (typeof SERIES_EDIT_SCOPE)[keyof typeof SERIES_EDIT_SCOPE];
export type EventStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
export type EventUpdateInput = {
  title?: string;
  description?: string | null;
  startDate?: string;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  locationId?: string;
  venueLabel?: string | null;
  imageUrl?: string | null;
  costText?: string | null;
  contactInfo?: string | null;
  status?: EventStatus;
  recurrenceCadence?: (typeof EVENT_SERIES_CADENCE)[keyof typeof EVENT_SERIES_CADENCE];
  seriesEditScope?: SeriesEditScope;
};

interface MutableEventRecord {
  id: string;
  title: string;
  submittedByUserId: string;
  communityId: string;
  organizationId: string | null;
  status: EventStatus;
  seriesId: string | null;
  startDatetime: Date;
  endDatetime: Date | null;
}

interface UpdateEventMutationOptions {
  event: MutableEventRecord;
  userId: string;
  isAuthor: boolean;
  hasEditorRole: boolean;
  hasApprovalRole: boolean;
  validated: EventUpdateInput;
}

interface DeleteEventMutationOptions {
  event: MutableEventRecord;
  seriesEditScope?: SeriesEditScope;
}

export class EventMutationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'EventMutationError';
    this.status = status;
  }
}

function hasDateChanges(validated: EventUpdateInput) {
  return validated.startDate !== undefined || validated.endDate !== undefined;
}

function hasTimeChanges(validated: EventUpdateInput) {
  return validated.startTime !== undefined || validated.endTime !== undefined;
}

function hasScheduleChanges(validated: EventUpdateInput) {
  return hasDateChanges(validated) || hasTimeChanges(validated) || validated.recurrenceCadence !== undefined;
}

function resolveStartDatetime(event: Pick<MutableEventRecord, 'startDatetime'>, validated: EventUpdateInput) {
  const nextDate = validated.startDate ?? formatEventDateInput(event.startDatetime);
  const nextTime = validated.startTime !== undefined ? validated.startTime : formatEventTimeInput(event.startDatetime);
  return buildEventDatetime(nextDate, nextTime);
}

function resolveEndDatetime(
  event: Pick<MutableEventRecord, 'startDatetime' | 'endDatetime'>,
  validated: EventUpdateInput
) {
  if (validated.endDate !== undefined) {
    if (!validated.endDate) {
      return null;
    }

    const nextTime = validated.endTime !== undefined ? validated.endTime : formatEventTimeInput(event.endDatetime);
    return buildEventDatetime(validated.endDate, nextTime);
  }

  if (validated.endTime !== undefined) {
    return buildEventDatetime(formatEventDateInput(event.endDatetime || event.startDatetime), validated.endTime);
  }

  return event.endDatetime;
}

async function syncSeriesState(seriesId: string) {
  const series = await db.eventSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      cadenceLabel: true,
      events: {
        orderBy: { startDatetime: 'asc' },
        select: {
          id: true,
          startDatetime: true,
          endDatetime: true,
        },
      },
    },
  });

  if (!series) {
    return;
  }

  if (series.events.length <= 1) {
    if (series.events.length === 1) {
      await db.event.update({
        where: { id: series.events[0].id },
        data: {
          isRecurring: false,
          recurrenceRule: null,
          seriesId: null,
          seriesPosition: null,
          seriesCount: null,
        },
      });
    }

    await db.eventSeries.delete({ where: { id: series.id } });
    return;
  }

  const positions = buildSeriesEventPositions(series.events);
  const summary = buildEventSeriesSummary({
    startDatetime: series.events[0].startDatetime,
    cadenceLabel: series.cadenceLabel as EventSeriesCadence,
    occurrenceCount: series.events.length,
  });

  await db.$transaction([
    ...positions.map((event) =>
      db.event.update({
        where: { id: event.id },
        data: {
          isRecurring: true,
          recurrenceRule: summary,
          seriesPosition: event.seriesPosition,
          seriesCount: event.seriesCount,
        },
      })
    ),
    db.eventSeries.update({
      where: { id: series.id },
      data: {
        summary,
        occurrenceCount: series.events.length,
      },
    }),
  ]);
}

async function getScopedEventIds(eventId: string, seriesId: string, scope?: SeriesEditScope) {
  const resolvedScope = scope || SERIES_EDIT_SCOPE.SINGLE;

  if (resolvedScope === SERIES_EDIT_SCOPE.SINGLE) {
    return [eventId];
  }

  const rows = await db.event.findMany({
    where: { seriesId },
    orderBy: [{ startDatetime: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });

  return getScopedSeriesEventIds(rows, eventId, resolvedScope);
}

export function resolveSeriesEditScope(event: Pick<MutableEventRecord, 'seriesId'>, requestedScope?: SeriesEditScope) {
  return event.seriesId && requestedScope ? requestedScope : SERIES_EDIT_SCOPE.SINGLE;
}

export async function updateEventAndSeries({
  event,
  userId,
  isAuthor,
  hasEditorRole,
  hasApprovalRole,
  validated,
}: UpdateEventMutationOptions) {
  const seriesEditScope = resolveSeriesEditScope(event, validated.seriesEditScope);
  const updateData: Record<string, unknown> = {};

  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.venueLabel !== undefined) updateData.venueLabel = validated.venueLabel;
  if (validated.imageUrl !== undefined) updateData.photoUrl = validated.imageUrl;
  if (validated.costText !== undefined) updateData.costText = validated.costText;
  if (validated.contactInfo !== undefined) updateData.contactInfo = validated.contactInfo;

  if (validated.status !== undefined) {
    if (!hasApprovalRole) {
      throw new EventMutationError('Insufficient permissions to update event status', 403);
    }

    updateData.status = validated.status;
  }

  if (validated.startDate) {
    updateData.startDatetime = buildEventDatetime(validated.startDate, validated.startTime);
  }

  if (validated.endDate !== undefined) {
    updateData.endDatetime = validated.endDate
      ? buildEventDatetime(validated.endDate, validated.endTime)
      : null;
  }

  if (validated.locationId !== undefined) {
    const location = await db.location.findFirst({
      where: {
        id: validated.locationId,
        communityId: event.communityId,
      },
      select: { id: true },
    });

    if (!location) {
      throw new EventMutationError('Location not found', 404);
    }

    updateData.locationId = validated.locationId;
  }

  if (isAuthor && !hasEditorRole && event.status !== 'PENDING_REVIEW' && validated.status === undefined) {
    updateData.status = 'PENDING_REVIEW';
  }

  const scopedIds =
    event.seriesId && seriesEditScope !== SERIES_EDIT_SCOPE.SINGLE
      ? await getScopedEventIds(event.id, event.seriesId, seriesEditScope)
      : [event.id];

  if (!scopedIds.length) {
    throw new EventMutationError('No matching events found for this edit scope', 404);
  }

  const shouldRegenerateSeriesSchedule =
    Boolean(event.seriesId) && seriesEditScope !== SERIES_EDIT_SCOPE.SINGLE && hasScheduleChanges(validated);

  if (shouldRegenerateSeriesSchedule && event.seriesId) {
    const series = await db.eventSeries.findUnique({
      where: { id: event.seriesId },
      select: {
        id: true,
        title: true,
        cadenceLabel: true,
        communityId: true,
        organizationId: true,
        events: {
          where: { id: { in: scopedIds } },
          orderBy: [{ startDatetime: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            startDatetime: true,
            endDatetime: true,
          },
        },
      },
    });

    if (!series || !series.events.length) {
      throw new EventMutationError('No matching events found for this edit scope', 404);
    }

    const nextCadence = (validated.recurrenceCadence || series.cadenceLabel) as EventSeriesCadence;
    const nextStartDatetime = resolveStartDatetime(event, validated);
    const nextEndDatetime = resolveEndDatetime(event, validated);
    const regeneratedOccurrences = buildEventOccurrences({
      startDatetime: nextStartDatetime,
      endDatetime: nextEndDatetime,
      cadenceLabel: nextCadence,
      occurrenceCount: series.events.length,
    });
    const regeneratedSummary = buildEventSeriesSummary({
      startDatetime: nextStartDatetime,
      cadenceLabel: nextCadence,
      occurrenceCount: series.events.length,
    });

    if (seriesEditScope === SERIES_EDIT_SCOPE.FUTURE) {
      const nextSeries = await db.eventSeries.create({
        data: {
          communityId: series.communityId,
          createdByUserId: userId,
          organizationId: series.organizationId,
          title: validated.title ?? event.title,
          summary: regeneratedSummary,
          cadenceLabel: nextCadence,
          occurrenceCount: series.events.length,
        },
        select: { id: true },
      });

      await db.$transaction(
        series.events.map((scopedEvent, index) =>
          db.event.update({
            where: { id: scopedEvent.id },
            data: {
              ...updateData,
              startDatetime: regeneratedOccurrences[index].startDatetime,
              endDatetime: regeneratedOccurrences[index].endDatetime,
              isRecurring: true,
              recurrenceRule: regeneratedSummary,
              seriesId: nextSeries.id,
              seriesPosition: regeneratedOccurrences[index].seriesPosition,
              seriesCount: series.events.length,
            },
          })
        )
      );

      await syncSeriesState(event.seriesId);
      await syncSeriesState(nextSeries.id);
    } else {
      await db.$transaction([
        db.eventSeries.update({
          where: { id: event.seriesId },
          data: {
            title: validated.title ?? undefined,
            summary: regeneratedSummary,
            cadenceLabel: nextCadence,
            occurrenceCount: series.events.length,
          },
        }),
        ...series.events.map((scopedEvent, index) =>
          db.event.update({
            where: { id: scopedEvent.id },
            data: {
              ...updateData,
              startDatetime: regeneratedOccurrences[index].startDatetime,
              endDatetime: regeneratedOccurrences[index].endDatetime,
              isRecurring: true,
              recurrenceRule: regeneratedSummary,
              seriesPosition: regeneratedOccurrences[index].seriesPosition,
              seriesCount: series.events.length,
            },
          })
        ),
      ]);

      await syncSeriesState(event.seriesId);
    }
  } else {
    await db.$transaction(
      scopedIds.map((id) =>
        db.event.update({
          where: { id },
          data: updateData,
        })
      )
    );
  }

  if (event.seriesId) {
    await syncSeriesState(event.seriesId);
  }

  return { affectedEventCount: scopedIds.length, seriesEditScope };
}

export async function deleteEventAndSeries({ event, seriesEditScope }: DeleteEventMutationOptions) {
  const resolvedScope = resolveSeriesEditScope(event, seriesEditScope);
  const scopedIds =
    event.seriesId && resolvedScope !== SERIES_EDIT_SCOPE.SINGLE
      ? await getScopedEventIds(event.id, event.seriesId, resolvedScope)
      : [event.id];

  await db.$transaction(
    scopedIds.map((id) =>
      db.event.delete({
        where: { id },
      })
    )
  );

  if (event.seriesId) {
    await syncSeriesState(event.seriesId);
  }

  return { deletedCount: scopedIds.length, seriesEditScope: resolvedScope };
}
