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

const { POST, GET } = require('@/app/api/reporter/runs/route') as typeof import('@/app/api/reporter/runs/route');

function buildRequest(method: 'POST' | 'GET', body?: unknown, headers?: Record<string, string>) {
  const request = new Request('http://localhost/api/reporter/runs', {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'staff-1',
      'x-user-role': 'STAFF_WRITER',
      'x-community-id': 'community-1',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;

  request.nextUrl = new URL('http://localhost/api/reporter/runs');
  return request;
}

describe('reporter runs route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
  });

  it('creates a reporter run with normalized initial sources', async () => {
    (prismaMock.reporterRun.create as any).mockImplementation(async (args: any) => ({
      id: 'run-1',
      status: 'NEW',
      mode: 'REQUEST',
      requestType: 'ARTICLE_REQUEST',
      topic: args.data.topic,
      title: args.data.title,
      subjectName: args.data.subjectName,
      requesterName: args.data.requesterName,
      requesterEmail: args.data.requesterEmail,
      requesterPhone: args.data.requesterPhone,
      requestSummary: args.data.requestSummary,
      publicDescription: args.data.publicDescription,
      createdAt: new Date(),
      updatedAt: new Date(),
      sources: [
        {
          id: 'source-1',
          sourceType: 'USER_NOTE',
          title: 'What happened',
          url: null,
          contentText: 'Council approved the budget.',
          reliabilityTier: 'UNVERIFIED',
          sortOrder: 0,
        },
      ],
    }));

    const response = await POST(
      buildRequest('POST', {
        topic: ' Budget vote ',
        whatHappened: ' Council approved the budget. ',
        requesterEmail: ' tipster@example.com ',
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'run-1',
      topic: 'Budget vote',
      requesterEmail: 'tipster@example.com',
    });
    expect(prismaMock.reporterRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          topic: 'Budget vote',
          requesterEmail: 'tipster@example.com',
          sources: {
            create: expect.arrayContaining([
              expect.objectContaining({
                sourceType: 'USER_NOTE',
                title: 'What happened',
              }),
            ]),
          },
        }),
      })
    );
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('rejects anonymous creation without contact info', async () => {
    const response = await POST(
      buildRequest(
        'POST',
        { topic: 'Road closure', whatHappened: 'Main Street is closed.' },
        { 'x-user-id': '', 'x-user-role': '' }
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Anonymous story requests must include at least one contact field.',
    });
  });

  it('lists reporter runs for internal roles', async () => {
    (prismaMock.reporterRun.findMany as any).mockResolvedValue([
      {
        id: 'run-1',
        status: 'NEW',
        mode: 'REQUEST',
        requestType: 'ARTICLE_REQUEST',
        topic: 'Library funding',
        title: null,
        subjectName: null,
        requesterName: 'Tipster',
        requesterEmail: 'tip@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: null,
        _count: { sources: 1, blockers: 0, drafts: 0 },
      },
    ]);

    const response = await GET(buildRequest('GET'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      runs: [
        expect.objectContaining({
          id: 'run-1',
          topic: 'Library funding',
        }),
      ],
    });
  });
});
