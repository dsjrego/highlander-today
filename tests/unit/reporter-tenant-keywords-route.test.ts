import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const { GET, PATCH } = require('@/app/api/admin/reporter/tenant-keywords/route') as typeof import('@/app/api/admin/reporter/tenant-keywords/route');

function buildRequest(method: 'GET' | 'PATCH', body?: unknown, headers?: Record<string, string>) {
  return new Request('http://localhost/api/admin/reporter/tenant-keywords', {
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

describe('reporter tenant keywords route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({
      id: 'community-1',
      slug: 'highlander-today',
      name: 'Highlander Today',
    });
  });

  it('returns parsed tenant keywords for the current community', async () => {
    (prismaMock.siteSetting.findUnique as any).mockResolvedValue({
      value: 'Johnstown, school board\nwater authority',
    });

    const response = await GET(buildRequest('GET'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      keywordsText: 'Johnstown, school board\nwater authority',
      keywords: ['Johnstown', 'school board', 'water authority'],
    });
  });

  it('updates tenant keywords for the current community', async () => {
    (prismaMock.siteSetting.upsert as any).mockResolvedValue({
      id: 'setting-1',
      communityId: 'community-1',
      key: 'reporter_tenant_keywords',
      value: 'Johnstown\nRichland Township',
    });

    const response = await PATCH(
      buildRequest('PATCH', {
        keywordsText: 'Johnstown\nRichland Township',
      })
    );

    expect(response.status).toBe(200);
    expect(prismaMock.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          communityId_key: {
            communityId: 'community-1',
            key: 'reporter_tenant_keywords',
          },
        },
        update: {
          value: 'Johnstown\nRichland Township',
        },
      })
    );
    await expect(response.json()).resolves.toEqual({
      keywordsText: 'Johnstown\nRichland Township',
      keywords: ['Johnstown', 'Richland Township'],
    });
  });
});
