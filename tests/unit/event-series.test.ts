import {
  buildEventOccurrences,
  buildEventSeriesSummary,
  buildSeriesEventPositions,
  EVENT_SERIES_CADENCE,
  getScopedSeriesEventIds,
} from '@/lib/event-series';

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

  it('regenerates weekly occurrences from a new anchor datetime', () => {
    const occurrences = buildEventOccurrences({
      startDatetime: new Date('2026-06-03T19:30:00Z'),
      endDatetime: new Date('2026-06-03T21:00:00Z'),
      cadenceLabel: EVENT_SERIES_CADENCE.WEEKLY,
      occurrenceCount: 3,
    });

    expect(occurrences.map((occurrence) => ({
      start: occurrence.startDatetime.toISOString(),
      end: occurrence.endDatetime?.toISOString() || null,
      position: occurrence.seriesPosition,
    }))).toEqual([
      {
        start: '2026-06-03T19:30:00.000Z',
        end: '2026-06-03T21:00:00.000Z',
        position: 1,
      },
      {
        start: '2026-06-10T19:30:00.000Z',
        end: '2026-06-10T21:00:00.000Z',
        position: 2,
      },
      {
        start: '2026-06-17T19:30:00.000Z',
        end: '2026-06-17T21:00:00.000Z',
        position: 3,
      },
    ]);
  });

  it('regenerates monthly weekday occurrences from the updated weekday pattern', () => {
    const occurrences = buildEventOccurrences({
      startDatetime: new Date('2026-02-26T23:00:00Z'),
      endDatetime: new Date('2026-02-27T00:30:00Z'),
      cadenceLabel: EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY,
      occurrenceCount: 3,
    });

    expect(
      occurrences.map((occurrence) => ({
        month: occurrence.startDatetime.getMonth(),
        date: occurrence.startDatetime.getDate(),
        weekday: occurrence.startDatetime.getDay(),
        hour: occurrence.startDatetime.getHours(),
        minute: occurrence.startDatetime.getMinutes(),
      }))
    ).toEqual([
      { month: 1, date: 26, weekday: 4, hour: 18, minute: 0 },
      { month: 2, date: 26, weekday: 4, hour: 18, minute: 0 },
      { month: 3, date: 30, weekday: 4, hour: 18, minute: 0 },
    ]);
  });

  it('rebuilds the human summary from the regenerated anchor and cadence', () => {
    const summary = buildEventSeriesSummary({
      startDatetime: new Date('2026-04-30T18:00:00Z'),
      cadenceLabel: EVENT_SERIES_CADENCE.MONTHLY_WEEKDAY,
      occurrenceCount: 4,
    });

    expect(summary).toBe('Monthly on the last Thursday for 4 sessions');
  });
});
