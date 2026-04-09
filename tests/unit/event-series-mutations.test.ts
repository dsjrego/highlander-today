import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const {
  deleteEventAndSeries,
  SERIES_EDIT_SCOPE,
  updateEventAndSeries,
} = require('@/lib/event-series-mutations') as typeof import('@/lib/event-series-mutations');

describe('event series mutation helpers', () => {
  const baseEvent = {
    id: 'event-2',
    title: 'Weekly Yoga',
    submittedByUserId: 'author-1',
    communityId: 'community-1',
    organizationId: 'org-1',
    status: 'PUBLISHED' as const,
    seriesId: 'series-1',
    startDatetime: new Date('2026-06-08T18:00:00.000Z'),
    endDatetime: new Date('2026-06-08T19:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (prismaMock.$transaction as any).mockImplementation(async (operations: unknown[]) =>
      Promise.all(operations)
    );
    (prismaMock.event.update as any).mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    }));
    (prismaMock.event.delete as any).mockImplementation(async (args: { where: { id: string } }) => ({
      id: args.where.id,
    }));
    (prismaMock.event.findMany as any).mockResolvedValue([
      { id: 'event-1' },
      { id: 'event-2' },
      { id: 'event-3' },
    ]);
    (prismaMock.eventSeries.update as any).mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    }));
    (prismaMock.eventSeries.create as any).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'series-2',
      ...args.data,
    }));
    (prismaMock.eventSeries.delete as any).mockResolvedValue({ id: 'series-1' });
    (prismaMock.location.findFirst as any).mockResolvedValue({ id: 'location-2' });
  });

  it('applies a no-schedule SERIES edit across all series events and keeps the original series', async () => {
    (prismaMock.eventSeries.findUnique as any)
      .mockResolvedValueOnce({
        id: 'series-1',
        cadenceLabel: 'WEEKLY',
        events: [
          { id: 'event-1', startDatetime: new Date('2026-06-01T18:00:00.000Z'), endDatetime: new Date('2026-06-01T19:00:00.000Z') },
          { id: 'event-2', startDatetime: new Date('2026-06-08T18:00:00.000Z'), endDatetime: new Date('2026-06-08T19:00:00.000Z') },
          { id: 'event-3', startDatetime: new Date('2026-06-15T18:00:00.000Z'), endDatetime: new Date('2026-06-15T19:00:00.000Z') },
        ],
      });

    const result = await updateEventAndSeries({
      event: baseEvent,
      userId: 'editor-1',
      isAuthor: false,
      hasEditorRole: true,
      hasApprovalRole: true,
      validated: {
        title: 'Community Yoga',
        costText: '$5',
        seriesEditScope: SERIES_EDIT_SCOPE.SERIES,
      },
    });

    expect(result).toEqual({
      affectedEventCount: 3,
      seriesEditScope: 'SERIES',
    });
    expect(prismaMock.eventSeries.create).not.toHaveBeenCalled();
    expect(prismaMock.event.update.mock.calls.slice(0, 3)).toEqual([
      [{ where: { id: 'event-1' }, data: { title: 'Community Yoga', costText: '$5' } }],
      [{ where: { id: 'event-2' }, data: { title: 'Community Yoga', costText: '$5' } }],
      [{ where: { id: 'event-3' }, data: { title: 'Community Yoga', costText: '$5' } }],
    ]);
  });

  it('rewrites the whole series schedule and cadence for SERIES edits', async () => {
    (prismaMock.eventSeries.findUnique as any)
      .mockResolvedValueOnce({
        id: 'series-1',
        title: 'Weekly Yoga',
        cadenceLabel: 'WEEKLY',
        communityId: 'community-1',
        organizationId: 'org-1',
        events: [
          { id: 'event-1', startDatetime: new Date('2026-06-01T18:00:00.000Z'), endDatetime: new Date('2026-06-01T19:00:00.000Z') },
          { id: 'event-2', startDatetime: new Date('2026-06-08T18:00:00.000Z'), endDatetime: new Date('2026-06-08T19:00:00.000Z') },
          { id: 'event-3', startDatetime: new Date('2026-06-15T18:00:00.000Z'), endDatetime: new Date('2026-06-15T19:00:00.000Z') },
        ],
      })
      .mockResolvedValueOnce({
        id: 'series-1',
        cadenceLabel: 'MONTHLY_DATE',
        events: [
          { id: 'event-1', startDatetime: new Date('2026-07-10T22:00:00.000Z'), endDatetime: new Date('2026-07-11T00:00:00.000Z') },
          { id: 'event-2', startDatetime: new Date('2026-08-10T22:00:00.000Z'), endDatetime: new Date('2026-08-11T00:00:00.000Z') },
          { id: 'event-3', startDatetime: new Date('2026-09-10T22:00:00.000Z'), endDatetime: new Date('2026-09-11T00:00:00.000Z') },
        ],
      });

    const result = await updateEventAndSeries({
      event: baseEvent,
      userId: 'editor-1',
      isAuthor: false,
      hasEditorRole: true,
      hasApprovalRole: true,
      validated: {
        startDate: '2026-07-10',
        startTime: '18:00',
        endDate: '2026-07-10',
        endTime: '20:00',
        recurrenceCadence: 'MONTHLY_DATE',
        seriesEditScope: SERIES_EDIT_SCOPE.SERIES,
      },
    });

    expect(result).toEqual({
      affectedEventCount: 3,
      seriesEditScope: 'SERIES',
    });
    expect(prismaMock.eventSeries.update).toHaveBeenCalledWith({
      where: { id: 'series-1' },
      data: expect.objectContaining({
        summary: 'Monthly on the 10th for 3 sessions',
        cadenceLabel: 'MONTHLY_DATE',
        occurrenceCount: 3,
      }),
    });
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({
        startDatetime: new Date('2026-07-10T22:00:00.000Z'),
        endDatetime: new Date('2026-07-11T00:00:00.000Z'),
        seriesPosition: 1,
        seriesCount: 3,
      }),
    });
  });

  it('throws when the requested scoped series events do not include the current event', async () => {
    (prismaMock.event.findMany as any).mockResolvedValueOnce([{ id: 'event-1' }]);

    await expect(
      updateEventAndSeries({
        event: baseEvent,
        userId: 'editor-1',
        isAuthor: false,
        hasEditorRole: true,
        hasApprovalRole: true,
        validated: {
          title: 'Community Yoga',
          seriesEditScope: SERIES_EDIT_SCOPE.FUTURE,
        },
      })
    ).rejects.toMatchObject({
      message: 'No matching events found for this edit scope',
      status: 404,
    });
  });

  it('forces non-editor author edits back into pending review', async () => {
    (prismaMock.eventSeries.findUnique as any).mockResolvedValueOnce({
      id: 'series-1',
      cadenceLabel: 'WEEKLY',
      events: [
        { id: 'event-1', startDatetime: new Date('2026-06-01T18:00:00.000Z'), endDatetime: new Date('2026-06-01T19:00:00.000Z') },
        { id: 'event-2', startDatetime: new Date('2026-06-08T18:00:00.000Z'), endDatetime: new Date('2026-06-08T19:00:00.000Z') },
        { id: 'event-3', startDatetime: new Date('2026-06-15T18:00:00.000Z'), endDatetime: new Date('2026-06-15T19:00:00.000Z') },
      ],
    });

    await updateEventAndSeries({
      event: baseEvent,
      userId: 'author-1',
      isAuthor: true,
      hasEditorRole: false,
      hasApprovalRole: false,
      validated: {
        title: 'Updated Title',
        seriesEditScope: SERIES_EDIT_SCOPE.SINGLE,
      },
    });

    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-2' },
      data: {
        title: 'Updated Title',
        status: 'PENDING_REVIEW',
      },
    });
  });

  it('collapses a series back to a standalone event when one occurrence remains after delete', async () => {
    (prismaMock.eventSeries.findUnique as any)
      .mockResolvedValueOnce({
        id: 'series-1',
        cadenceLabel: 'WEEKLY',
        events: [
          { id: 'event-1', startDatetime: new Date('2026-06-01T18:00:00.000Z'), endDatetime: new Date('2026-06-01T19:00:00.000Z') },
        ],
      })
      .mockResolvedValueOnce(null);

    const result = await deleteEventAndSeries({
      event: baseEvent,
      seriesEditScope: SERIES_EDIT_SCOPE.FUTURE,
    });

    expect(result).toEqual({
      deletedCount: 2,
      seriesEditScope: 'FUTURE',
    });
    expect(prismaMock.event.delete.mock.calls).toEqual([
      [{ where: { id: 'event-2' } }],
      [{ where: { id: 'event-3' } }],
    ]);
    expect(prismaMock.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: {
        isRecurring: false,
        recurrenceRule: null,
        seriesId: null,
        seriesPosition: null,
        seriesCount: null,
      },
    });
    expect(prismaMock.eventSeries.delete).toHaveBeenCalledWith({ where: { id: 'series-1' } });
  });
});
