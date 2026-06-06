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

  it('parses ICS events and records a successful fetch', async () => {
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
    global.fetch = jest.fn(async () =>
      new Response(
        `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Highlander Today//Reporter Test//EN
BEGIN:VEVENT
UID:event-1@example.com
DTSTAMP:20260523T120000Z
DTSTART:20260530T180000Z
LAST-MODIFIED:20260524T093000Z
SUMMARY:Town hall on downtown parking proposal
DESCRIPTION:Residents can ask questions about the new parking plan\\nDoors open at 5:30 PM.
LOCATION:Borough Building
URL:/events/town-hall-parking
END:VEVENT
BEGIN:VEVENT
UID:event-2@example.com
DTSTART;VALUE=DATE:20260602
SUMMARY:Summer reading kickoff at the library
DESCRIPTION:All-day family event with crafts and sign-ups for the reading challenge.
LOCATION:Cambria Library
END:VEVENT
END:VCALENDAR`,
        { status: 200 }
      )
    ) as any;
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-3', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            externalId: 'event-1@example.com',
            canonicalUrl: 'https://borough.example/events/town-hall-parking',
            title: 'Town hall on downtown parking proposal',
            publisher: 'Borough',
          }),
          expect.objectContaining({
            externalId: 'event-2@example.com',
            canonicalUrl: null,
            title: 'Summer reading kickoff at the library',
            publisher: 'Borough',
          }),
        ],
      })
    );
  });

  it('extracts a document item from a text-based PDF notice', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'PDF notices',
      communityId: 'community-1',
      url: 'https://borough.example/notices.pdf',
      sourceFormat: 'PDF',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });
    global.fetch = jest.fn(async () =>
      new Response(
        `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 207 >>
stream
BT
/F1 16 Tf
72 720 Td
(Borough meeting notice for June 2026) Tj
0 -24 Td
(The zoning hearing board will meet on June 14, 2026 at 6:00 PM.) Tj
0 -24 Td
(Residents may attend at the municipal building.) Tj
ET
endstream
endobj
5 0 obj
<< /Title (Borough meeting notice for June 2026) /Author (Borough) /ModDate (D:20260522103000Z) >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`,
        {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
          },
        }
      )
    ) as any;
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-3b', status: 'SUCCESS' },
      summary: { itemCount: 1, newItemCount: 1, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            canonicalUrl: 'https://borough.example/notices.pdf',
            title: 'Borough meeting notice for June 2026',
            publisher: 'Borough',
            excerpt: expect.stringContaining('The zoning hearing board will meet on June 14, 2026'),
          }),
        ],
      })
    );
  });

  it('splits multi-notice PDFs into separate ingestion items', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Municipal notices bundle',
      communityId: 'community-1',
      url: 'https://borough.example/public-notices.pdf',
      sourceFormat: 'PDF',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });
    global.fetch = jest.fn(async () =>
      new Response(
        `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 360 >>
stream
BT
/F1 14 Tf
72 720 Td
(Public Hearing Notice - Water Authority) Tj
0 -20 Td
(The authority will hold a public hearing on June 18, 2026 at 7:00 PM.) Tj
0 -20 Td
(Comments may be submitted in writing before the hearing.) Tj
0 -30 Td
(Planning Commission Meeting Agenda) Tj
0 -20 Td
(The Planning Commission will meet on June 22, 2026 at 6:30 PM.) Tj
0 -20 Td
(Agenda items include subdivision review and zoning updates.) Tj
ET
endstream
endobj
5 0 obj
<< /Author (Borough) /ModDate (D:20260515103000Z) >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`,
        {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
          },
        }
      )
    ) as any;
    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-3c', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            dedupeKey: 'pdf-notice:borough:public hearing notice water authority',
            canonicalUrl: 'https://borough.example/public-notices.pdf',
            title: 'Public Hearing Notice - Water Authority',
            publisher: 'Borough',
            excerpt: expect.stringContaining('June 18, 2026'),
          }),
          expect.objectContaining({
            dedupeKey: 'pdf-notice:borough:planning commission meeting agenda',
            canonicalUrl: 'https://borough.example/public-notices.pdf',
            title: 'Planning Commission Meeting Agenda',
            publisher: 'Borough',
            excerpt: expect.stringContaining('June 22, 2026'),
          }),
        ],
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

  it('extracts publishedAt from bare date text in HTML article context without a time element', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Borough news',
      communityId: 'community-1',
      url: 'https://borough.example/news',
      sourceFormat: 'HTML',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `<!doctype html>
        <html>
          <head><meta property="og:site_name" content="Borough" /></head>
          <body>
            <article>
              <a href="/news/council-votes-on-parking">Council votes on parking garage downtown</a>
              <span class="byline">Published May 27, 2026</span>
              <p>The council approved the parking garage proposal after months of debate.</p>
            </article>
            <article>
              <a href="/news/school-levy-passes">School levy passes with strong voter support</a>
              <span class="byline">27 May 2026</span>
              <p>The levy will fund capital improvements across three district schools.</p>
            </article>
          </body>
        </html>`,
        { status: 200 }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-6', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            canonicalUrl: 'https://borough.example/news/council-votes-on-parking',
            title: 'Council votes on parking garage downtown',
            publishedAt: expect.any(Date),
          }),
          expect.objectContaining({
            canonicalUrl: 'https://borough.example/news/school-levy-passes',
            title: 'School levy passes with strong voter support',
            publishedAt: expect.any(Date),
          }),
        ],
      })
    );
  });

  it('extracts event-like items from low-structure HTML blocks with generic CTA links', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Community arts events',
      communityId: 'community-1',
      url: 'https://arts.example/events',
      sourceFormat: 'HTML',
      publisher: 'Arts Center',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `<!doctype html>
        <html>
          <head>
            <title>Events | Arts Center</title>
            <meta property="og:site_name" content="Arts Center" />
          </head>
          <body>
            <main>
              <section class="event-card">
                <h2>Teen Pottery Workshop</h2>
                <p>June 14, 2026 at 6:00 PM at Patton Arts Hall.</p>
                <p>Hands-on clay session for middle and high school students.</p>
                <a href="/signup/pottery">Register</a>
              </section>
              <section class="event-card">
                <h2>Summer Watercolor Basics</h2>
                <p>June 21, 2026 at 10:00 AM at Patton Arts Hall.</p>
                <p>Introductory class covering brush control and color mixing.</p>
                <a href="https://tickets.example/watercolor">Details</a>
              </section>
            </main>
          </body>
        </html>`,
        { status: 200 }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-6b', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        items: expect.arrayContaining([
          expect.objectContaining({
            canonicalUrl: 'https://arts.example/events',
            title: 'Teen Pottery Workshop',
            publisher: 'Arts Center',
            publishedAt: expect.any(Date),
            metadataJson: expect.objectContaining({
              format: 'HTML',
              extractionMode: 'event-block',
              eventLocation: 'Patton Arts Hall',
            }),
          }),
          expect.objectContaining({
            canonicalUrl: 'https://arts.example/events',
            title: 'Summer Watercolor Basics',
            publisher: 'Arts Center',
            publishedAt: expect.any(Date),
            metadataJson: expect.objectContaining({
              extractionMode: 'event-block',
            }),
          }),
        ]),
      })
    );
  });

  it('extracts publishedAt from ordinal and day-first date formats in PDF notices', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Municipal notices',
      communityId: 'community-1',
      url: 'https://borough.example/notices.pdf',
      sourceFormat: 'PDF',
      publisher: 'Borough',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 360 >>
stream
BT
/F1 14 Tf
72 720 Td
(Public Hearing Notice - Water Authority) Tj
0 -20 Td
(The authority will hold a public hearing on June 18th, 2026 at 7:00 PM.) Tj
0 -20 Td
(Comments may be submitted in writing before the hearing.) Tj
0 -30 Td
(Planning Commission Meeting Agenda) Tj
0 -20 Td
(The Planning Commission will meet on 22 June 2026 at 6:30 PM.) Tj
0 -20 Td
(Agenda items include subdivision review and zoning updates.) Tj
ET
endstream
endobj
5 0 obj
<< /Author (Borough) /ModDate (D:20260515103000Z) >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`,
        { status: 200, headers: { 'content-type': 'application/pdf' } }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-7', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            title: 'Public Hearing Notice - Water Authority',
            publishedAt: expect.any(Date),
          }),
          expect.objectContaining({
            title: 'Planning Commission Meeting Agenda',
            publishedAt: expect.any(Date),
          }),
        ],
      })
    );
  });

  it('uses url-based dedupeKey for PDF notices when publisher is absent', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'Anonymous notices',
      communityId: 'community-1',
      url: 'https://example.com/public-notices.pdf',
      sourceFormat: 'PDF',
      publisher: null,
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 300 >>
stream
BT
/F1 14 Tf
72 720 Td
(Public Hearing Notice - Water Authority) Tj
0 -20 Td
(Hearing scheduled for June 18, 2026 at 7:00 PM at the municipal building.) Tj
0 -30 Td
(Planning Commission Meeting Agenda) Tj
0 -20 Td
(The Planning Commission meets on June 22, 2026 to review subdivision plans.) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`,
        { status: 200, headers: { 'content-type': 'application/pdf' } }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-8', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            dedupeKey: 'https://example.com/public-notices.pdf#public-hearing-notice-water-authority',
            title: 'Public Hearing Notice - Water Authority',
          }),
          expect.objectContaining({
            dedupeKey: 'https://example.com/public-notices.pdf#planning-commission-meeting-agenda',
            title: 'Planning Commission Meeting Agenda',
          }),
        ],
      })
    );
  });

  it('prefers JSON-LD article data from noisy HTML listing pages', async () => {
    (prismaMock.reporterMonitoredSource.findUnique as any).mockResolvedValue({
      id: 'source-1',
      label: 'County newsroom',
      communityId: 'community-1',
      url: 'https://county.example/news',
      sourceFormat: 'HTML',
      publisher: 'County',
      status: 'ACTIVE',
      lastETag: null,
      lastModifiedHeader: null,
    });

    global.fetch = jest.fn(async () =>
      new Response(
        `<!doctype html>
        <html>
          <head>
            <title>County Newsroom</title>
            <meta property="og:site_name" content="County" />
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "item": {
                      "@type": "NewsArticle",
                      "@id": "https://county.example/news/bridge-repair",
                      "headline": "Bridge repair schedule released for Route 53 corridor",
                      "description": "County officials published the expected closure and detour timeline.",
                      "datePublished": "2026-05-25T14:00:00Z",
                      "publisher": { "@type": "Organization", "name": "County" }
                    }
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "item": {
                      "@type": "NewsArticle",
                      "url": "/news/ems-station-opening",
                      "headline": "New EMS station opening set after final inspection clears",
                      "description": "The new station is expected to shorten emergency response times.",
                      "datePublished": "2026-05-25T16:30:00Z",
                      "publisher": { "@type": "Organization", "name": "County" }
                    }
                  }
                ]
              }
            </script>
          </head>
          <body>
            <nav>
              <a href="/about">About</a>
              <a href="/contact">Contact us</a>
            </nav>
            <main>
              <section>
                <a href="/news/bridge-repair">Read full release</a>
                <a href="/news/ems-station-opening">Continue reading</a>
              </section>
            </main>
          </body>
        </html>`,
        { status: 200 }
      )
    ) as any;

    (recordReporterMonitoredSourceFetchMock as any).mockResolvedValue({
      fetch: { id: 'fetch-5', status: 'SUCCESS' },
      summary: { itemCount: 2, newItemCount: 2, changedItemCount: 0 },
    });

    await executeReporterMonitoredSourceFetch('source-1');

    expect(recordReporterMonitoredSourceFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monitoredSourceId: 'source-1',
        status: 'SUCCESS',
        items: [
          expect.objectContaining({
            canonicalUrl: 'https://county.example/news/bridge-repair',
            title: 'Bridge repair schedule released for Route 53 corridor',
            excerpt: 'County officials published the expected closure and detour timeline.',
            publisher: 'County',
          }),
          expect.objectContaining({
            canonicalUrl: 'https://county.example/news/ems-station-opening',
            title: 'New EMS station opening set after final inspection clears',
            excerpt: 'The new station is expected to shorten emergency response times.',
            publisher: 'County',
          }),
        ],
      })
    );
  });
});
