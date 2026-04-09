import { buildSeriesEventPositions, getScopedSeriesEventIds } from '@/lib/event-series';

describe('event series helpers', () => {
  it('recomputes series positions after events are reordered', () => {
    const positions = buildSeriesEventPositions([
      { id: 'event-c', startDatetime: new Date('2026-05-20T18:00:00Z') },
      { id: 'event-a', startDatetime: new Date('2026-05-06T18:00:00Z') },
      { id: 'event-b', startDatetime: new Date('2026-05-13T18:00:00Z') },
    ]);

    expect(positions).toEqual([
      { id: 'event-a', seriesPosition: 1, seriesCount: 3 },
      { id: 'event-b', seriesPosition: 2, seriesCount: 3 },
      { id: 'event-c', seriesPosition: 3, seriesCount: 3 },
    ]);
  });

  it('selects only the current and later events for FUTURE scope based on ordered series membership', () => {
    const ids = getScopedSeriesEventIds(
      [
        { id: 'event-a' },
        { id: 'event-b' },
        { id: 'event-c' },
      ],
      'event-b',
      'FUTURE'
    );

    expect(ids).toEqual(['event-b', 'event-c']);
  });

  it('returns the entire series for SERIES scope', () => {
    const ids = getScopedSeriesEventIds(
      [
        { id: 'event-a' },
        { id: 'event-b' },
      ],
      'event-a',
      'SERIES'
    );

    expect(ids).toEqual(['event-a', 'event-b']);
  });

  it('returns an empty result when the current event is not present in the series list', () => {
    const ids = getScopedSeriesEventIds([{ id: 'event-a' }], 'missing-event', 'FUTURE');

    expect(ids).toEqual([]);
  });
});
