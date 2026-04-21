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

const blockerCollectionRoute = require('@/app/api/reporter/runs/[id]/blockers/route') as typeof import('@/app/api/reporter/runs/[id]/blockers/route');
const blockerItemRoute = require('@/app/api/reporter/blockers/[id]/route') as typeof import('@/app/api/reporter/blockers/[id]/route');

function buildRequest(
  method: 'POST' | 'PATCH',
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      'x-community-id': 'community-1',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;
}

describe('reporter blocker routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
  });

  it('creates a blocker and marks the run blocked', async () => {
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      communityId: 'community-1',
    });
    (prismaMock.reporterBlocker.create as any).mockResolvedValue({
      id: 'blocker-1',
      reporterRunId: 'run-1',
      code: 'SOURCE_GAP',
      message: 'Need official meeting minutes',
    });
    (prismaMock.reporterRun.update as any).mockResolvedValue({
      id: 'run-1',
      status: 'BLOCKED',
    });

    const response = await blockerCollectionRoute.POST(
      buildRequest('POST', 'http://localhost/api/reporter/runs/run-1/blockers', {
        code: 'SOURCE_GAP',
        message: 'Need official meeting minutes',
      }),
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'blocker-1',
      code: 'SOURCE_GAP',
    });
    expect(prismaMock.reporterRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'BLOCKED' },
    });
  });

  it('resolves a blocker', async () => {
    (prismaMock.reporterBlocker.findUnique as any).mockResolvedValue({
      id: 'blocker-1',
      reporterRunId: 'run-1',
      reporterRun: { id: 'run-1', communityId: 'community-1' },
    });
    (prismaMock.reporterBlocker.update as any).mockResolvedValue({
      id: 'blocker-1',
      isResolved: true,
      resolvedBy: { id: 'editor-1', firstName: 'Ed', lastName: 'Itor' },
    });

    const response = await blockerItemRoute.PATCH(
      buildRequest('PATCH', 'http://localhost/api/reporter/blockers/blocker-1', {
        isResolved: true,
      }),
      { params: { id: 'blocker-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'blocker-1',
      isResolved: true,
    });
  });

  it('rejects blocker updates without permission', async () => {
    const response = await blockerItemRoute.PATCH(
      buildRequest(
        'PATCH',
        'http://localhost/api/reporter/blockers/blocker-1',
        { isResolved: true },
        { 'x-user-role': 'READER' }
      ),
      { params: { id: 'blocker-1' } }
    );

    expect(response.status).toBe(403);
  });
});
