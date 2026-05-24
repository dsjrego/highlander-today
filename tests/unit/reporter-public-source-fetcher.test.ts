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

  it('extracts multiple article candidates from an HTML listing page', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'WJAC local news',
      communityId: 'community-1',
      url: 'https://wjac.example/news/local',
      sourceFormat: 'HTML',
      publisher: 'WJAC',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `<!doctype html>
        <html>
          <head>
            <title>Local News | WJAC</title>
            <meta property="og:site_name" content="WJAC" />
          </head>
          <body>
            <main>
              <article>
                <a href="/news/local/bridge-project-approved">
                  Bridge project approved after packed township meeting
                </a>
                <time datetime="2026-05-23T09:00:00Z"></time>
                <p>Supervisors approved the first phase after residents raised traffic concerns.</p>
              </article>
              <article>
                <a href="/news/local/school-board-budget-vote">
                  School board budget vote set after weeks of public debate
                </a>
                <time datetime="2026-05-23T10:30:00Z"></time>
                <p>District leaders scheduled a final vote following several crowded hearings.</p>
              </article>
            </main>
          </body>
        </html>`,
        { status: 200 }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-4', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            canonicalUrl: 'https://wjac.example/news/local/bridge-project-approved',
            title: 'Bridge project approved after packed township meeting',
            publisher: 'WJAC',
          }),
          expect.objectContaining({
            canonicalUrl: 'https://wjac.example/news/local/school-board-budget-vote',
            title: 'School board budget vote set after weeks of public debate',
            publisher: 'WJAC',
          }),
        ],
      })
    );
  });
});
