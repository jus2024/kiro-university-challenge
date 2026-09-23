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
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={handleToggle}
        className="h-5 w-5 flex-shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/50"
      />
      <label
        htmlFor={checkboxId}
        className="flex-1 cursor-pointer text-sm font-medium text-slate-800"
      >
        {habit.name}
      </label>
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
        Streak: {streak}
      </span>
    </li>
  );
}
