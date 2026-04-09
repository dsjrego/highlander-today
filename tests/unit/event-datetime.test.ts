import { describe, expect, it } from '@jest/globals';
import { buildEventDatetime, formatEventDateInput, formatEventTimeInput } from '@/lib/event-datetime';

describe('event datetime helpers', () => {
  it('builds a local datetime from date and time strings', () => {
    const value = buildEventDatetime('2026-07-10', '18:30');

    expect(value.toISOString()).toBe('2026-07-10T22:30:00.000Z');
  });

  it('defaults to local midnight when no time is provided', () => {
    const value = buildEventDatetime('2026-07-10');

    expect(value.toISOString()).toBe('2026-07-10T04:00:00.000Z');
  });

  it('formats date inputs consistently from Date and ISO strings', () => {
    const date = new Date('2026-07-10T22:30:00.000Z');

    expect(formatEventDateInput(date)).toBe('2026-07-10');
    expect(formatEventDateInput('2026-07-10T22:30:00.000Z')).toBe('2026-07-10');
  });

  it('formats time inputs consistently from Date and ISO strings', () => {
    const date = new Date('2026-07-10T22:30:00.000Z');

    expect(formatEventTimeInput(date)).toBe('18:30');
    expect(formatEventTimeInput('2026-07-10T22:30:00.000Z')).toBe('18:30');
  });

  it('returns empty values for missing inputs', () => {
    expect(formatEventDateInput(null)).toBe('');
    expect(formatEventTimeInput(null)).toBeNull();
  });
});
