import { normalizeReporterRunInput } from '@/lib/reporter/run-normalizer';

describe('normalizeReporterRunInput', () => {
  it('normalizes topic and creates initial sources from notes and links', () => {
    const result = normalizeReporterRunInput({
      topic: '  Borough budget vote  ',
      whatHappened: '  Council approved the budget after a split vote. ',
      notes: '  Residents challenged the tax increase. ',
      supportingLinks: [' https://example.com/agenda ', 'not-a-url', ''],
      requesterEmail: '  tipster@example.com ',
    });

    expect(result.topic).toBe('Borough budget vote');
    expect(result.requesterEmail).toBe('tipster@example.com');
    expect(result.initialSources).toHaveLength(3);
    expect(result.initialSources[0]).toMatchObject({
      sourceType: 'USER_NOTE',
      title: 'What happened',
    });
    expect(result.initialSources[2]).toMatchObject({
      sourceType: 'OFFICIAL_URL',
      url: 'https://example.com/agenda',
    });
  });

  it('falls back to story description when topic is missing', () => {
    const result = normalizeReporterRunInput({
      whatHappened: 'Water service was interrupted on Maple Avenue.',
    });

    expect(result.topic).toBe('Water service was interrupted on Maple Avenue.');
  });

  it('keeps explicit initial source seeds for multi-source packets', () => {
    const result = normalizeReporterRunInput({
      topic: 'Downtown water advisory',
      initialSources: [
        {
          sourceType: 'NEWS_ARTICLE',
          title: 'Station report',
          url: 'https://example.com/station-report',
          excerpt: 'Residents were told to boil water before use.',
          note: 'From monitored source: WJAC TV',
          reliabilityTier: 'UNVERIFIED',
        },
        {
          sourceType: 'OFFICIAL_URL',
          title: 'Borough advisory',
          url: 'https://borough.example/advisory',
          excerpt: 'The borough lists affected streets and pickup times.',
          reliabilityTier: 'PRIMARY',
        },
      ],
    });

    expect(result.initialSources).toEqual([
      expect.objectContaining({
        sourceType: 'NEWS_ARTICLE',
        title: 'Station report',
        url: 'https://example.com/station-report',
      }),
      expect.objectContaining({
        sourceType: 'OFFICIAL_URL',
        title: 'Borough advisory',
        url: 'https://borough.example/advisory',
        reliabilityTier: 'PRIMARY',
      }),
    ]);
  });

  it('throws when neither topic nor story description is present', () => {
    expect(() => normalizeReporterRunInput({ notes: 'Missing core topic' })).toThrow(
      'Reporter run requires a topic or story description'
    );
  });
});
