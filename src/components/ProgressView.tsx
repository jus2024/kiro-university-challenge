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
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-labelledby="progress-heading"
    >
      <h2
        id="progress-heading"
        className="mb-4 text-xl font-semibold text-slate-800"
      >
        Progress
      </h2>

      <section className="mb-6" aria-labelledby="progress-tasks-heading">
        <h3
          id="progress-tasks-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Tasks completed
        </h3>
        <dl className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="text-sm text-slate-500">Today</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900">
              {dailyCount}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="text-sm text-slate-500">This week</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900">
              {weeklyCount}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="progress-habits-heading">
        <h3
          id="progress-habits-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Habit progress
        </h3>
        {state.habits.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No habits are being tracked yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.habits.map((habit) => (
              <li
                key={habit.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className="block font-medium text-slate-900">
                  {habit.name}
                </span>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700">
                    Streak: {currentStreak(habit, today)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-semibold text-green-700">
                    Completion rate: {completionRate(habit, today)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
