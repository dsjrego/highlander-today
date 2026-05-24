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

const recordReporterMonitoredSourceFetchMock = jest.fn();
jest.mock('@/lib/reporter/monitored-source-ingestion', () => ({
  recordReporterMonitoredSourceFetch: (...args: unknown[]) =>
    recordReporterMonitoredSourceFetchMock(...(args as [])),
}));

const executeReporterMonitoredSourceFetchMock = jest.fn();
jest.mock('@/lib/reporter/public-source-fetcher', () => ({
  executeReporterMonitoredSourceFetch: (...args: unknown[]) =>
    executeReporterMonitoredSourceFetchMock(...(args as [])),
}));

const runDueReporterMonitoredSourcesMock = jest.fn();
jest.mock('@/lib/reporter/monitored-source-scheduler', () => ({
  runDueReporterMonitoredSources: (...args: unknown[]) =>
    runDueReporterMonitoredSourcesMock(...(args as [])),
}));

const collectionRoute = require('@/app/api/admin/reporter/monitored-sources/route') as typeof import('@/app/api/admin/reporter/monitored-sources/route');
const itemRoute = require('@/app/api/admin/reporter/monitored-sources/[id]/route') as typeof import('@/app/api/admin/reporter/monitored-sources/[id]/route');
const fetchRoute = require('@/app/api/admin/reporter/monitored-sources/[id]/record-fetch/route') as typeof import('@/app/api/admin/reporter/monitored-sources/[id]/record-fetch/route');
const runFetchRoute = require('@/app/api/admin/reporter/monitored-sources/[id]/run-fetch/route') as typeof import('@/app/api/admin/reporter/monitored-sources/[id]/run-fetch/route');
const itemDeleteRoute = require('@/app/api/admin/reporter/monitored-sources/[id]/items/[itemId]/route') as typeof import('@/app/api/admin/reporter/monitored-sources/[id]/items/[itemId]/route');
const runDueRoute = require('@/app/api/admin/reporter/monitored-sources/run-due/route') as typeof import('@/app/api/admin/reporter/monitored-sources/run-due/route');
const runDueCommunityRoute = require('@/app/api/admin/reporter/monitored-sources/run-due/[communitySlug]/route') as typeof import('@/app/api/admin/reporter/monitored-sources/run-due/[communitySlug]/route');

function buildRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'editor-1',
      'x-user-role': 'EDITOR',
      'x-community-id': 'community-1',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;
}

describe('reporter monitored source routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
    (getCurrentCommunityMock as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
  });

  it('creates a monitored source scoped to the current community', async () => {
    (prismaMock.tenantCoverageArea.findFirst as any).mockResolvedValue({ id: 'coverage-1' });
    (prismaMock.reporterMonitoredSource.create as any).mockResolvedValue({
      id: 'source-1',
      communityId: 'community-1',
      label: 'Borough agendas',
      sourceType: 'MUNICIPAL_AGENDA',
      sourceFormat: 'HTML',
      url: 'https://borough.example/agendas',
      publisher: 'Borough',
      notes: null,
      status: 'ACTIVE',
      fetchFrequencyMinutes: 1440,
      lastFetchedAt: null,
      lastSuccessfulAt: null,
      lastChangedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastHttpStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      place: {
        id: 'place-1',
        displayName: 'Cambria Heights',
        slug: 'cambria-heights',
        type: 'BOROUGH',
      },
      _count: {
        fetches: 0,
        ingestionItems: 0,
      },
      fetches: [],
    });

    const response = await collectionRoute.POST(
      buildRequest('POST', 'http://localhost/api/admin/reporter/monitored-sources', {
        label: 'Borough agendas',
        sourceType: 'MUNICIPAL_AGENDA',
        sourceFormat: 'HTML',
        url: 'borough.example/agendas',
        placeId: '11111111-1111-4111-8111-111111111111',
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      source: expect.objectContaining({
        id: 'source-1',
        label: 'Borough agendas',
      }),
    });
    expect(prismaMock.reporterMonitoredSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          url: 'https://borough.example/agendas',
          placeId: '11111111-1111-4111-8111-111111111111',
        }),
      })
    );
    expect(logActivityMock).toHaveBeenCalled();
  });

  it('updates a monitored source status', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      communityId: 'community-1',
    });
    (prismaMock.reporterMonitoredSource.update as any).mockResolvedValue({
      id: 'source-1',
      communityId: 'community-1',
      label: 'Borough agendas',
      sourceType: 'MUNICIPAL_AGENDA',
      sourceFormat: 'HTML',
      url: 'https://borough.example/agendas',
      publisher: null,
      notes: null,
      status: 'PAUSED',
      fetchFrequencyMinutes: 1440,
      lastFetchedAt: null,
      lastSuccessfulAt: null,
      lastChangedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      lastHttpStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      place: null,
      _count: {
        fetches: 0,
        ingestionItems: 0,
      },
      fetches: [],
    });

    const response = await itemRoute.PATCH(
      buildRequest('PATCH', 'http://localhost/api/admin/reporter/monitored-sources/source-1', {
        status: 'PAUSED',
      }),
      { params: { id: 'source-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      source: expect.objectContaining({
        id: 'source-1',
        status: 'PAUSED',
      }),
    });
  });

  it('deletes a monitored-source ingestion item', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      communityId: 'community-1',
    });
    (prismaMock.reporterSourceIngestionItem.findFirst as any).mockResolvedValue({
      id: 'item-1',
      title: 'Bridge project approved',
      canonicalUrl: 'https://example.com/bridge-project',
    });
    (prismaMock.reporterSourceIngestionItem.delete as any).mockResolvedValue({
      id: 'item-1',
    });

    const response = await itemDeleteRoute.DELETE(
      buildRequest(
        'DELETE',
        'http://localhost/api/admin/reporter/monitored-sources/source-1/items/item-1'
      ),
      { params: { id: 'source-1', itemId: 'item-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.reporterSourceIngestionItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    });
    expect(logActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        resourceType: 'REPORTER_MONITORED_SOURCE',
        resourceId: 'source-1',
      })
    );
  });

  it('records a monitored-source fetch result', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      communityId: 'community-1',
    });
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: {
        id: 'fetch-1',
        status: 'SUCCESS',
      },
      summary: {
        itemCount: 1,
        newItemCount: 1,
        changedItemCount: 0,
      },
    });

    const response = await fetchRoute.POST(
      buildRequest(
        'POST',
        'http://localhost/api/admin/reporter/monitored-sources/source-1/record-fetch',
        {
          status: 'SUCCESS',
          httpStatus: 200,
          items: [
            {
              canonicalUrl: 'https://borough.example/agendas/may-2026',
              title: 'May 2026 agenda',
            },
          ],
        }
      ),
      { params: { id: 'source-1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      fetch: expect.objectContaining({
        id: 'fetch-1',
      }),
      summary: {
        itemCount: 1,
        newItemCount: 1,
        changedItemCount: 0,
      },
    });
    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
      })
    );
  });

  it('runs an automated public-source fetch and returns the refreshed source row', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any)
      .mockResolvedValueOnce({
        id: 'source-1',
        communityId: 'community-1',
        label: 'Borough agendas',
      })
      .mockResolvedValueOnce({
        id: 'source-1',
        communityId: 'community-1',
        label: 'Borough agendas',
        sourceType: 'MUNICIPAL_AGENDA',
        sourceFormat: 'RSS',
        url: 'https://borough.example/rss',
        publisher: 'Borough',
        notes: null,
        status: 'ACTIVE',
        fetchFrequencyMinutes: 1440,
        lastFetchedAt: new Date(),
        lastSuccessfulAt: new Date(),
        lastChangedAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
        lastHttpStatus: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        place: null,
        _count: { fetches: 1, ingestionItems: 4 },
        fetches: [],
      });
    (executeReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-1', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 1, changedItemCount: 0 },
    });

    const response = await runFetchRoute.POST(
      buildRequest('POST', 'http://localhost/api/admin/reporter/monitored-sources/source-1/run-fetch'),
      { params: { id: 'source-1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      fetch: { id: 'fetch-1', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 1, changedItemCount: 0 },
      source: expect.objectContaining({
        id: 'source-1',
        status: 'ACTIVE',
      }),
    });
    expect(executeReporterMonitoredSourceFetchMock).toHaveBeenCalledWith('source-1');
  });

  it('runs due monitored sources for the current community', async () => {
    (runDueReporterMonitoredSourcesMock as any).mockResolvedValue({
      attemptedCount: 1,
      results: [
        {
          monitoredSourceId: 'source-1',
          label: 'Borough agendas',
          fetchStatus: 'SUCCESS',
          itemCount: 2,
          newItemCount: 1,
          changedItemCount: 0,
          fetchId: 'fetch-10',
        },
      ],
      summary: {
        successCount: 1,
        noChangeCount: 0,
        failedCount: 0,
      },
    });
    (prismaMock.reporterMonitoredSource.findMany as any).mockResolvedValue([
      {
        id: 'source-1',
        communityId: 'community-1',
        label: 'Borough agendas',
        sourceType: 'MUNICIPAL_AGENDA',
        sourceFormat: 'RSS',
        url: 'https://borough.example/rss',
        publisher: 'Borough',
        notes: null,
        status: 'ACTIVE',
        fetchFrequencyMinutes: 1440,
        lastFetchedAt: new Date(),
        lastSuccessfulAt: new Date(),
        lastChangedAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
        lastHttpStatus: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        place: null,
        _count: { fetches: 1, ingestionItems: 2 },
        fetches: [],
      },
    ]);

    const response = await runDueRoute.POST(
      buildRequest('POST', 'http://localhost/api/admin/reporter/monitored-sources/run-due', {
        limit: 5,
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      attemptedCount: 1,
      summary: {
        successCount: 1,
        noChangeCount: 0,
        failedCount: 0,
      },
      sources: [expect.objectContaining({ id: 'source-1' })],
    });
    expect(runDueReporterMonitoredSourcesMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      limit: 5,
    });
  });

  it('runs due monitored sources through the cron-compatible GET path', async () => {
    process.env.CRON_SECRET = 'cron-secret-1';
    (prismaMock.community.findFirst as any).mockResolvedValue({
      id: 'community-1',
      name: 'Highlander Today',
      slug: 'highlander-today',
    });
    (runDueReporterMonitoredSourcesMock as any).mockResolvedValue({
      attemptedCount: 0,
      results: [],
      summary: {
        successCount: 0,
        noChangeCount: 0,
        failedCount: 0,
      },
    });

    const response = await runDueCommunityRoute.GET(
      buildRequest(
        'GET',
        'http://localhost/api/admin/reporter/monitored-sources/run-due/highlander-today',
        undefined,
        {
          authorization: 'Bearer cron-secret-1',
          'x-user-id': '',
          'x-user-role': '',
        }
      ),
      { params: { communitySlug: 'highlander-today' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      community: {
        slug: 'highlander-today',
      },
      attemptedCount: 0,
    });
    expect(runDueReporterMonitoredSourcesMock).toHaveBeenCalledWith({
      communityId: 'community-1',
      limit: undefined,
    });
  });
});
