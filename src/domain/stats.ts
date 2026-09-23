// Feature: task-habit-tracker
// Progress statistics over tasks and habits.
//
// All functions in this module are pure and operate in local time. The "current
// day" is always passed in as a DateKey argument; no ambient clock is read.

import type { Habit, Task, DateKey } from './types';
import { toDateKey, weekRange, lastNDays } from './dateUtils';

/**
 * Count of tasks whose completion timestamp falls on `day` in local time.
 * Tasks that are not yet completed (completedAt === null) are ignored.
 * Returns 0 when no task was completed on `day`. (R10.1, R10.3)
 */
export function tasksCompletedOn(tasks: Task[], day: DateKey): number {
  let count = 0;
  for (const task of tasks) {
    if (task.completedAt === null) continue;
    if (toDateKey(new Date(task.completedAt)) === day) {
      count += 1;
    }
  }
  return count;
}

/**
 * Count of tasks whose completion timestamp falls within the Monday-to-Sunday
 * local calendar week containing `day`. Tasks that are not yet completed are
 * ignored. Returns 0 when none fall in the week. (R10.2, R10.3)
 */
export function tasksCompletedInWeekOf(tasks: Task[], day: DateKey): number {
  const { start, end } = weekRange(day);
  let count = 0;
  for (const task of tasks) {
    if (task.completedAt === null) continue;
    const key = toDateKey(new Date(task.completedAt));
    if (key >= start && key <= end) {
      count += 1;
    }
  }
  return count;
}

/**
 * Whole-number percent 0..100 of days completed over the last 7 days ending on
 * and including `today`, computed as round(daysCompletedInLast7 / 7 * 100) and
 * clamped to the inclusive range 0..100. (R11.2)
 */
export function completionRate(habit: Habit, today: DateKey): number {
  const completed = new Set(habit.completions);
  const days = lastNDays(today, 7);
  let daysCompletedInLast7 = 0;
  for (const key of days) {
    if (completed.has(key)) {
      daysCompletedInLast7 += 1;
    }
  }
  const rate = Math.round((daysCompletedInLast7 / 7) * 100);
  return Math.min(100, Math.max(0, rate));
}
