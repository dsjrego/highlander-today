import {
  buildBrowserCollectorDedupeKey,
  detectBrowserCollectorSourceFamily,
  finalizeBrowserCollectedItems,
  mergeBrowserCollectedDetail,
  normalizeBrowserCollectorCanonicalUrl,
} from '@/lib/reporter/local-browser-collector';

describe('reporter local browser collector helpers', () => {
  it('detects GetOccasion pages by host', () => {
    expect(
      detectBrowserCollectorSourceFamily(
        'https://app.getoccasion.com/p/stacks/7989/16147?utm_source=test'
      )
    ).toBe('getoccasion');
    expect(
      detectBrowserCollectorSourceFamily('https://events.example.org/calendar')
    ).toBe('generic');
  });

  it('normalizes GetOccasion canonical urls by stripping query and hash noise', () => {
    expect(
      normalizeBrowserCollectorCanonicalUrl(
        'https://app.getoccasion.com/p/events/12345?session=aaa&utm_source=test#signup',
        'https://app.getoccasion.com/p/stacks/7989/16147',
        'getoccasion'
      )
    ).toBe('https://app.getoccasion.com/p/events/12345');
  });

  it('builds stable dedupe keys for GetOccasion repeated-session variants', () => {
    const firstKey = buildBrowserCollectorDedupeKey(
      {
        title: 'Teen Pottery Workshop',
        canonicalUrl: 'https://app.getoccasion.com/p/events/12345?session=early',
        publishedAt: '2026-06-14T18:00:00.000Z',
        metadataJson: {
          eventLocation: 'Patton Arts Hall',
        },
      },
      'https://app.getoccasion.com/p/stacks/7989/16147',
      'getoccasion'
    );

    const secondKey = buildBrowserCollectorDedupeKey(
      {
        title: 'Teen Pottery Workshop',
        canonicalUrl: 'https://app.getoccasion.com/p/events/12345?session=late',
        publishedAt: '2026-06-14T18:00:00.000Z',
        metadataJson: {
          eventLocation: 'Patton Arts Hall',
        },
      },
      'https://app.getoccasion.com/p/stacks/7989/16147',
      'getoccasion'
    );

    expect(firstKey).toBe(secondKey);
  });

  it('prefers GetOccasion external ids for dedupe when available', () => {
    const firstKey = buildBrowserCollectorDedupeKey(
      {
        externalId: 'Xr2Xm6fQ',
        title: 'Guided Meditation & Oracle Card Reading',
        canonicalUrl: 'https://app.getoccasion.com/p/n/Xr2Xm6fQ?session=early',
        publishedAt: '2026-06-27T15:00:00.000Z',
      },
      'https://app.getoccasion.com/p/stacks/7989/16147',
      'getoccasion'
    );

    const secondKey = buildBrowserCollectorDedupeKey(
      {
        externalId: 'Xr2Xm6fQ',
        title: 'Guided Meditation & Oracle Card Reading',
        canonicalUrl: 'https://app.getoccasion.com/p/n/Xr2Xm6fQ?session=late',
        publishedAt: '2026-06-27T15:00:00.000Z',
      },
      'https://app.getoccasion.com/p/stacks/7989/16147',
      'getoccasion'
    );

    expect(firstKey).toBe('getoccasion-id:Xr2Xm6fQ:2026-06-27T15:00');
    expect(firstKey).toBe(secondKey);
  });

  it('finalizes browser-collected items with normalized urls, eventStartAt metadata, and dedupe', () => {
    const items = finalizeBrowserCollectedItems(
      [
        {
          title: ' Teen Pottery Workshop ',
          canonicalUrl: 'https://app.getoccasion.com/p/events/12345?session=early',
          publishedAt: '2026-06-14T18:00:00.000Z',
          excerpt: 'Hands-on clay session.',
          metadataJson: {
            eventLocation: 'Patton Arts Hall',
          },
        },
        {
          title: 'Teen Pottery Workshop',
          canonicalUrl: 'https://app.getoccasion.com/p/events/12345?session=late',
          publishedAt: '2026-06-14T18:00:00.000Z',
          excerpt: 'Hands-on clay session. Register now.',
          metadataJson: {
            eventLocation: 'Patton Arts Hall',
          },
        },
      ],
      'https://app.getoccasion.com/p/stacks/7989/16147'
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Teen Pottery Workshop',
      externalId: '12345',
      canonicalUrl: 'https://app.getoccasion.com/p/events/12345',
      publishedAt: '2026-06-14T18:00:00.000Z',
      metadataJson: expect.objectContaining({
        sourceFamily: 'getoccasion',
        eventStartAt: '2026-06-14T18:00:00.000Z',
      }),
    });
  });

  it('enriches GetOccasion schedule-title items into event-like titles and metadata', () => {
    const items = finalizeBrowserCollectedItems(
      [
        {
          title: '27 Jun Saturday 11:00 AM - 12:30 PM',
          canonicalUrl: 'https://app.getoccasion.com/p/n/Xr2Xm6fQ',
          excerpt:
            'Guided Meditation & Oracle Card Reading L.a. Studio + ART14 Artist Residency Journey with us through a peaceful guided meditation designed to help you relax.',
          metadataJson: {
            imageUrl: 'https://cdn.example.com/events/guided-meditation.jpg',
          },
        },
      ],
      'https://app.getoccasion.com/p/stacks/7989/16147'
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Guided Meditation & Oracle Card Reading',
      externalId: 'Xr2Xm6fQ',
      canonicalUrl: 'https://app.getoccasion.com/p/n/Xr2Xm6fQ',
      publishedAt: expect.stringMatching(/^202\d-06-27T15:00:00\.000Z$/),
      metadataJson: expect.objectContaining({
        sourceFamily: 'getoccasion',
        organizer: 'L.a. Studio + ART14 Artist Residency',
        imageUrl: 'https://cdn.example.com/events/guided-meditation.jpg',
        eventStartAt: expect.stringMatching(/^202\d-06-27T15:00:00\.000Z$/),
        eventEndAt: expect.stringMatching(/^202\d-06-27T16:30:00\.000Z$/),
      }),
    });
    expect(items[0].excerpt).toContain('Journey with us through a peaceful guided meditation');
  });

  it('merges second-pass detail page fields into a collected item', () => {
    const merged = mergeBrowserCollectedDetail(
      {
        title: '27 Jun Saturday 11:00 AM - 12:30 PM',
        canonicalUrl: 'https://app.getoccasion.com/p/n/Xr2Xm6fQ',
        excerpt: 'Short listing summary…',
        metadataJson: {
          sourceFamily: 'getoccasion',
          imageUrl: 'https://cdn.example.com/events/guided-meditation-thumb.jpg',
        },
      },
      {
        title: 'Guided Meditation & Oracle Card Reading',
        excerpt: 'Journey with us through a peaceful guided meditation designed to help you relax, recharge, and reconnect.',
        contentText:
          'Journey with us through a peaceful guided meditation designed to help you relax, recharge, and reconnect. A mini oracle card reading follows the session.',
        imageUrl: 'https://cdn.example.com/events/guided-meditation.jpg',
        organizer: 'L.a. Studio + ART14 Artist Residency',
        eventStartAt: '2026-06-27T15:00:00.000Z',
        eventEndAt: '2026-06-27T16:30:00.000Z',
      }
    );

    expect(merged).toMatchObject({
      title: 'Guided Meditation & Oracle Card Reading',
      publishedAt: '2026-06-27T15:00:00.000Z',
      excerpt: expect.stringContaining('Journey with us through a peaceful guided meditation'),
      contentText: expect.stringContaining('A mini oracle card reading follows the session.'),
      metadataJson: expect.objectContaining({
        imageUrl: 'https://cdn.example.com/events/guided-meditation.jpg',
        organizer: 'L.a. Studio + ART14 Artist Residency',
        eventStartAt: '2026-06-27T15:00:00.000Z',
        eventEndAt: '2026-06-27T16:30:00.000Z',
      }),
    });
  });
});
