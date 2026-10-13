import { jest, beforeEach, test, expect } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({ db: { reporterRun: { findFirst: jest.fn() } } }));
jest.mock('@/lib/community', () => ({ getCurrentCommunity: jest.fn(async () => ({ id: 'community-1' })) }));
jest.mock('@/lib/activity-log', () => ({ logActivity: jest.fn(async () => {}) }));
jest.mock('@/lib/reporter/hero-image', () => ({
  assertHeroImageConfigured: jest.fn(),
  generateReporterHeroImage: jest.fn(),
  HeroImageError: class extends Error { constructor(message: string, public status: number) { super(message); } },
}));
const { db } = require('@/lib/db') as typeof import('@/lib/db');
const { logActivity } = require('@/lib/activity-log') as typeof import('@/lib/activity-log');
const { getCurrentCommunity } = require('@/lib/community') as typeof import('@/lib/community');
const { generateReporterHeroImage, assertHeroImageConfigured, HeroImageError } = require('@/lib/reporter/hero-image') as typeof import('@/lib/reporter/hero-image');
const { clearRateLimitStore } = require('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
const { POST } = require('@/app/api/reporter/runs/[id]/hero-image/route') as typeof import('@/app/api/reporter/runs/[id]/hero-image/route');
const id = '11111111-1111-4111-8111-111111111111';
const draftId = '22222222-2222-4222-8222-222222222222';
const params = { params: Promise.resolve({ id }) };
let run: any;
const generated = { url: '/uploads/article/reporter/community-1/hero.webp', caption: 'AI-generated editorial illustration', model: 'image-model', promptVersion: 'v1', promptHash: 'hash', latencyMs: 12 };
function request(changes: Record<string, unknown> = {}, role = 'EDITOR', userId = 'editor-1') {
  return new NextRequest(`http://localhost/api/reporter/runs/${id}/hero-image`, {
    method: 'POST', headers: { 'x-user-id': userId, 'x-user-role': role },
    body: JSON.stringify({ draftId, title: 'Current edited headline', body: '<p>Current edited story about farm costs.</p>', ...changes }),
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  clearRateLimitStore();
  run = { id, communityId: 'community-1', status: 'DRAFT_CREATED', linkedArticle: null, drafts: [{ id: draftId }] };
  jest.mocked(db.reporterRun.findFirst).mockImplementation((() => Promise.resolve(run)) as any);
  jest.mocked(getCurrentCommunity).mockResolvedValue({ id: 'community-1' } as any);
  jest.mocked(assertHeroImageConfigured).mockImplementation(() => {});
  jest.mocked(generateReporterHeroImage).mockResolvedValue(generated);
});
test('generates from edited content for an authorized tenant and logs provenance without saving or publishing', async () => {
  const response = await POST(request(), params);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ image: { url: generated.url, caption: generated.caption } });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(db.reporterRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id, communityId: 'community-1' } }));
  expect(generateReporterHeroImage).toHaveBeenCalledWith({ draftId, title: 'Current edited headline', body: '<p>Current edited story about farm costs.</p>', communityId: 'community-1', runId: id, userId: 'editor-1' });
  expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'REPORTER_DRAFT', resourceId: draftId, metadata: expect.objectContaining({ event: 'hero-image-generated', model: 'image-model', promptHash: 'hash' }) }));
});
test.each(['STAFF_WRITER', 'CONTRIBUTOR', 'READER'])('denies generation by %s before inference', async (role) => {
  expect((await POST(request({}, role), params)).status).toBe(403);
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
});
test('denies unauthenticated requests and missing community', async () => {
  expect((await POST(request({}, 'EDITOR', ''), params)).status).toBe(401);
  jest.mocked(getCurrentCommunity).mockResolvedValue(null);
  expect((await POST(request(), params)).status).toBe(404);
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
});
test.each(['missing', 'foreignArticle', 'archived', 'published', 'stale', 'analysisOnly'])('rejects %s stories before paid generation', async (kind) => {
  if (kind === 'missing') run = null;
  if (kind === 'foreignArticle') run.linkedArticle = { communityId: 'other-tenant' };
  if (kind === 'archived') run.status = 'ARCHIVED';
  if (kind === 'published') run.linkedArticle = { communityId: 'community-1', status: 'PUBLISHED' };
  if (kind === 'stale') run.drafts = [{ id }];
  if (kind === 'analysisOnly') run.drafts = [];
  expect((await POST(request(), params)).status).toBe(['missing', 'foreignArticle'].includes(kind) ? 404 : 409);
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
});
test.each([{ title: '' }, { body: '<p> </p><img src="test">' }, { draftId: 'invalid' }, { prompt: 'Override editorial rules' }])('rejects malformed input %j', async (changes) => {
  expect((await POST(request(changes), params)).status).toBe(400);
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
});
test('bounds request bytes before database access or inference', async () => {
  expect((await POST(request({ body: 'x'.repeat(230 * 1024) }), params)).status).toBe(413);
  expect(db.reporterRun.findFirst).not.toHaveBeenCalled();
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
});
test('checks configuration before spending and releases locks after provider failure', async () => {
  jest.mocked(assertHeroImageConfigured).mockImplementationOnce(() => { throw new HeroImageError('Configure storage', 503); });
  expect((await POST(request(), params)).status).toBe(503);
  expect(generateReporterHeroImage).not.toHaveBeenCalled();
  jest.mocked(generateReporterHeroImage).mockRejectedValueOnce(new HeroImageError('Provider unavailable', 502));
  expect((await POST(request(), params)).status).toBe(502);
  expect((await POST(request(), params)).status).toBe(201);
});
test('limits repeat paid requests without automatic retries', async () => {
  for (let index = 0; index < 10; index++) expect((await POST(request(), params)).status).toBe(201);
  const limited = await POST(request(), params);
  expect(limited.status).toBe(429);
  expect(limited.headers.get('retry-after')).toBeTruthy();
  expect(generateReporterHeroImage).toHaveBeenCalledTimes(10);
});
test('permits only one concurrent generation per run', async () => {
  let release!: (value: typeof generated) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  jest.mocked(generateReporterHeroImage).mockImplementationOnce(() => { entered(); return new Promise((resolve) => { release = resolve; }); });
  const first = POST(request(), params);
  await started;
  expect((await POST(request(), params)).status).toBe(409);
  release(generated);
  expect((await first).status).toBe(201);
  expect(generateReporterHeroImage).toHaveBeenCalledTimes(1);
});
