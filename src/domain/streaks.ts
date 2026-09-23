// Feature: task-habit-tracker
// Habit streak calculation.
//
// Pure functions that derive streak metrics from a habit's completion history.
// The "current day" is always passed in as an argument (never read from the
// ambient clock), keeping results deterministic and testable.

import type { Habit, DateKey } from './types';
import { addDays } from './dateUtils';

/**
 * The Current_Streak for a habit: the length of the maximal run of consecutive
 * calendar days, ending on and including `today`, that all have a completion
 * record. Returns 0 when `today` itself has no completion record. (R9.1, R9.2)
 *
 * Pure: does not read the ambient clock; `today` is supplied by the caller.
 */
export function currentStreak(habit: Habit, today: DateKey): number {
  const completed = new Set(habit.completions);
  let streak = 0;
  let day = today;
  while (completed.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
