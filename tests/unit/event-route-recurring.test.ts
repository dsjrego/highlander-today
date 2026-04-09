import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const logActivityMock = jest.fn(() => Promise.resolve());

jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));

const { DELETE, PATCH } = require('@/app/api/events/[id]/route') as typeof import('@/app/api/events/[id]/route');

function buildRequest(
  method: 'PATCH' | 'DELETE',
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request(`http://localhost/api/events/event-2`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;
}

function findEventUpdateCall(eventId: string, predicate?: (data: Record<string, unknown>) => boolean) {
  return (prismaMock.event.update.mock.calls as Array<
    [{ where: { id: string }; data: Record<string, unknown> }]
  >).find(([args]) => {
    if (args.where.id !== eventId) {
      return false;
    }

    return predicate ? predicate(args.data) : true;
  });
}

describe('event route recurring scope handling', () => {
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
    (prismaMock.eventSeries.update as any).mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: args.where.id,
      ...args.data,
    }));
    (prismaMock.eventSeries.create as any).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'series-2',
      ...args.data,
    }));
    (prismaMock.eventSeries.delete as any).mockResolvedValue({ id: 'series-1' });
  });

  it('forks FUTURE schedule edits into a new series and cleans up the original series', async () => {
    (prismaMock.event.findUnique as any)
      .mockResolvedValueOnce({
        id: 'event-2',
        title: 'Weekly Yoga',
        submittedByUserId: 'author-1',
        communityId: 'community-1',
        organizationId: 'org-1',
        status: 'PUBLISHED',
        seriesId: 'series-1',
        startDatetime: new Date('2026-06-08T18:00:00.000Z'),
        endDatetime: new Date('2026-06-08T19:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'event-2',
        title: 'Weekly Yoga',
        status: 'PUBLISHED',
        seriesId: 'series-2',
      });

    (prismaMock.event.findMany as any).mockResolvedValueOnce([
      { id: 'event-1' },
      { id: 'event-2' },
      { id: 'event-3' },
    ]);

    (prismaMock.eventSeries.findUnique as any)
      .mockResolvedValueOnce({
        id: 'series-1',
        title: 'Weekly Yoga',
        cadenceLabel: 'WEEKLY',
        communityId: 'community-1',
        organizationId: 'org-1',
        events: [
          {
            id: 'event-2',
            startDatetime: new Date('2026-06-08T18:00:00.000Z'),
            endDatetime: new Date('2026-06-08T19:00:00.000Z'),
          },
          {
            id: 'event-3',
            startDatetime: new Date('2026-06-15T18:00:00.000Z'),
            endDatetime: new Date('2026-06-15T19:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'series-1',
        cadenceLabel: 'WEEKLY',
        events: [
          {
            id: 'event-1',
            startDatetime: new Date('2026-06-01T18:00:00.000Z'),
            endDatetime: new Date('2026-06-01T19:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'series-2',
        cadenceLabel: 'WEEKLY',
        events: [
          {
            id: 'event-2',
            startDatetime: new Date('2026-06-10T18:30:00.000Z'),
            endDatetime: new Date('2026-06-10T19:30:00.000Z'),
          },
          {
            id: 'event-3',
            startDatetime: new Date('2026-06-17T18:30:00.000Z'),
            endDatetime: new Date('2026-06-17T19:30:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce(null);

    const response = await PATCH(
      buildRequest('PATCH', {
        seriesEditScope: 'FUTURE',
        startDate: '2026-06-10',
        startTime: '18:30',
        endDate: '2026-06-10',
        endTime: '19:30',
      }),
      { params: { id: 'event-2' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      affectedEventCount: 2,
      seriesEditScope: 'FUTURE',
    });

    expect(prismaMock.eventSeries.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        communityId: 'community-1',
        createdByUserId: 'editor-1',
        organizationId: 'org-1',
        title: 'Weekly Yoga',
        occurrenceCount: 2,
      }),
      select: { id: true },
    });

    expect(findEventUpdateCall('event-2', (data) => data.seriesId === 'series-2')).toEqual([
      expect.objectContaining({
        where: { id: 'event-2' },
        data: expect.objectContaining({
          seriesId: 'series-2',
          startDatetime: new Date('2026-06-10T22:30:00.000Z'),
          endDatetime: new Date('2026-06-10T23:30:00.000Z'),
          seriesPosition: 1,
          seriesCount: 2,
        }),
      }),
    ]);

    expect(findEventUpdateCall('event-3', (data) => data.seriesId === 'series-2')).toEqual([
      expect.objectContaining({
        where: { id: 'event-3' },
        data: expect.objectContaining({
          seriesId: 'series-2',
          startDatetime: new Date('2026-06-17T22:30:00.000Z'),
          endDatetime: new Date('2026-06-17T23:30:00.000Z'),
          seriesPosition: 2,
          seriesCount: 2,
        }),
      }),
    ]);

    expect(findEventUpdateCall('event-1', (data) => data.seriesId === null)).toEqual([
      expect.objectContaining({
        where: { id: 'event-1' },
        data: {
          isRecurring: false,
          recurrenceRule: null,
          seriesId: null,
          seriesPosition: null,
          seriesCount: null,
        },
      }),
    ]);

    expect(prismaMock.eventSeries.delete).toHaveBeenCalledWith({ where: { id: 'series-1' } });
    expect(prismaMock.eventSeries.update).toHaveBeenCalledWith({
      where: { id: 'series-2' },
      data: expect.objectContaining({
        occurrenceCount: 2,
        summary: 'Every week for 2 sessions',
      }),
    });
  });

  it('deletes only the selected and later events for FUTURE delete scope', async () => {
    (prismaMock.event.findUnique as any).mockResolvedValueOnce({
      id: 'event-2',
      title: 'Weekly Yoga',
      submittedByUserId: 'author-1',
      status: 'PUBLISHED',
      seriesId: 'series-1',
      startDatetime: new Date('2026-06-08T18:00:00.000Z'),
    });

    (prismaMock.event.findMany as any).mockResolvedValueOnce([
      { id: 'event-1' },
      { id: 'event-2' },
      { id: 'event-3' },
    ]);

    (prismaMock.eventSeries.findUnique as any)
      .mockResolvedValueOnce({
        id: 'series-1',
        cadenceLabel: 'WEEKLY',
        events: [
          {
            id: 'event-1',
            startDatetime: new Date('2026-06-01T18:00:00.000Z'),
            endDatetime: new Date('2026-06-01T19:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce(null);

    const response = await DELETE(
      buildRequest('DELETE', { seriesEditScope: 'FUTURE' }),
      { params: { id: 'event-2' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedCount: 2,
      seriesEditScope: 'FUTURE',
    });

    expect(prismaMock.event.delete.mock.calls).toEqual([
      [{ where: { id: 'event-2' } }],
      [{ where: { id: 'event-3' } }],
    ]);
    expect(findEventUpdateCall('event-1')).toEqual([
      {
        where: { id: 'event-1' },
        data: {
          isRecurring: false,
          recurrenceRule: null,
          seriesId: null,
          seriesPosition: null,
          seriesCount: null,
        },
      },
    ]);
    expect(prismaMock.eventSeries.delete).toHaveBeenCalledWith({ where: { id: 'series-1' } });
  });

  it('rejects status changes from non-approvers even when they can edit events', async () => {
    (prismaMock.event.findUnique as any).mockResolvedValueOnce({
      id: 'event-2',
      title: 'Weekly Yoga',
      submittedByUserId: 'author-1',
      communityId: 'community-1',
      status: 'PENDING_REVIEW',
      seriesId: null,
      startDatetime: new Date('2026-06-08T18:00:00.000Z'),
      endDatetime: new Date('2026-06-08T19:00:00.000Z'),
    });

    const response = await PATCH(
      buildRequest(
        'PATCH',
        { status: 'PUBLISHED' },
        {
          'x-user-id': 'contributor-1',
          'x-user-role': 'CONTRIBUTOR',
        }
      ),
      { params: { id: 'event-2' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Insufficient permissions to update event status',
    });
  });
});
