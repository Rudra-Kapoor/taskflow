import { describe, expect, it } from 'vitest';
import { DAY, buildDueFilter, getDayRange } from '../../src/utils/dates.js';

const at = (iso) => new Date(iso);
const isoRange = ({ start, end }) => [start.toISOString(), end.toISOString()];

describe('getDayRange', () => {
  it('returns the UTC calendar day for an offset of 0', () => {
    const range = getDayRange(0, at('2026-10-01T15:30:00.000Z'));

    expect(isoRange(range)).toEqual(['2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z']);
  });

  it('uses the local day for timezones ahead of UTC (India, -330)', () => {
    // 20:00 UTC is already 01:30 on October 2 in India.
    const range = getDayRange(-330, at('2026-10-01T20:00:00.000Z'));

    expect(isoRange(range)).toEqual(['2026-10-01T18:30:00.000Z', '2026-10-02T18:30:00.000Z']);
  });

  it('uses the local day for timezones behind UTC (New York in summer, 240)', () => {
    // 02:00 UTC is still the evening of September 30 in New York.
    const range = getDayRange(240, at('2026-10-01T02:00:00.000Z'));

    expect(isoRange(range)).toEqual(['2026-09-30T04:00:00.000Z', '2026-10-01T04:00:00.000Z']);
  });

  it('starts a new day exactly at local midnight', () => {
    const range = getDayRange(-330, at('2026-10-01T18:30:00.000Z'));

    expect(range.start.toISOString()).toBe('2026-10-01T18:30:00.000Z');
  });

  it.each([-840, -330, 0, 300, 720])('spans 24 hours that contain "now" (offset %i)', (offset) => {
    const now = at('2026-03-15T23:59:59.999Z');

    const { start, end } = getDayRange(offset, now);

    expect(end - start).toBe(DAY);
    expect(start <= now && now < end).toBe(true);
  });
});

describe('buildDueFilter', () => {
  const now = at('2026-10-01T20:00:00.000Z'); // 01:30 on October 2 in India
  const indiaToday = at('2026-10-01T18:30:00.000Z');

  it('matches open tasks due before now for "overdue"', () => {
    expect(buildDueFilter('overdue', -330, now)).toEqual({
      dueDate: { $lt: now },
      status: { $ne: 'completed' },
    });
  });

  it('matches the local calendar day for "today"', () => {
    expect(buildDueFilter('today', -330, now)).toEqual({
      dueDate: { $gte: indiaToday, $lt: at('2026-10-02T18:30:00.000Z') },
    });
  });

  it('matches seven local days starting today for "week"', () => {
    expect(buildDueFilter('week', -330, now)).toEqual({
      dueDate: { $gte: indiaToday, $lt: at('2026-10-08T18:30:00.000Z') },
    });
  });

  it('matches tasks without a due date for "none"', () => {
    expect(buildDueFilter('none', -330, now)).toEqual({ dueDate: null });
  });

  it('adds no condition when no due filter is requested', () => {
    expect(buildDueFilter(undefined, 0, now)).toEqual({});
  });
});
