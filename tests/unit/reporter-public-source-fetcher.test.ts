import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const recordReporterMonitoredSourceFetchMock = jest.fn();
jest.mock('@/lib/reporter/monitored-source-ingestion', () => ({
  recordReporterMonitoredSourceFetch: (...args: unknown[]) =>
    recordReporterMonitoredSourceFetchMock(...(args as [])),
}));

const { executeReporterMonitoredSourceFetch } = require('@/lib/reporter/public-source-fetcher') as typeof import('@/lib/reporter/public-source-fetcher');

describe('reporter public source fetcher', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Borough RSS',
      communityId: 'community-1',
      url: 'https://borough.example/feed.xml',
      sourceFormat: 'RSS',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('parses RSS items and records a successful fetch', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Borough feed</title>
            <item>
              <guid>item-1</guid>
              <title>Council agenda posted</title>
              <link>/agendas/may-2026</link>
              <description>Agenda for the May meeting.</description>
              <pubDate>Fri, 22 May 2026 10:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`,
        {
          status: 200,
          headers: {
            etag: '"feed-1"',
            'last-modified': 'Fri, 22 May 2026 10:00:00 GMT',
          },
        }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-1', status: 'SUCCESS' },
      summary: { itemCount: 1, newItemCount: 1, changedItemCount: 0 },
    });

    const result = await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        httpStatus: 200,
        responseEtag: '"feed-1"',
        items: [
          expect.objectContaining({
            externalId: 'item-1',
            canonicalUrl: 'https://borough.example/agendas/may-2026',
            title: 'Council agenda posted',
          }),
        ],
      })
    );
    expect(result.fetch.id).toBe('fetch-1');
  });

  it('records no-change on 304 responses', async () => {
    global.fetch = jest.fn(async () => new Response(null, { status: 304 })) as any;
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-2', status: 'NO_CHANGE' },
      summary: { itemCount: 0, newItemCount: 0, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'NO_CHANGE',
        httpStatus: 304,
      })
    );
  });

  it('records failed fetches for unsupported formats', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'ICS feed',
      communityId: 'community-1',
      url: 'https://borough.example/calendar.ics',
      sourceFormat: 'ICS',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });
    global.fetch = jest.fn(async () => new Response('BEGIN:VCALENDAR', { status: 200 })) as any;
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-3', status: 'FAILED' },
      summary: { itemCount: 0, newItemCount: 0, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'FAILED',
        errorMessage: expect.stringContaining('not implemented'),
      })
    );
  });
});
