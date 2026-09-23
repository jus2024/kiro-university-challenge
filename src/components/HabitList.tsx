// Feature: task-habit-tracker
// UI: the list of habits.
//
// Reads habits from the app store by default (or accepts an explicit `habits`
// prop for testing/composition) and renders a `HabitItem` per habit. Today's
// `DateKey` is computed once at the edge here via `toDateKey(new Date())` and
// passed down, keeping the domain/state layers free of ambient-clock reads.

import { useApp } from '../state/AppContext';
import type { Habit } from '../domain/types';
import { toDateKey } from '../domain/dateUtils';
import { HabitItem } from './HabitItem';

export interface HabitListProps {
  /** Optional explicit habit list; defaults to the habits in app state. */
  habits?: Habit[];
}

/**
 * Render one `HabitItem` per habit. Computes today's `DateKey` at the edge and
 * passes it to each item so check/uncheck dispatches carry the current day.
 */
export function HabitList({ habits }: HabitListProps): JSX.Element {
  const { state } = useApp();
  const items = habits ?? state.habits;
  const today = toDateKey(new Date());

  return (
    <ul className="habit-list">
      {items.map((habit) => (
        <HabitItem key={habit.id} habit={habit} today={today} />
      ))}
    </ul>
  );
}
