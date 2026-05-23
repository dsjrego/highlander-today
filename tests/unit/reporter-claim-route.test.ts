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

const claimRoute = require('@/app/api/reporter/claims/[id]/route') as typeof import('@/app/api/reporter/claims/[id]/route');

function buildRequest(
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request('http://localhost/api/reporter/claims/claim-1', {
    method: 'PATCH',
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

describe('reporter claim route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
  });

  it('updates claim verification status for an editable run', async () => {
    (prismaMock.reporterClaim.findUnique as any).mockResolvedValue({
      id: 'claim-1',
      reporterRun: { id: 'run-1', communityId: 'community-1' },
    });
    (prismaMock.reporterClaim.update as any).mockResolvedValue({
      id: 'claim-1',
      verificationStatus: 'SUPPORTED',
      reporterSource: null,
      createdByUser: null,
    });

    const response = await claimRoute.PATCH(buildRequest({ verificationStatus: 'SUPPORTED' }), {
      params: { id: 'claim-1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'claim-1',
      verificationStatus: 'SUPPORTED',
    });
    expect(prismaMock.reporterClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'claim-1' },
        data: { verificationStatus: 'SUPPORTED' },
      })
    );
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'run-1',
        metadata: expect.objectContaining({
          claimUpdated: 'claim-1',
          verificationStatus: 'SUPPORTED',
        }),
      })
    );
  });

  it('rejects claim updates without permission', async () => {
    const response = await claimRoute.PATCH(
      buildRequest(
        { verificationStatus: 'SUPPORTED' },
        { 'x-user-role': 'READER' }
      ),
      { params: { id: 'claim-1' } }
    );

    expect(response.status).toBe(403);
  });
});
