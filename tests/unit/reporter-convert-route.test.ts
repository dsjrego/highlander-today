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

const { POST } = require('@/app/api/reporter/runs/[id]/convert-to-article/route') as typeof import('@/app/api/reporter/runs/[id]/convert-to-article/route');

function buildRequest() {
  return new Request('http://localhost/api/reporter/runs/run-1/convert-to-article', {
    method: 'POST',
    headers: {
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      'x-community-id': 'community-1',
    },
  }) as any;
}

describe('reporter convert-to-article route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      communityId: 'community-1',
      topic: 'Bridge closure',
      title: 'Bridge closure',
      linkedArticle: null,
      drafts: [
        {
          id: 'draft-1',
          headline: 'Bridge Closure Disrupts Morning Traffic',
          dek: null,
          body: 'The bridge will remain closed pending repairs.\n\nOfficials said traffic will be detoured.',
          status: 'GENERATED',
        },
      ],
    });
    (prismaMock.article.findUnique as any).mockResolvedValue(null);
    (prismaMock.$transaction as any).mockImplementation(async (callback: any) =>
      callback(prismaMock)
    );
    (prismaMock.article.create as any).mockResolvedValue({
      id: 'article-1',
      title: 'Bridge Closure Disrupts Morning Traffic',
      slug: 'bridge-closure-disrupts-morning-traffic',
      status: 'DRAFT',
    });
    (prismaMock.reporterRun.update as any).mockResolvedValue({
      id: 'run-1',
      linkedArticleId: 'article-1',
      status: 'CONVERTED_TO_ARTICLE',
    });
    (prismaMock.reporterDraft.update as any).mockResolvedValue({
      id: 'draft-1',
      status: 'CONVERTED_TO_ARTICLE',
    });
  });

  it('creates an article draft and links the run', async () => {
    const response = await POST(buildRequest(), { params: { id: 'run-1' } });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'article-1',
      status: 'DRAFT',
    });
    expect(prismaMock.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          authorUserId: 'editor-1',
          title: 'Bridge Closure Disrupts Morning Traffic',
          status: 'DRAFT',
        }),
      })
    );
    expect(prismaMock.reporterRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        linkedArticleId: 'article-1',
        status: 'CONVERTED_TO_ARTICLE',
      },
    });
    expect(prismaMock.reporterDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { status: 'CONVERTED_TO_ARTICLE' },
    });
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('rejects conversion without permission', async () => {
    const response = await POST(
      new Request('http://localhost/api/reporter/runs/run-1/convert-to-article', {
        method: 'POST',
        headers: {
          'x-user-id': 'staff-1',
          'x-user-role': 'STAFF_WRITER',
          'x-community-id': 'community-1',
        },
      }) as any,
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(403);
  });
});
