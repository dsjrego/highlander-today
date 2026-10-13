import {
  isPacastListingUrl,
  pacastListedActivityDate,
  parsePacastListing,
} from '@/lib/reporter/pacast-source';

const banner = (
  href = 'm?p=29950',
  date = 'October 9, 2026',
  title = 'Pennsylvania timber announcement',
) =>
  `<section id="banner"><div><header><p>${date} <!-- publisher separator --> - Potter County, PA</p><h2>${title}</h2></header><ul><li><a href="${href}">View Media</a></li></ul></div></section>`;

describe('PAcast public listing adapter', () => {
  it('keeps publisher dates/locations as provenance and requires underlying evidence', () => {
    const [item] = parsePacastListing(banner());
    expect(item).toMatchObject({
      dedupeKey: 'pacast:29950',
      externalId: '29950',
      canonicalUrl: 'https://pacast.com/m?p=29950',
      publishedAt: null,
      contentText: null,
      publisher: 'Commonwealth Media Services',
      metadataJson: {
        sourceListedDate: '2026-10-09',
        dateBasis: 'listed-media-date',
        listedLocation: 'Potter County, PA',
        publicationDateVerified: false,
        documentTextRequired: true,
      },
    });
    expect(item.metadataJson).not.toHaveProperty('eventStartAt');
  });
  it('deduplicates an advisory that becomes a media record using its production ID', () => {
    const items = parsePacastListing(banner('a?p=9') + banner('m?p=9') + banner('a?p=9'));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      dedupeKey: 'pacast:9',
      canonicalUrl: 'https://pacast.com/m?p=9',
      metadataJson: { recordKind: 'media' },
    });
  });
  it('rejects navigation, offsite/credential links, invalid dates and markup drift', () => {
    for (const html of [
      '<title>PAcast</title><a href="/">Home</a>',
      banner('https://other.example/m?p=1'),
      banner('https://user:pass@pacast.com/m?p=1'),
      banner('m?p=1', 'February 30, 2026'),
      banner('m?p=1&tracking=1'),
    ]) {
      expect(() => parsePacastListing(html)).toThrow('no validated');
    }
  });
  it('bounds and orders records, decodes entities and keeps a missing location unknown', () => {
    const items = parsePacastListing(
      Array.from({ length: 20 }, (_, i) =>
        banner(`m?p=${i}`, `October ${i + 1}, 2026`, 'Farm &amp; rural programs'),
      ).join(''),
    );
    expect(items).toHaveLength(12);
    expect(items[0]).toMatchObject({
      title: 'Farm & rural programs',
      metadataJson: { sourceListedDate: '2026-10-20' },
    });
    const [unknown] = parsePacastListing(banner().replace(' - Potter County, PA', ''));
    expect(unknown.metadataJson.listedLocation).toBeNull();
  });
  it('limits request/extraction specialization to the reviewed canonical homepage', () => {
    expect(isPacastListingUrl('https://pacast.com/')).toBe(true);
    for (const url of [
      'https://pacast.com.evil.example/',
      'https://user:pass@pacast.com/',
      'http://pacast.com/',
      'https://pacast.com/m?p=1',
      'https://pacast.com/?x=1',
      'https://pacast.com:8443/',
    ])
      expect(isPacastListingUrl(url)).toBe(false);
  });
  it('uses only validated PAcast source dates for activity, not arbitrary metadata', () => {
    expect(
      pacastListedActivityDate({
        extractionMode: 'pacast-listing',
        sourceListedDate: '2026-10-09',
      }),
    ).toEqual(new Date('2026-10-09T00:00:00Z'));
    for (const metadata of [
      null,
      [],
      { extractionMode: 'other', sourceListedDate: '2026-10-09' },
      { extractionMode: 'pacast-listing', sourceListedDate: '2026-02-30' },
    ])
      expect(pacastListedActivityDate(metadata)).toBeNull();
  });
});
