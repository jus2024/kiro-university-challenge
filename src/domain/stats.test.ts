// Feature: task-habit-tracker
// Property-based and unit tests for progress statistics
// (Tasks 9.2, 9.3, 9.4, 9.5; Properties 13, 14, 15; Requirements 10.1, 10.2, 10.3, 11.2).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Habit, Task } from './types';
import { tasksCompletedOn, tasksCompletedInWeekOf, completionRate } from './stats';
import { toDateKey, weekRange, addDays } from './dateUtils';

const dateKey = fc
  .date({ min: new Date(2010, 0, 1), max: new Date(2090, 11, 31) })
  .map((d) => toDateKey(d));

// A task whose completion falls on a chosen local day (midday to avoid TZ edge),
// or is not completed at all.
function completedTask(id: string, completedAt: number | null): Task {
  return {
    id,
    title: 'task',
    dueDate: null,
    tags: [],
    status: completedAt === null ? 'open' : 'done',
    completedAt,
    createdAt: 0,
  };
}

// Convert a DateKey to a local epoch-ms timestamp at midday that day.
function middayMs(key: DateKeyLike): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}
type DateKeyLike = string;

// --- Property 13 ---

describe('tasksCompletedOn', () => {
  // Feature: task-habit-tracker, Property 13: Daily task count matches tasks completed on that day
  it('Property 13: equals the number of tasks whose completedAt falls on the day (0 when none)', () => {
    fc.assert(
      fc.property(
        dateKey,
        // Each task: either uncompleted, completed on `day`, or completed on some other day.
        fc.array(
          fc.oneof(
            fc.constant<'none'>('none'),
            fc.constant<'on'>('on'),
            fc.integer({ min: -60, max: 60 }).filter((n) => n !== 0),
          ),
          { maxLength: 20 },
        ),
        (day, kinds) => {
          let expected = 0;
          const tasks = kinds.map((k, i) => {
            if (k === 'none') return completedTask(`t${i}`, null);
            if (k === 'on') {
              expected += 1;
              return completedTask(`t${i}`, middayMs(day));
            }
            // Completed on a different day.
            return completedTask(`t${i}`, middayMs(addDays(day, k)));
          });
          expect(tasksCompletedOn(tasks, day)).toBe(expected);
        },
      ),
    );
  });
});

// --- Property 14 ---

describe('tasksCompletedInWeekOf', () => {
  // Feature: task-habit-tracker, Property 14: Weekly task count matches the Monday-start week of today
  it('Property 14: equals the number of tasks completed within the Monday–Sunday week of the day', () => {
    fc.assert(
      fc.property(
        dateKey,
        fc.array(
          fc.oneof(
            fc.constant<'none'>('none'),
            fc.integer({ min: -21, max: 21 }),
          ),
          { maxLength: 20 },
        ),
        (day, kinds) => {
          const { start, end } = weekRange(day);
          let expected = 0;
          const tasks = kinds.map((k, i) => {
            if (k === 'none') return completedTask(`t${i}`, null);
            const completedKey = addDays(day, k);
            if (completedKey >= start && completedKey <= end) expected += 1;
            return completedTask(`t${i}`, middayMs(completedKey));
          });
          expect(tasksCompletedInWeekOf(tasks, day)).toBe(expected);
        },
      ),
    );
  });
});

// --- Property 15 ---

describe('completionRate', () => {
  // Feature: task-habit-tracker, Property 15: Completion rate is a whole percent within 0–100
  it('Property 15: integer 0..100 equal to round(daysCompletedInLast7 / 7 * 100)', () => {
    fc.assert(
      fc.property(
        dateKey,
        fc.uniqueArray(fc.integer({ min: -400, max: 0 }), { maxLength: 40 }),
        (today, offsets) => {
          const completions = offsets.map((o) => addDays(today, o));
          const habit: Habit = {
            id: 'h',
            name: 'habit',
            targetFrequency: 'daily',
            completions,
            createdAt: 0,
          };
          const rate = completionRate(habit, today);

          // Compute the expected count over the last 7 days ending on today.
          const last7 = new Set<string>();
          for (let i = 0; i < 7; i++) last7.add(addDays(today, -i));
          const completedSet = new Set(completions);
          let daysCompletedInLast7 = 0;
          for (const d of last7) if (completedSet.has(d)) daysCompletedInLast7 += 1;
          const expected = Math.round((daysCompletedInLast7 / 7) * 100);

          expect(Number.isInteger(rate)).toBe(true);
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
          expect(rate).toBe(expected);
        },
      ),
    );
  });
});

// --- Task 9.5: empty-statistics unit tests ---

describe('empty statistics (Task 9.5, Requirement 10.3)', () => {
  const day = '2024-06-05';

  it('daily count is 0 when no tasks completed that day', () => {
    expect(tasksCompletedOn([], day)).toBe(0);
    const open: Task = completedTask('t1', null);
    expect(tasksCompletedOn([open], day)).toBe(0);
  });

  it('weekly count is 0 when no tasks completed that week', () => {
    expect(tasksCompletedInWeekOf([], day)).toBe(0);
    // Completed well outside the week.
    const other = completedTask('t1', middayMs(addDays(day, 30)));
    expect(tasksCompletedInWeekOf([other], day)).toBe(0);
  });

  it('completion rate is 0 for a habit with no completions in the last 7 days', () => {
    const habit: Habit = { id: 'h', name: 'h', targetFrequency: 'daily', completions: [], createdAt: 0 };
    expect(completionRate(habit, day)).toBe(0);
  });
});
