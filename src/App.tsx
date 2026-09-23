// Feature: task-habit-tracker
// App composition root (Task 15.3).
//
// `App` wraps the whole UI in `AppProvider` so persistence is wired and the
// `useApp()` store is available. The composition itself lives in `AppContent`,
// an inner component rendered *inside* the provider, since `useApp()` may only
// be called within it.
//
// `AppContent` reads canonical state via `useApp()` and owns the transient view
// state that stitches the components together:
//   - `selectedTags` drives the `TagFilterBar`; the filtered task list it
//     produces (via `filterTasksByTags`) is what `TaskList` renders (R6.1).
//   - `editingTaskId` tracks the task currently being edited; the edit entry
//     point on `TaskList` sets it, revealing an edit-mode `TaskForm` that clears
//     the selection once the edit is submitted (R3.2).
// Every feature component is composed here so none are orphaned: AppProvider,
// WarningBanner, TaskForm, TagFilterBar, TaskList, HabitForm, HabitList, and
// ProgressView (R6.1, R10.1, R11.1, R12.1, R13.1).

import { useState } from 'react';
import { AppProvider, useApp } from './state/AppContext';
import { availableTags, filterTasksByTags } from './domain/tags';
import { WarningBanner } from './components/WarningBanner';
import TaskForm from './components/TaskForm';
import { TagFilterBar } from './components/TagFilterBar';
import TaskList from './components/TaskList';
import { HabitForm } from './components/HabitForm';
import { HabitList } from './components/HabitList';
import { ProgressView } from './components/ProgressView';

/**
 * The composed application UI. Rendered inside `AppProvider` so it can call
 * `useApp()`. Owns tag-filter and edit-target view state and wires the task,
 * habit, and progress sections together.
 */
function AppContent(): JSX.Element {
  const { state } = useApp();

  // Transient view state: the active tag filter and the task being edited.
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Distinct in-use tags drive the filter options; the filtered list is what
  // the task list renders (R6.1, R6.2).
  const options = availableTags(state);
  const filtered = filterTasksByTags(state.tasks, selectedTags);

  // Resolve the task being edited; if it no longer exists (e.g. deleted while
  // editing) the edit form is simply not shown.
  const taskBeingEdited =
    editingTaskId === null
      ? undefined
      : state.tasks.find((task) => task.id === editingTaskId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Task &amp; Habit Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture tasks, build habits, and track your progress.
          </p>
        </header>

        <WarningBanner />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section
            aria-labelledby="tasks-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
          >
            <h2
              id="tasks-heading"
              className="mb-4 text-xl font-semibold text-slate-800"
            >
              Tasks
            </h2>

            <TaskForm />

            {taskBeingEdited !== undefined && (
              <section
                aria-label="Edit task"
                className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4"
              >
                <TaskForm
                  task={taskBeingEdited}
                  onSubmitted={() => setEditingTaskId(null)}
                />
              </section>
            )}

            <div className="mt-6">
              <TagFilterBar
                tasks={state.tasks}
                selectedTags={selectedTags}
                availableTags={options}
                onChange={setSelectedTags}
              />
            </div>

            <div className="mt-4">
              <TaskList
                tasks={filtered}
                onEdit={(taskId) => setEditingTaskId(taskId)}
              />
            </div>
          </section>

          <section
            aria-labelledby="habits-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2
              id="habits-heading"
              className="mb-4 text-xl font-semibold text-slate-800"
            >
              Habits
            </h2>

            <HabitForm />
            <HabitList />
          </section>
        </div>

        <div className="mt-6">
          <ProgressView />
        </div>
      </main>
    </div>
  );
}

/**
 * Composition root: wraps the UI in `AppProvider` (persistence + store) and
 * renders `AppContent` inside it (R12.1, R13.1).
 */
export default function App(): JSX.Element {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
