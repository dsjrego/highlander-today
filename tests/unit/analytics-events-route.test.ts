import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const { POST } = require('@/app/api/analytics/events/route') as typeof import('@/app/api/analytics/events/route');

function buildRequest(body: unknown, headers?: Record<string, string>) {
  const request = new Request('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-community-id': 'community-1',
      'x-community-domain': 'highlander.today',
      'x-user-id': 'user-1',
      ...headers,
    },
    body: JSON.stringify(body),
  }) as any;

  request.nextUrl = new URL('http://localhost/api/analytics/events');
  return request;
}

describe('analytics events route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.analyticsEvent.createMany as any).mockResolvedValue({ count: 2 });
  });

  it('ingests and normalizes batched analytics events', async () => {
    const response = await POST(
      buildRequest({
        events: [
          {
            eventName: 'page_view',
            contentType: 'ARTICLE',
            contentId: 'article-1',
            pageType: 'article-detail',
            pagePath: '/local-life/article-1',
            referrerUrl: 'https://www.google.com/search?q=highlander',
            metadata: {
              anonymousVisitorId: 'anon-1',
              sessionId: 'session-1',
              scrollBucket: 'top',
            },
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, accepted: 1 });
    expect(prismaMock.analyticsEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          communityId: 'community-1',
          siteDomain: 'highlander.today',
          userId: 'user-1',
          sessionId: 'session-1',
          anonymousVisitorId: 'anon-1',
          eventName: 'page_view',
          contentType: 'ARTICLE',
          contentId: 'article-1',
          pageType: 'article-detail',
          pagePath: '/local-life/article-1',
          referrerType: 'SEARCH',
          referrerHost: 'www.google.com',
          metadata: {
            scrollBucket: 'top',
          },
        }),
      ],
    });
  });

  it('rejects malformed analytics payloads', async () => {
    const response = await POST(
      buildRequest({
        events: [
          {
            eventName: 'not-real',
            pageType: 'article-detail',
            pagePath: '/local-life/article-1',
          },
        ],
      })
    );

    expect(response.status).toBe(400);
  });
});
