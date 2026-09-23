// Feature: task-habit-tracker
// UI: the progress dashboard.
//
// Reads tasks and habits from the app store and renders progress statistics:
// daily and weekly task completion counts (R10.1, R10.2, R10.3) and, per habit,
// the current streak (R11.1) and 7-day completion rate (R11.2). When no habits
// exist, an empty-state indication is shown instead of the per-habit list
// (R11.3). Today's `DateKey` is computed once at the edge via
// `toDateKey(new Date())` and passed to the pure domain functions, keeping the
// domain/state layers free of ambient-clock reads.

import { useApp } from '../state/AppContext';
import { toDateKey } from '../domain/dateUtils';
import {
  tasksCompletedOn,
  tasksCompletedInWeekOf,
  completionRate,
} from '../domain/stats';
import { currentStreak } from '../domain/streaks';

/**
 * Render the progress dashboard: daily/weekly task counts and per-habit streak
 * and completion rate. Shows an empty-state message when no habits are tracked.
 */
export function ProgressView(): JSX.Element {
  const { state } = useApp();
  const today = toDateKey(new Date());

  const dailyCount = tasksCompletedOn(state.tasks, today);
  const weeklyCount = tasksCompletedInWeekOf(state.tasks, today);

  return (
    <section className="progress-view" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Progress</h2>

      <section className="progress-tasks" aria-labelledby="progress-tasks-heading">
        <h3 id="progress-tasks-heading">Tasks completed</h3>
        <dl className="progress-task-counts">
          <div className="progress-stat">
            <dt>Today</dt>
            <dd>{dailyCount}</dd>
          </div>
          <div className="progress-stat">
            <dt>This week</dt>
            <dd>{weeklyCount}</dd>
          </div>
        </dl>
      </section>

      <section className="progress-habits" aria-labelledby="progress-habits-heading">
        <h3 id="progress-habits-heading">Habit progress</h3>
        {state.habits.length === 0 ? (
          <p className="progress-empty">No habits are being tracked yet.</p>
        ) : (
          <ul className="progress-habit-list">
            {state.habits.map((habit) => (
              <li key={habit.id} className="progress-habit">
                <span className="progress-habit-name">{habit.name}</span>
                <span className="progress-habit-streak">
                  Streak: {currentStreak(habit, today)}
                </span>
                <span className="progress-habit-rate">
                  Completion rate: {completionRate(habit, today)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
