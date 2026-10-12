import { jest, beforeEach, test, expect } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db', () => ({ db: { reporterRun: { findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock('@/lib/community', () => ({ getCurrentCommunity: jest.fn(async () => ({ id: 'community-1' })) }));
jest.mock('@/lib/activity-log', () => ({ logActivity: jest.fn(async () => {}) }));
const { db } = require('@/lib/db') as typeof import('@/lib/db');
const { PATCH } = require('@/app/api/reporter/runs/[id]/route') as typeof import('@/app/api/reporter/runs/[id]/route');
const params = { params: Promise.resolve({ id: 'run-1' }) };
function request(role = 'EDITOR', userId = 'editor-1') {
  return new NextRequest('http://localhost/api/reporter/runs/run-1', { method: 'PATCH',
    headers: { 'x-user-id': userId, 'x-user-role': role, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ARCHIVED' }),
  });
}
beforeEach(() => { jest.clearAllMocks(); });
test.each(['DRAFT_CREATED', 'CONVERTED_TO_ARTICLE', 'BLOCKED'])('archives %s without deleting drafts, sources or the linked article', async (status) => {
  jest.mocked(db.reporterRun.findUnique).mockResolvedValue({ id: 'run-1', communityId: 'community-1', status } as any);
  jest.mocked(db.reporterRun.update).mockResolvedValue({ id: 'run-1', status: 'ARCHIVED' } as any);
  expect((await PATCH(request(), params)).status).toBe(200);
  expect(db.reporterRun.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'run-1' }, data: { status: 'ARCHIVED' } }));
});
test('refuses another community’s story', async () => {
  jest.mocked(db.reporterRun.findUnique).mockResolvedValue({ id: 'run-1', communityId: 'other', status: 'DRAFT_CREATED' } as any);
  expect((await PATCH(request(), params)).status).toBe(404);
  expect(db.reporterRun.update).not.toHaveBeenCalled();
});
test('requires authentication and editing permission', async () => {
  expect((await PATCH(request('EDITOR', ''), params)).status).toBe(401);
  expect((await PATCH(request('READER'), params)).status).toBe(403);
  expect(db.reporterRun.update).not.toHaveBeenCalled();
});
