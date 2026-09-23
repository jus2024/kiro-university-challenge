// Feature: task-habit-tracker
// UI: a single habit row with a check/uncheck toggle and streak display.
//
// The toggle is a native `<input type="checkbox">` associated with a `<label>`,
// which inherits keyboard reachability and Space activation (R14.3) and gives
// the control an accessible name (R15.2). Whether the checkbox is checked is
// derived from `isCompletedOn(habit, today)`; toggling on dispatches
// `CHECK_HABIT` and toggling off dispatches `UNCHECK_HABIT`, both carrying
// today's `DateKey` computed at the edge by the parent (R8.1, R8.3). The
// current streak is rendered as an integer, including 0 (R9.3).

import { useApp } from '../state/AppContext';
import type { DateKey, Habit } from '../domain/types';
import { isCompletedOn } from '../domain/habits';
import { currentStreak } from '../domain/streaks';

export interface HabitItemProps {
  habit: Habit;
  /** Today's local calendar date, computed at the edge via toDateKey(new Date()). */
  today: DateKey;
}

/**
 * Render one habit: a labeled checkbox reflecting completion for `today` and
 * the habit's current streak. Checking/unchecking dispatches the matching
 * action with `today` as the `DateKey`.
 */
export function HabitItem({ habit, today }: HabitItemProps): JSX.Element {
  const { dispatch } = useApp();
  const checked = isCompletedOn(habit, today);
  const streak = currentStreak(habit, today);
  const checkboxId = `habit-checkbox-${habit.id}`;

  function handleToggle(): void {
    if (checked) {
      dispatch({ type: 'UNCHECK_HABIT', habitId: habit.id, day: today });
    } else {
      dispatch({ type: 'CHECK_HABIT', habitId: habit.id, day: today });
    }
  }

  return (
    <li className="habit-item">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={handleToggle}
      />
      <label htmlFor={checkboxId}>{habit.name}</label>
      <span className="habit-streak">Streak: {streak}</span>
    </li>
  );
}
