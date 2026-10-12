import { beforeEach, expect, jest, test } from '@jest/globals';
jest.mock('@/lib/db', () => ({ db: { $transaction: jest.fn() } }));
jest.mock('@/lib/reporter/research-service', () => ({ prepareReporterResearch: jest.fn() }));
jest.mock('@/lib/reporter/draft-generator', () => ({ generateReporterDraftWithValidation: jest.fn() }));
jest.mock('@/lib/reporter/claim-service', () => ({ createReporterClaimsFromSourcePacketAnalysis: jest.fn() }));
const { db } = require('@/lib/db') as typeof import('@/lib/db');
const { prepareReporterResearch } = require('@/lib/reporter/research-service') as typeof import('@/lib/reporter/research-service');
const { generateReporterDraftWithValidation } = require('@/lib/reporter/draft-generator') as typeof import('@/lib/reporter/draft-generator');
const { createReporterDraftForRun } = require('@/lib/reporter/draft-service') as typeof import('@/lib/reporter/draft-service');
const run = () => ({ id: 'run', communityId: 'community', status: 'NEW', mode: 'RESEARCH', requestType: 'EDITOR_ASSIGNMENT', title: 'News lead', topic: 'News lead', sources: [{ id: 'source', sortOrder: 0, url: 'https://example.com/story', publishedAt: null }], claims: [], blockers: [], interviewRequests: [] }) as any;
let tx: any;
beforeEach(() => {
  jest.clearAllMocks();
  tx = { reporterDraft: { create: jest.fn(async ({ data }: any) => ({ id: 'draft', ...data })) }, reporterRun: { update: jest.fn() }, reporterValidationIssue: { createMany: jest.fn() } };
  (db.$transaction as any).mockImplementation(async (callback: any) => callback(tx));
});

test('researches before writing and persists internal scope notes with the resulting draft', async () => {
  (prepareReporterResearch as any).mockImplementation(async ({ packet }: any) => ({ ...packet, title: 'Supported news', researchNotes: 'Historical comparison omitted.' }));
  (generateReporterDraftWithValidation as any).mockImplementation(async (packet: any) => {
    expect(packet.title).toBe('Supported news');
    return { draft: { headline: packet.title, dek: null, body: 'A supported news report.', draftType: 'ARTICLE_DRAFT', modelProvider: 'openai', modelName: 'gpt-6-luna', generationNotes: null }, validation: { issues: [], hasCriticalIssues: false } };
  });
  await createReporterDraftForRun({ run: run(), createdByUserId: 'editor', forceRefresh: true });
  expect(prepareReporterResearch).toHaveBeenCalledWith(expect.objectContaining({ communityId: 'community', requireReady: true, forceRefresh: true }));
  expect(tx.reporterDraft.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ headline: 'Supported news', generationNotes: 'Historical comparison omitted.' }) }));
});

test('does not generate or persist article copy when research cannot establish the central facts', async () => {
  (prepareReporterResearch as any).mockRejectedValue(new Error('Reporting is incomplete: primary evidence unavailable.'));
  await expect(createReporterDraftForRun({ run: run(), createdByUserId: 'editor' })).rejects.toThrow('incomplete');
  expect(generateReporterDraftWithValidation).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
});
