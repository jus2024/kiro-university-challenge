// Feature: task-habit-tracker
// Property-based tests for habit lifecycle and completion toggling
// (Tasks 7.2, 7.3, 7.4; Properties 9, 10, 11; Requirements 7.1, 8.1, 8.2, 8.3, 8.4).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { AppState, Habit } from './types';
import { createHabit, checkOffHabit, uncheckHabit } from './habits';

const validHabitNameCore = fc
  .array(fc.constantFrom('h', 'A', '2', 'é', '漢', ' ', '-'), { minLength: 1, maxLength: 40 })
  .map((c) => c.join(''))
  .map((s) => (s.trim().length === 0 ? `h${s}` : s));

// A DateKey generator producing real calendar dates as YYYY-MM-DD.
const dateKey = fc
  .date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) })
  .map((d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

function makeHabit(id: string, completions: string[]): Habit {
  return { id, name: 'habit', targetFrequency: 'daily', completions, createdAt: 0 };
}

// --- Property 9 ---

describe('createHabit', () => {
  // Feature: task-habit-tracker, Property 9: Habit creation adds a habit with empty history
  it('Property 9: appends a habit with the trimmed name, given frequency, and empty completions', () => {
    fc.assert(
      fc.property(validHabitNameCore, (name) => {
        const state: AppState = { version: 1, tasks: [], habits: [] };
        const next = createHabit(state, { name, targetFrequency: 'daily' });
        expect(next.habits.length).toBe(1);
        const created = next.habits[0];
        expect(created.name).toBe(name.trim());
        expect(created.targetFrequency).toBe('daily');
        expect(created.completions).toEqual([]);
      }),
    );
  });
});

// --- Property 10 ---

describe('checkOffHabit', () => {
  // Feature: task-habit-tracker, Property 10: Check-off is idempotent (exactly one record per day)
  it('Property 10: checking once vs twice yields equal histories with exactly one entry for the day', () => {
    fc.assert(
      fc.property(fc.uniqueArray(dateKey, { maxLength: 10 }), dateKey, (history, day) => {
        const state: AppState = { version: 1, tasks: [], habits: [makeHabit('h1', history)] };

        const once = checkOffHabit(state, 'h1', day);
        const twice = checkOffHabit(once, 'h1', day);

        const onceCompletions = once.habits[0].completions;
        const twiceCompletions = twice.habits[0].completions;

        // Idempotent: applying twice equals applying once (as ordered lists).
        expect(twiceCompletions).toEqual(onceCompletions);
        // Exactly one entry for the day.
        expect(onceCompletions.filter((d) => d === day)).toHaveLength(1);
      }),
    );
  });
});

// --- Property 11 ---

describe('checkOffHabit / uncheckHabit', () => {
  // Feature: task-habit-tracker, Property 11: Check-off then uncheck is the identity on completion history
  it('Property 11: uncheck(check(h, day), day) restores the original set; uncheck of an absent day is a no-op', () => {
    fc.assert(
      fc.property(fc.uniqueArray(dateKey, { maxLength: 10 }), dateKey, (history, day) => {
        const state: AppState = { version: 1, tasks: [], habits: [makeHabit('h1', history)] };

        if (!history.includes(day)) {
          // check then uncheck returns to the original set of dates.
          const checked = checkOffHabit(state, 'h1', day);
          const restored = uncheckHabit(checked, 'h1', day);
          expect(new Set(restored.habits[0].completions)).toEqual(new Set(history));

          // uncheck of an absent day leaves the history unchanged (no-op).
          const noop = uncheckHabit(state, 'h1', day);
          expect(noop.habits[0].completions).toEqual(history);
        } else {
          // day already present: unchecking then it's absent; history minus day.
          const removed = uncheckHabit(state, 'h1', day);
          expect(removed.habits[0].completions).toEqual(history.filter((d) => d !== day));
        }
      }),
    );
  });
});
