import { jest, beforeEach, test, expect } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({ db: { $transaction: jest.fn() } }));
jest.mock('@/lib/community', () => ({ getCurrentCommunity: jest.fn(async () => ({ id: 'community-1' })) }));
jest.mock('@/lib/activity-log', () => ({ logActivity: jest.fn(async () => {}) }));
const { db } = require('@/lib/db') as typeof import('@/lib/db');
const { POST } = require('@/app/api/reporter/runs/[id]/editorial/route') as typeof import('@/app/api/reporter/runs/[id]/editorial/route');
const id = '11111111-1111-4111-8111-111111111111';
const draftId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const version = '2026-10-12T12:00:00.000Z';
let tx: any;
let run: any;
function request(changes: Record<string, unknown> = {}, role = 'EDITOR') {
  return new NextRequest('http://localhost/api/reporter/runs/'+id+'/editorial', { method: 'POST',
    headers: { 'x-user-id': 'editor-1', 'x-user-role': role }, body: JSON.stringify({
      intent: 'publish', title: 'Bridge closure', body: '<p>The bridge is closed for repairs.</p>',
      categoryId, draftId, runVersion: version, articleVersion: null, ...changes,
    }) });
}
const params = { params: Promise.resolve({ id }) };
beforeEach(() => {
  run = { id, communityId: 'community-1', status: 'DRAFT_CREATED', linkedArticleId: null,
    linkedArticle: null, sources: [{ id: 'source-1' }], drafts: [{ id: draftId }],
    blockers: [], validationIssues: [], interviewRequests: [] };
  tx = {
    reporterRun: { findFirst: jest.fn(async () => run), updateMany: jest.fn(async () => ({ count: 1 })), update: jest.fn(), findUniqueOrThrow: jest.fn(async () => ({ updatedAt: new Date(version) })) },
    category: { findFirst: jest.fn(async () => ({ id: categoryId })) },
    article: { create: jest.fn(async ({ data }: any) => ({ ...data, id: 'article-1', updatedAt: version })), updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn() },
    reporterDraft: { update: jest.fn() },
    reporterValidationIssue: { updateMany: jest.fn() },
  };
  jest.mocked(db.$transaction).mockImplementation(async (callback: any) => callback(tx));
});
test('publishes only on explicit editor action and preserves source-draft linkage', async () => {
  const response = await POST(request(), params);
  expect(response.status).toBe(200);
  expect(tx.article.create.mock.calls[0][0].data).toMatchObject({ communityId: 'community-1', status: 'PUBLISHED', authorUserId: 'editor-1' });
  expect(tx.reporterRun.update.mock.calls[0][0].data.linkedArticleId).toBe('article-1');
  expect(tx.reporterRun.updateMany.mock.calls[0][0].where).toMatchObject({ communityId: 'community-1', updatedAt: new Date(version), linkedArticleId: null });
});
test('saving never publishes, including a draft with critical issues', async () => {
  run.validationIssues = [{ reporterDraftId: draftId, severity: 'CRITICAL' }];
  expect((await POST(request({ intent: 'save', categoryId: null }), params)).status).toBe(200);
  expect(tx.article.create.mock.calls[0][0].data).toMatchObject({ status: 'DRAFT', publishedAt: null });
});
test.each(['STAFF_WRITER', 'CONTRIBUTOR', 'READER'])('denies publication by %s', async (role) => {
  expect((await POST(request({}, role), params)).status).toBe(403);
  expect(tx.article.create).not.toHaveBeenCalled();
});
test('fails closed on another tenant', async () => {
  tx.reporterRun.findFirst.mockResolvedValue(null);
  expect((await POST(request(), params)).status).toBe(404);
  expect(tx.reporterRun.findFirst.mock.calls[0][0].where).toMatchObject({ id, communityId: 'community-1' });
});
test.each(['blocker','critical','interview','sources','category'])('does not publish with unresolved %s', async (kind) => {
  if (kind === 'blocker') run.blockers = [{ message: 'Missing confirmation' }];
  if (kind === 'critical') run.validationIssues = [{ reporterDraftId: draftId }];
  if (kind === 'interview') run.interviewRequests = [{ sessions: [{ id: 'session-1' }] }];
  if (kind === 'sources') run.sources = [];
  const response = await POST(request(kind === 'category' ? { categoryId: null } : {}), params);
  expect(response.status).toBe(400); expect(tx.article.create).not.toHaveBeenCalled();
});
test('rejects stale editor versions before article creation', async () => {
  tx.reporterRun.updateMany.mockResolvedValue({ count: 0 });
  expect((await POST(request(), params)).status).toBe(409);
  expect(tx.article.create).not.toHaveBeenCalled();
});
test('does not overwrite a published article', async () => {
  run.linkedArticle = { id: 'article-1', communityId: 'community-1', status: 'PUBLISHED' };
  expect((await POST(request(), params)).status).toBe(409);
  expect(tx.article.updateMany).not.toHaveBeenCalled();
});
test('rejects foreign/nonarticle categories and sanitizes edited HTML', async () => {
  tx.category.findFirst.mockResolvedValueOnce(null);
  expect((await POST(request(), params)).status).toBe(400);
  expect((await POST(request({ body: '<p onclick="bad()">The bridge is closed.</p><script>alert(1)</script>' }), params)).status).toBe(200);
  const html = tx.article.create.mock.calls[0][0].data.body;
  expect(html).not.toMatch(/script|onclick|alert/);
});

test('only explicit correction of current critical notes can clear them', async () => {
  const issueId = '44444444-4444-4444-8444-444444444444';
  run.validationIssues = [{ id: issueId, reporterDraftId: draftId, severity: 'CRITICAL' }];
  expect((await POST(request({ resolvedIssueIds: [issueId] }), params)).status).toBe(200);
  expect(tx.reporterValidationIssue.updateMany.mock.calls[0][0].where).toMatchObject({ reporterRunId: id, id: { in: [issueId] } });
  expect((await POST(request({ resolvedIssueIds: [id] }), params)).status).toBe(409);
});
