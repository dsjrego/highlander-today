import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const logActivityMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));

const route = require('@/app/api/admin/reporter/story-candidates/[id]/create-draft-event/route') as typeof import('@/app/api/admin/reporter/story-candidates/[id]/create-draft-event/route');

function buildRequest(body: unknown, headers?: Record<string, string>) {
  return new Request(
    'http://localhost/api/admin/reporter/story-candidates/candidate-1/create-draft-event',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'editor-1',
        'x-user-role': 'EDITOR',
        'x-community-id': 'community-1',
        ...headers,
      },
      body: JSON.stringify(body),
    }
  ) as any;
}

describe('reporter story candidate draft event route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
  });

  it('creates a pending-review event from a reporter story candidate', async () => {
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue({
      id: 'candidate-1',
      title: 'Town hall on downtown parking proposal',
      summary: 'Residents can ask questions about the new parking plan.',
      candidateType: 'EVENT_AND_ARTICLE',
      eventExtractionJson: {
        title: 'Town hall on downtown parking proposal',
        startAt: '2026-05-30T18:00:00.000Z',
      },
      candidateItems: [
        {
          ingestionItem: {
            monitoredSource: {
              sourceType: 'EVENT_CALENDAR',
            },
          },
        },
      ],
    });
    (prismaMock.location.findFirst as any).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Borough Building',
      addressLine1: '123 Main St',
      city: 'Westmont',
      state: 'PA',
    });
    (prismaMock.organization.findFirst as any).mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Westmont Borough',
    });
    (prismaMock.event.findFirst as any).mockResolvedValue(null);
    (prismaMock.event.create as any).mockResolvedValue({
      id: 'event-1',
      title: 'Town hall on downtown parking proposal',
      status: 'PENDING_REVIEW',
      location: {
        id: 'location-1',
        name: 'Borough Building',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Westmont',
        state: 'PA',
        postalCode: '15905',
      },
      organization: {
        id: 'org-1',
        name: 'Westmont Borough',
      },
    });

    const response = await route.POST(
      buildRequest({
        title: 'Town hall on downtown parking proposal',
        description: 'Residents can ask questions about the new parking plan.',
        startDate: '2026-05-30',
        startTime: '18:00',
        locationId: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        venueLabel: 'Borough Building',
      }),
      { params: { id: 'candidate-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      event: expect.objectContaining({
        id: 'event-1',
        title: 'Town hall on downtown parking proposal',
        status: 'PENDING_REVIEW',
      }),
    });
    expect(prismaMock.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          submittedByUserId: 'editor-1',
          locationId: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          reporterStoryCandidateId: 'candidate-1',
          status: 'PENDING_REVIEW',
        }),
      })
    );
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('blocks duplicate draft event creation for the same candidate', async () => {
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue({
      id: 'candidate-1',
      title: 'Town hall on downtown parking proposal',
      summary: 'Residents can ask questions about the new parking plan.',
      candidateType: 'EVENT_ONLY',
      eventExtractionJson: {
        title: 'Town hall on downtown parking proposal',
        startAt: '2026-05-30T18:00:00.000Z',
      },
      candidateItems: [
        {
          ingestionItem: {
            monitoredSource: {
              sourceType: 'EVENT_CALENDAR',
            },
          },
        },
      ],
    });
    (prismaMock.event.findFirst as any).mockResolvedValue({
      id: 'event-existing',
      title: 'Town hall on downtown parking proposal',
      status: 'PENDING_REVIEW',
    });

    const response = await route.POST(
      buildRequest({
        title: 'Town hall on downtown parking proposal',
        startDate: '2026-05-30',
        locationId: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
      }),
      { params: { id: 'candidate-1' } }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('already been created'),
      event: expect.objectContaining({
        id: 'event-existing',
      }),
    });
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('rejects candidates without event extraction data', async () => {
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue({
      id: 'candidate-1',
      title: 'Routine council update',
      summary: 'Not really an event.',
      candidateType: 'ARTICLE_ONLY',
      eventExtractionJson: null,
      candidateItems: [
        {
          ingestionItem: {
            monitoredSource: {
              sourceType: 'LOCAL_NEWSROOM',
            },
          },
        },
      ],
    });

    const response = await route.POST(
      buildRequest({
        title: 'Routine council update',
        startDate: '2026-05-30',
        locationId: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
      }),
      { params: { id: 'candidate-1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('does not have usable event extraction data'),
    });
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });

  it('allows manual event seeding for event-oriented source types without event extraction', async () => {
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue({
      id: 'candidate-1',
      title: 'Summer studio open house',
      summary: 'Meet the resident artists and tour the studios.',
      candidateType: 'ARTICLE_ONLY',
      eventExtractionJson: null,
      candidateItems: [
        {
          ingestionItem: {
            monitoredSource: {
              sourceType: 'EVENT_CALENDAR',
            },
          },
        },
      ],
    });
    (prismaMock.location.findFirst as any).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'LA Studio',
      addressLine1: '123 Main St',
      city: 'Patton',
      state: 'PA',
    });
    (prismaMock.organization.findFirst as any).mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'ART14',
    });
    (prismaMock.event.findFirst as any).mockResolvedValue(null);
    (prismaMock.event.create as any).mockResolvedValue({
      id: 'event-2',
      title: 'Summer studio open house',
      status: 'PENDING_REVIEW',
      location: {
        id: 'location-1',
        name: 'LA Studio',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Patton',
        state: 'PA',
        postalCode: '16668',
      },
      organization: {
        id: 'org-1',
        name: 'ART14',
      },
    });

    const response = await route.POST(
      buildRequest({
        title: 'Summer studio open house',
        description: 'Meet the resident artists and tour the studios.',
        startDate: '2026-06-27',
        startTime: '11:00',
        locationId: '11111111-1111-4111-8111-111111111111',
        organizationId: '22222222-2222-4222-8222-222222222222',
        venueLabel: 'LA Studio',
      }),
      { params: { id: 'candidate-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      event: expect.objectContaining({
        id: 'event-2',
        title: 'Summer studio open house',
        status: 'PENDING_REVIEW',
      }),
    });
    expect(prismaMock.event.create).toHaveBeenCalled();
  });
});
