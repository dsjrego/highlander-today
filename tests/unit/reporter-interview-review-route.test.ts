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

const reviewRoute = require('@/app/api/reporter/interview-sessions/[id]/review/route') as typeof import('@/app/api/reporter/interview-sessions/[id]/review/route');

function buildRequest() {
  const request = new Request(
    'http://localhost/api/reporter/interview-sessions/session-1/review',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'editor-1',
        'x-user-role': 'EDITOR',
        'x-community-id': 'community-1',
      },
    }
  ) as any;

  request.nextUrl = new URL(
    'http://localhost/api/reporter/interview-sessions/session-1/review'
  );
  return request;
}

describe('reporter interview review route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
  });

  it('marks a completed interview session reviewed when blockers are resolved', async () => {
    (prismaMock.reporterInterviewSession.findUnique as any).mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      interviewRequestId: 'interview-1',
      interviewRequest: {
        reporterRun: {
          id: 'run-1',
          communityId: 'community-1',
        },
      },
      safetyFlags: [
        {
          id: 'flag-1',
          blockerId: 'blocker-1',
          blocker: {
            id: 'blocker-1',
            isResolved: true,
          },
        },
      ],
    });
    (prismaMock.reporterInterviewSession.update as any).mockResolvedValue({
      id: 'session-1',
      reviewedAt: new Date(),
      reviewedBy: { id: 'editor-1', firstName: 'Ed', lastName: 'Itor' },
      turns: [],
      facts: [],
      safetyFlags: [],
    });

    const response = await reviewRoute.POST(buildRequest(), {
      params: { id: 'session-1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'session-1',
      reviewedBy: expect.objectContaining({
        id: 'editor-1',
      }),
    });
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('refuses review when linked safety blockers are unresolved', async () => {
    (prismaMock.reporterInterviewSession.findUnique as any).mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      interviewRequestId: 'interview-1',
      interviewRequest: {
        reporterRun: {
          id: 'run-1',
          communityId: 'community-1',
        },
      },
      safetyFlags: [
        {
          id: 'flag-1',
          blockerId: 'blocker-1',
          blocker: {
            id: 'blocker-1',
            isResolved: false,
          },
        },
      ],
    });

    const response = await reviewRoute.POST(buildRequest(), {
      params: { id: 'session-1' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error:
        'Resolve linked interview safety blockers before marking this session reviewed.',
    });
  });
});
