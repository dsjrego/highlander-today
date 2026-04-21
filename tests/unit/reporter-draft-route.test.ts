import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const generateReporterDraftWithValidationMock = jest.fn();
jest.mock('@/lib/reporter/draft-generator', () => ({
  generateReporterDraftWithValidation: (...args: unknown[]) =>
    generateReporterDraftWithValidationMock(...(args as [])),
}));

const logActivityMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));

const { POST } = require('@/app/api/reporter/runs/[id]/draft/route') as typeof import('@/app/api/reporter/runs/[id]/draft/route');

function buildRequest() {
  return new Request('http://localhost/api/reporter/runs/run-1/draft', {
    method: 'POST',
    headers: {
      'x-user-id': 'staff-1',
      'x-user-role': 'STAFF_WRITER',
      'x-community-id': 'community-1',
    },
  }) as any;
}

describe('reporter draft route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      communityId: 'community-1',
      mode: 'REQUEST',
      requestType: 'ARTICLE_REQUEST',
      topic: 'Bridge closure',
      title: 'Bridge closure',
      subjectName: null,
      requestedArticleType: null,
      requestSummary: 'Bridge closed after inspection.',
      editorNotes: null,
      sources: [
        {
          id: 'source-1',
          sourceType: 'USER_NOTE',
          title: 'What happened',
          url: null,
          publisher: null,
          author: null,
          publishedAt: null,
          excerpt: null,
          note: null,
          contentText: 'The bridge was closed after an inspection.',
          reliabilityTier: 'UNVERIFIED',
          sortOrder: 0,
          createdAt: new Date(),
        },
      ],
    });
    (prismaMock.$transaction as any).mockImplementation(async (callback: any) =>
      callback(prismaMock)
    );
    (prismaMock.reporterDraft.create as any).mockResolvedValue({
      id: 'draft-1',
      reporterRunId: 'run-1',
      headline: 'Bridge Closure Disrupts Morning Traffic',
      dek: null,
      body: 'Bridge closure draft body',
      draftType: 'ARTICLE_DRAFT',
      status: 'GENERATED',
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet',
      generationNotes: null,
      createdByUserId: 'staff-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (prismaMock.reporterValidationIssue.createMany as any).mockResolvedValue({ count: 1 });
    (prismaMock.reporterRun.update as any).mockResolvedValue({ id: 'run-1', status: 'DRAFT_CREATED' });
  });

  it('persists draft and validation issues', async () => {
    (generateReporterDraftWithValidationMock as any).mockResolvedValue({
      draft: {
        headline: 'Bridge Closure Disrupts Morning Traffic',
        dek: null,
        body: 'Bridge closure draft body',
        draftType: 'ARTICLE_DRAFT',
        modelProvider: 'anthropic',
        modelName: 'claude-sonnet',
        generationNotes: null,
      },
      validation: {
        hasCriticalIssues: false,
        issues: [
          {
            code: 'HEADLINE_MISSING',
            severity: 'WARNING',
            message: 'Test warning',
            evidenceSpan: null,
          },
        ],
      },
    });

    const response = await POST(buildRequest(), { params: { id: 'run-1' } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      draft: expect.objectContaining({ id: 'draft-1' }),
      validation: expect.objectContaining({ hasCriticalIssues: false }),
    });
    expect(prismaMock.reporterDraft.create).toHaveBeenCalled();
    expect(prismaMock.reporterValidationIssue.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            reporterRunId: 'run-1',
            reporterDraftId: 'draft-1',
            code: 'HEADLINE_MISSING',
          }),
        ]),
      })
    );
    expect(prismaMock.reporterRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'DRAFT_CREATED' },
    });
  });

  it('rejects draft generation without permission', async () => {
    const response = await POST(
      new Request('http://localhost/api/reporter/runs/run-1/draft', {
        method: 'POST',
        headers: {
          'x-user-id': 'reader-1',
          'x-user-role': 'READER',
          'x-community-id': 'community-1',
        },
      }) as any,
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(403);
  });
});
