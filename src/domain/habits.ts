// Feature: task-habit-tracker
// Habit lifecycle and completion toggling (R7, R8).
//
// Every function is pure over immutable data: it returns a new `AppState`
// (or a boolean) without mutating its inputs. The "current day" is always
// passed in as a `DateKey` argument rather than read from the ambient clock.
//
// A Habit's `completions` list is treated as a set of DateKeys — at most one
// entry per calendar date. `checkOffHabit` adds a day only when absent
// (idempotent), and `uncheckHabit` removes a day only when present (no-op
// otherwise), so the set invariant is preserved by construction.

import { newId } from './types';
import type { AppState, DateKey, Habit, NewHabitInput } from './types';
import { validateHabitName } from './validation';

/**
 * Create a Habit from `input` and append it to the habit list (R7.1).
 *
 * The name is trimmed and validated (1..100 chars). If the name is invalid,
 * the input `state` is returned unchanged — the UI is expected to surface the
 * validation error before dispatching. On success the new Habit has the
 * trimmed name, the given `targetFrequency`, and an empty `completions` list.
 */
export function createHabit(state: AppState, input: NewHabitInput): AppState {
  const nameResult = validateHabitName(input.name);
  if (!nameResult.ok) {
    return state;
  }
  const habit: Habit = {
    id: newId(),
    name: nameResult.value,
    targetFrequency: input.targetFrequency,
    completions: [],
    createdAt: Date.now(),
  };
  return { ...state, habits: [...state.habits, habit] };
}

/**
 * Record a Completion_Record dated `day` for the habit identified by
 * `habitId` (R8.1, R8.2). Idempotent: if a record for `day` already exists the
 * completion history is left unchanged, so there is at most one entry per date.
 * Unknown `habitId` leaves the state unchanged.
 */
export function checkOffHabit(
  state: AppState,
  habitId: string,
  day: DateKey,
): AppState {
  return updateHabit(state, habitId, (habit) => {
    if (habit.completions.includes(day)) {
      return habit;
    }
    return { ...habit, completions: [...habit.completions, day] };
  });
}

/**
 * Remove the Completion_Record dated `day` for the habit identified by
 * `habitId` (R8.3, R8.4). If no record exists for `day` the completion history
 * is left unchanged (no-op). Unknown `habitId` leaves the state unchanged.
 */
export function uncheckHabit(
  state: AppState,
  habitId: string,
  day: DateKey,
): AppState {
  return updateHabit(state, habitId, (habit) => {
    if (!habit.completions.includes(day)) {
      return habit;
    }
    return {
      ...habit,
      completions: habit.completions.filter((d) => d !== day),
    };
  });
}

/** True when `habit` has a Completion_Record for `day`. */
export function isCompletedOn(habit: Habit, day: DateKey): boolean {
  return habit.completions.includes(day);
}

/**
 * Apply `updater` to the habit matching `habitId`, returning a new `AppState`.
 * If no habit matches, or the updater returns the same habit reference, the
 * input `state` is returned unchanged.
 */
function updateHabit(
  state: AppState,
  habitId: string,
  updater: (habit: Habit) => Habit,
): AppState {
  const index = state.habits.findIndex((h) => h.id === habitId);
  if (index === -1) {
    return state;
  }
  const updated = updater(state.habits[index]);
  if (updated === state.habits[index]) {
    return state;
  }
  const habits = [...state.habits];
  habits[index] = updated;
  return { ...state, habits };
}
