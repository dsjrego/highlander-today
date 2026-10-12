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
          draftType: 'ARTICLE_DRAFT',
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
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: 'run-1' }) });

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

  it.each(['BLOCKED', 'ARCHIVED'])('refuses conversion of a %s run', async (status) => {
    const run = await prismaMock.reporterRun.findUnique({ where: { id: 'run-1' } }) as any;
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({ ...run, status });
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: 'run-1' }) });
    expect(response.status).toBe(422);
    expect(prismaMock.article.create).not.toHaveBeenCalled();
  });

  it('refuses unresolved critical validation issues and legacy reporting disclaimers', async () => {
    const run = await prismaMock.reporterRun.findUnique({ where: { id: 'run-1' } }) as any;
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({ ...run, drafts: [{ ...run.drafts[0], validationIssues: [{ severity: 'CRITICAL' }] }] });
    expect((await POST(buildRequest(), { params: Promise.resolve({ id: 'run-1' }) })).status).toBe(422);
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({ ...run, drafts: [{ ...run.drafts[0], body: 'A Stateline headline says measles cases have reached 4,080 for the year. The number could not be independently confirmed from the materials available for this story.' }] });
    expect((await POST(buildRequest(), { params: Promise.resolve({ id: 'run-1' }) })).status).toBe(422);
    expect(prismaMock.article.create).not.toHaveBeenCalled();
  });

  it('does not convert a source analysis into an article', async () => {
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({ id: 'run-1', communityId: 'community-1', linkedArticle: null, drafts: [{ id: 'analysis-1', draftType: 'SOURCE_ANALYSIS', body: 'Internal evidence notes' }] });
    const response = await POST(buildRequest(), { params: Promise.resolve({ id: 'run-1' }) });
    expect(response.status).toBe(400);
    expect(prismaMock.article.create).not.toHaveBeenCalled();
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
      { params: Promise.resolve({ id: 'run-1' }) }
    );

    expect(response.status).toBe(403);
  });
});
