// Feature: task-habit-tracker
// Unit tests for date/week utilities (Task 3.2, Requirement 10.2).

import { describe, it, expect } from 'vitest';
import { toDateKey, addDays, isSameLocalDay, weekRange, lastNDays } from './dateUtils';

describe('toDateKey', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    // Month is 0-indexed in the Date constructor: 0 => January, 5 => June.
    expect(toDateKey(new Date(2024, 0, 3))).toBe('2024-01-03');
    expect(toDateKey(new Date(2024, 5, 3))).toBe('2024-06-03');
    expect(toDateKey(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});

describe('addDays', () => {
  it('moves forward across a month boundary', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
  });

  it('moves forward across a year boundary', () => {
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01');
  });

  it('moves backward across a month and year boundary', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29'); // 2024 is a leap year
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
  });

  it('is the identity for a delta of 0', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15');
  });
});

describe('isSameLocalDay', () => {
  it('is true for two times on the same calendar day', () => {
    expect(
      isSameLocalDay(new Date(2024, 5, 3, 0, 0, 0), new Date(2024, 5, 3, 23, 59, 59)),
    ).toBe(true);
  });

  it('is false for adjacent days', () => {
    expect(
      isSameLocalDay(new Date(2024, 5, 3, 23, 59, 59), new Date(2024, 5, 4, 0, 0, 0)),
    ).toBe(false);
  });
});

describe('weekRange', () => {
  it('returns Monday..Sunday for a midweek day', () => {
    // 2024-06-05 is a Wednesday.
    expect(weekRange('2024-06-05')).toEqual({ start: '2024-06-03', end: '2024-06-09' });
  });

  it('returns the same week when the day is the starting Monday', () => {
    // 2024-06-03 is a Monday.
    expect(weekRange('2024-06-03')).toEqual({ start: '2024-06-03', end: '2024-06-09' });
  });

  it('returns the same week when the day is the ending Sunday', () => {
    // 2024-06-09 is a Sunday.
    expect(weekRange('2024-06-09')).toEqual({ start: '2024-06-03', end: '2024-06-09' });
  });
});

describe('lastNDays', () => {
  it('returns n days ending on and including the key, oldest first', () => {
    expect(lastNDays('2024-06-05', 3)).toEqual(['2024-06-03', '2024-06-04', '2024-06-05']);
  });

  it('has length n and ends with the key', () => {
    const days = lastNDays('2024-01-01', 7);
    expect(days).toHaveLength(7);
    expect(days[days.length - 1]).toBe('2024-01-01');
    expect(days[0]).toBe('2023-12-26');
  });

  it('returns an empty list for n <= 0', () => {
    expect(lastNDays('2024-06-05', 0)).toEqual([]);
    expect(lastNDays('2024-06-05', -3)).toEqual([]);
  });
});
