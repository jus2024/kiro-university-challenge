// Feature: task-habit-tracker
// Date and week arithmetic in the user's local time zone.
//
// All functions in this module are pure and operate in local time. They never
// read the ambient clock (no `Date.now()` / `new Date()` without arguments);
// the "current day" is always passed in as an argument. This keeps streaks,
// completion rates, and week boundaries deterministic and testable.

import type { DateKey } from './types';

/** Zero-pad a number to at least two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format a Date as a local calendar date key, e.g. "2024-06-03" (YYYY-MM-DD).
 * Uses the Date's local-time components so the key reflects the user's zone.
 */
export function toDateKey(d: Date): DateKey {
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Parse a DateKey ("YYYY-MM-DD") into a local Date at midnight local time.
 * Constructed via the numeric Date constructor so the key is interpreted in the
 * local zone rather than as UTC (which `new Date("YYYY-MM-DD")` would do).
 */
function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Return the DateKey `delta` days after `key` (negative moves backward).
 * Arithmetic is performed in local time and normalizes across month/year
 * boundaries via the Date constructor's overflow handling.
 */
export function addDays(key: DateKey, delta: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

/** True when `a` and `b` fall on the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Monday..Sunday week containing `key`, in local time. (R10.2, Calendar_Week)
 * Returns the DateKeys of the Monday that starts the week and the Sunday that
 * ends it.
 */
export function weekRange(key: DateKey): { start: DateKey; end: DateKey } {
  const d = fromDateKey(key);
  // getDay(): 0=Sun,1=Mon,...,6=Sat. Days since Monday = (getDay()+6)%7.
  const daysSinceMonday = (d.getDay() + 6) % 7;
  const start = addDays(key, -daysSinceMonday);
  const end = addDays(start, 6);
  return { start, end };
}

/**
 * The DateKey list for the last `n` days ending on and including `key`,
 * in ascending chronological order (oldest first, `key` last). For `n <= 0`
 * returns an empty list.
 */
export function lastNDays(key: DateKey, n: number): DateKey[] {
  const result: DateKey[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(addDays(key, -i));
  }
  return result;
}
