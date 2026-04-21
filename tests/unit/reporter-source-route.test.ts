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

const sourceCollectionRoute = require('@/app/api/reporter/runs/[id]/sources/route') as typeof import('@/app/api/reporter/runs/[id]/sources/route');
const sourceItemRoute = require('@/app/api/reporter/sources/[id]/route') as typeof import('@/app/api/reporter/sources/[id]/route');

function buildRequest(
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request(url, {
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
}

describe('reporter source routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
  });

  it('creates a source for a run', async () => {
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      communityId: 'community-1',
      _count: { sources: 2 },
    });
    (prismaMock.reporterSource.create as any).mockResolvedValue({
      id: 'source-3',
      reporterRunId: 'run-1',
      sourceType: 'OFFICIAL_URL',
      title: 'Agenda',
      url: 'https://example.com/agenda',
      reliabilityTier: 'HIGH',
      sortOrder: 2,
    });

    const response = await sourceCollectionRoute.POST(
      buildRequest('POST', 'http://localhost/api/reporter/runs/run-1/sources', {
        sourceType: 'OFFICIAL_URL',
        title: 'Agenda',
        url: 'https://example.com/agenda',
        reliabilityTier: 'HIGH',
      }),
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'source-3',
      sortOrder: 2,
    });
    expect(prismaMock.reporterSource.create).toHaveBeenCalled();
  });

  it('updates a source record', async () => {
    (prismaMock.reporterSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      reporterRunId: 'run-1',
      reporterRun: { id: 'run-1', communityId: 'community-1' },
    });
    (prismaMock.reporterSource.update as any).mockResolvedValue({
      id: 'source-1',
      title: 'Updated title',
      reliabilityTier: 'PRIMARY',
    });

    const response = await sourceItemRoute.PATCH(
      buildRequest('PATCH', 'http://localhost/api/reporter/sources/source-1', {
        title: 'Updated title',
        reliabilityTier: 'PRIMARY',
      }),
      { params: { id: 'source-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'source-1',
      title: 'Updated title',
    });
  });

  it('deletes a source record', async () => {
    (prismaMock.reporterSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      reporterRunId: 'run-1',
      reporterRun: { id: 'run-1', communityId: 'community-1' },
    });
    (prismaMock.reporterSource.delete as any).mockResolvedValue({ id: 'source-1' });

    const response = await sourceItemRoute.DELETE(
      buildRequest('DELETE', 'http://localhost/api/reporter/sources/source-1'),
      { params: { id: 'source-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.reporterSource.delete).toHaveBeenCalledWith({
      where: { id: 'source-1' },
    });
  });

  it('rejects source creation without permission', async () => {
    const response = await sourceCollectionRoute.POST(
      buildRequest(
        'POST',
        'http://localhost/api/reporter/runs/run-1/sources',
        {
          sourceType: 'STAFF_NOTE',
          title: 'No access',
        },
        { 'x-user-role': 'READER' }
      ),
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(403);
  });
});
