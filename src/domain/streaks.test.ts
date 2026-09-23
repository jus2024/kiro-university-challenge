// Feature: task-habit-tracker
// Property-based test for streak calculation
// (Task 8.2; Property 12; Requirements 9.1, 9.2).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Habit } from './types';
import { currentStreak } from './streaks';
import { addDays } from './dateUtils';

const dateKey = fc
  .date({ min: new Date(2010, 0, 1), max: new Date(2090, 11, 31) })
  .map((d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

function makeHabit(completions: string[]): Habit {
  return { id: 'h', name: 'habit', targetFrequency: 'daily', completions, createdAt: 0 };
}

// Reference implementation: count consecutive completed days ending on today.
function expectedStreak(completed: Set<string>, today: string): number {
  let streak = 0;
  let day = today;
  while (completed.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

describe('currentStreak', () => {
  // Feature: task-habit-tracker, Property 12: Current streak equals the consecutive run ending today
  it('Property 12: equals the maximal consecutive run ending on today; 0 when today is missing', () => {
    fc.assert(
      fc.property(
        dateKey,
        // A run length of consecutive days ending on today (may be 0).
        fc.nat({ max: 30 }),
        // Extra scattered completions (introduce gaps and history beyond the run).
        fc.array(fc.integer({ min: -400, max: -1 }), { maxLength: 20 }),
        // Whether to include today at all (drives the 0-streak case).
        fc.boolean(),
        (today, runLen, scatterOffsets, includeToday) => {
          const completions = new Set<string>();

          if (includeToday && runLen > 0) {
            // A contiguous run of `runLen` days ending on today.
            for (let i = 0; i < runLen; i++) {
              completions.add(addDays(today, -i));
            }
            // Ensure a gap exists just before the run so the run is maximal
            // (do not add the day at offset -runLen).
          }

          // Scatter extra completions strictly before the run start (offset
          // <= -(runLen+1)) so they cannot extend the run.
          for (const off of scatterOffsets) {
            const shifted = off - (runLen + 1);
            completions.add(addDays(today, shifted));
          }

          const habit = makeHabit([...completions]);
          const result = currentStreak(habit, today);
          const expected = expectedStreak(completions, today);

          expect(result).toBe(expected);
          if (!completions.has(today)) {
            expect(result).toBe(0);
          }
        },
      ),
    );
  });
});
