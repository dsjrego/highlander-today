import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) => getCurrentCommunityMock(...(args as [])),
}));

const loadReporterRunForDraftMock = jest.fn();
const createReporterDraftForRunMock = jest.fn();
jest.mock('@/lib/reporter/draft-service', () => ({
  loadReporterRunForDraft: (...args: unknown[]) => loadReporterRunForDraftMock(...(args as [])),
  createReporterDraftForRun: (...args: unknown[]) =>
    createReporterDraftForRunMock(...(args as [])),
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
    (loadReporterRunForDraftMock as any).mockResolvedValue({
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
      claims: [],
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
      interviewRequests: [],
    });
  });

  it('persists draft and validation issues', async () => {
    (createReporterDraftForRunMock as any).mockResolvedValue({
      persisted: {
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
    expect(createReporterDraftForRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        run: expect.objectContaining({
          id: 'run-1',
        }),
        createdByUserId: 'staff-1',
      })
    );
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

  it('rejects draft generation when completed interview output is unreviewed', async () => {
    (loadReporterRunForDraftMock as any).mockResolvedValue({
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
      claims: [],
      sources: [],
      interviewRequests: [
        {
          sessions: [
            {
              id: 'session-1',
              reviewedAt: null,
            },
          ],
        },
      ],
    });
    (createReporterDraftForRunMock as any).mockRejectedValue(
      new Error('Completed interview output must be reviewed before generating a reporter draft.')
    );

    const response = await POST(buildRequest(), { params: { id: 'run-1' } });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error:
        'Completed interview output must be reviewed before generating a reporter draft.',
    });
  });

  it('creates source-packet analysis claims when generating analysis output', async () => {
    (createReporterDraftForRunMock as any).mockResolvedValue({
      persisted: {
        id: 'draft-2',
        reporterRunId: 'run-1',
        headline: 'Reporter Agent Analysis: Bridge closure',
        dek: null,
        body: 'Analysis body',
        draftType: 'SOURCE_PACKET_SUMMARY',
        status: 'GENERATED',
      },
      validation: {
        hasCriticalIssues: false,
        issues: [],
      },
    });

    const response = await POST(
      new Request('http://localhost/api/reporter/runs/run-1/draft', {
        method: 'POST',
        headers: {
          'x-user-id': 'staff-1',
          'x-user-role': 'STAFF_WRITER',
          'x-community-id': 'community-1',
        },
        body: JSON.stringify({ draftType: 'SOURCE_PACKET_SUMMARY' }),
      }) as any,
      { params: { id: 'run-1' } }
    );

    expect(response.status).toBe(200);
    expect(createReporterDraftForRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftType: 'SOURCE_PACKET_SUMMARY',
      })
    );
  });
});
