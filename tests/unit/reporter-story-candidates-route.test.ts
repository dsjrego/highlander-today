import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const logActivityMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));

const materializeReporterStoryCandidatesMock = jest.fn();
jest.mock('@/lib/reporter/story-candidates', () => ({
  materializeReporterStoryCandidates: (...args: unknown[]) =>
    materializeReporterStoryCandidatesMock(...(args as [])),
}));

const route = require('@/app/api/admin/reporter/story-candidates/refresh/route') as typeof import('@/app/api/admin/reporter/story-candidates/refresh/route');

function buildRequest(body?: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/admin/reporter/story-candidates/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      'x-community-id': 'community-1',
      ...headers,
    },
    body: JSON.stringify(body || {}),
  }) as any;
}

describe('reporter story candidate refresh route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
  });

  it('refreshes story candidates for the current community', async () => {
    (materializeReporterStoryCandidatesMock as any).mockResolvedValue({
      candidateCount: 1,
      candidates: [
        {
          id: 'candidate-1',
          title: 'Budget meeting',
        },
      ],
    });

    const response = await route.POST(buildRequest({ limit: 6 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      candidateCount: 1,
      candidates: [expect.objectContaining({ id: 'candidate-1' })],
    });
    expect(materializeReporterStoryCandidatesMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      limit: 6,
    });
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        resourceType: 'REPORTER_STORY_CANDIDATE',
        resourceId: 'community-1',
      })
    );
  });

  it('rejects users without edit access', async () => {
    const response = await route.POST(
      buildRequest({}, {
        'x-user-role': 'READER',
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Insufficient permissions' });
  });
});
