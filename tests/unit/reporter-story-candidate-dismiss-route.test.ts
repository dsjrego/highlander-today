import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({ db: prismaMock }));
const getCurrentCommunityMock = jest.fn();
jest.mock('@/lib/community', () => ({
  getCurrentCommunity: (...args: unknown[]) =>
    getCurrentCommunityMock(...(args as [])),
}));
const logActivityMock = jest.fn(() => Promise.resolve());
jest.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...(args as [])),
}));
const { POST } =
  require('@/app/api/admin/reporter/story-candidates/[id]/dismiss/route') as typeof import('@/app/api/admin/reporter/story-candidates/[id]/dismiss/route');
const params = { params: Promise.resolve({ id: 'candidate-1' }) };
function request(headers: Record<string, string> = {}) {
  return new Request(
    'http://localhost/api/admin/reporter/story-candidates/candidate-1/dismiss',
    {
      method: 'POST',
      headers: { 'x-user-id': 'editor-1', 'x-user-role': 'EDITOR', ...headers },
    }
  ) as any;
}

describe('candidate dismissal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentCommunityMock as any).mockResolvedValue({ id: 'community-1' });
    (prismaMock.reporterStoryCandidate.updateMany as any).mockResolvedValue({
      count: 1,
    });
  });
  it('records a durable tenant-scoped dismissal without changing assignments or sources', async () => {
    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    expect(prismaMock.reporterStoryCandidate.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'candidate-1',
        communityId: 'community-1',
        dismissedAt: null,
      },
      data: { dismissedAt: expect.any(Date), isActive: false },
    });
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'REPORTER_STORY_CANDIDATE',
        resourceId: 'candidate-1',
        metadata: { action: 'dismiss' },
      })
    );
  });
  it.each([
    ['', 401],
    ['READER', 403],
  ])('rejects unauthorized role %s', async (role, status) => {
    const response = await POST(
      request({ 'x-user-id': role ? 'user-1' : '', 'x-user-role': role }),
      params
    );
    expect(response.status).toBe(status);
    expect(prismaMock.reporterStoryCandidate.updateMany).not.toHaveBeenCalled();
  });
  it('preserves existing contributor edit permission', async () => {
    expect(
      (await POST(request({ 'x-user-role': 'CONTRIBUTOR' }), params)).status
    ).toBe(200);
  });
  it('fails closed without a community', async () => {
    (getCurrentCommunityMock as any).mockResolvedValue(null);
    expect((await POST(request(), params)).status).toBe(404);
    expect(prismaMock.reporterStoryCandidate.updateMany).not.toHaveBeenCalled();
  });
  it('returns not found for missing or other-tenant candidates', async () => {
    (prismaMock.reporterStoryCandidate.updateMany as any).mockResolvedValue({
      count: 0,
    });
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue(
      null
    );
    expect((await POST(request(), params)).status).toBe(404);
    expect(prismaMock.reporterStoryCandidate.findFirst).toHaveBeenCalledWith({
      where: { id: 'candidate-1', communityId: 'community-1' },
      select: { id: true },
    });
    expect(logActivityMock).not.toHaveBeenCalled();
  });
  it('accepts repeated dismissal without a duplicate audit event', async () => {
    (prismaMock.reporterStoryCandidate.updateMany as any).mockResolvedValue({
      count: 0,
    });
    (prismaMock.reporterStoryCandidate.findFirst as any).mockResolvedValue({
      id: 'candidate-1',
    });
    expect((await POST(request(), params)).status).toBe(200);
    expect(logActivityMock).not.toHaveBeenCalled();
  });
});
