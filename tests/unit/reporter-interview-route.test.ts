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

const isEmailConfiguredMock = jest.fn(() => true);
const sendTransactionalEmailMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/email', () => ({
  isEmailConfigured: () => isEmailConfiguredMock(),
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...(args as [])),
}));

const runsInterviewsRoute = require('@/app/api/reporter/runs/[id]/interviews/route') as typeof import('@/app/api/reporter/runs/[id]/interviews/route');
const interviewsRoute = require('@/app/api/reporter/interviews/[id]/route') as typeof import('@/app/api/reporter/interviews/[id]/route');
const inviteRoute = require('@/app/api/reporter/interviews/[id]/invite/route') as typeof import('@/app/api/reporter/interviews/[id]/invite/route');
const reopenRoute = require('@/app/api/reporter/interviews/[id]/reopen/route') as typeof import('@/app/api/reporter/interviews/[id]/reopen/route');

function buildRequest(url: string, method: 'POST' | 'PATCH' | 'GET', body?: unknown) {
  const request = new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'staff-1',
      'x-user-role': 'STAFF_WRITER',
      'x-community-id': 'community-1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;

  request.nextUrl = new URL(url);
  return request;
}

describe('reporter interview routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
    isEmailConfiguredMock.mockReturnValue(true);
  });

  it('creates an interview request for a reporter run', async () => {
    (prismaMock.user.findFirst as any).mockResolvedValue(null);
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      communityId: 'community-1',
    });
    (prismaMock.reporterInterviewRequest.create as any).mockResolvedValue({
      id: 'interview-1',
      reporterRunId: 'run-1',
      status: 'DRAFT',
      interviewType: 'WITNESS',
      priority: 'HIGH',
      intervieweeName: 'Jane Doe',
      inviteEmail: 'jane@example.com',
      purpose: 'Clarify what she saw at the borough meeting.',
      suggestedLanguage: 'ENGLISH',
      nativeLanguage: null,
      interviewLanguage: null,
      requiresTranslationSupport: false,
      scheduledFor: null,
      sessions: [],
      interviewee: null,
      createdBy: { id: 'staff-1', firstName: 'Staff', lastName: 'Writer' },
    });

    const response = await runsInterviewsRoute.POST(
      buildRequest('http://localhost/api/reporter/runs/run-1/interviews', 'POST', {
        interviewType: 'WITNESS',
        priority: 'HIGH',
        intervieweeName: 'Jane Doe',
        inviteEmail: 'jane@example.com',
        purpose: 'Clarify what she saw at the borough meeting.',
      }),
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'interview-1',
      intervieweeName: 'Jane Doe',
      interviewType: 'WITNESS',
    });
    expect(prismaMock.reporterInterviewRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterRunId: 'run-1',
          interviewType: 'WITNESS',
          priority: 'HIGH',
          intervieweeName: 'Jane Doe',
        }),
      })
    );
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('updates an interview request', async () => {
    (prismaMock.user.findFirst as any).mockResolvedValue(null);
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      status: 'DRAFT',
      inviteEmail: 'jane@example.com',
      intervieweeUserId: null,
      intervieweeName: 'Jane Doe',
      reporterRun: {
        id: 'run-1',
        communityId: 'community-1',
      },
    });
    (prismaMock.reporterInterviewRequest.update as any).mockResolvedValue({
      id: 'interview-1',
      reporterRunId: 'run-1',
      status: 'INVITED',
      interviewType: 'GENERAL_SOURCE',
      priority: 'URGENT',
      intervieweeName: 'Jane Doe',
      inviteEmail: 'jane@example.com',
      purpose: 'Need chronology confirmation before deadline.',
      suggestedLanguage: 'ENGLISH',
      nativeLanguage: null,
      interviewLanguage: null,
      requiresTranslationSupport: false,
      scheduledFor: null,
      sessions: [],
      interviewee: null,
      createdBy: { id: 'staff-1', firstName: 'Staff', lastName: 'Writer' },
    });

    const response = await interviewsRoute.PATCH(
      buildRequest('http://localhost/api/reporter/interviews/interview-1', 'PATCH', {
        status: 'INVITED',
        priority: 'URGENT',
        purpose: 'Need chronology confirmation before deadline.',
      }),
      { params: { id: 'interview-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'interview-1',
      status: 'INVITED',
      priority: 'URGENT',
    });
    expect(prismaMock.reporterInterviewRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'interview-1' },
        data: expect.objectContaining({
          status: 'INVITED',
          priority: 'URGENT',
          purpose: 'Need chronology confirmation before deadline.',
        }),
      })
    );
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('invites an interviewee and marks a linked account as ready', async () => {
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      inviteEmail: 'jane@example.com',
      intervieweeUserId: 'user-2',
      reporterRun: {
        id: 'run-1',
        communityId: 'community-1',
        title: 'Road closure follow-up',
        topic: 'Road closure',
      },
      interviewee: {
        id: 'user-2',
        email: 'jane@example.com',
      },
    });
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: 'staff-1',
      firstName: 'Staff',
      lastName: 'Writer',
      email: 'staff@example.com',
    });
    (prismaMock.reporterInterviewRequest.update as any).mockResolvedValue({
      id: 'interview-1',
      status: 'READY',
      inviteEmail: 'jane@example.com',
      intervieweeUserId: 'user-2',
      sessions: [],
      interviewee: { id: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      createdBy: { id: 'staff-1', firstName: 'Staff', lastName: 'Writer' },
    });

    const response = await inviteRoute.POST(
      buildRequest('http://localhost/api/reporter/interviews/interview-1/invite', 'POST'),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'interview-1',
      status: 'READY',
      inviteDelivery: 'sent',
    });
    expect(sendTransactionalEmailMock).toHaveBeenCalled();
  });

  it('reopens a completed interview back into the queue', async () => {
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      invitedAt: new Date(),
      inviteEmail: 'jane@example.com',
      intervieweeUserId: null,
      reporterRun: {
        id: 'run-1',
        communityId: 'community-1',
      },
      interviewee: null,
    });
    (prismaMock.reporterInterviewRequest.update as any).mockResolvedValue({
      id: 'interview-1',
      status: 'INVITED',
      inviteEmail: 'jane@example.com',
      intervieweeUserId: null,
      sessions: [],
      interviewee: null,
      createdBy: { id: 'staff-1', firstName: 'Staff', lastName: 'Writer' },
    });

    const response = await reopenRoute.POST(
      buildRequest('http://localhost/api/reporter/interviews/interview-1/reopen', 'POST'),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'interview-1',
      status: 'INVITED',
    });
  });
});
