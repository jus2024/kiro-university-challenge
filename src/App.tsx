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
    <main>
      <h1>Task &amp; Habit Tracker</h1>

      <WarningBanner />

      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">Tasks</h2>

        <TaskForm />

        {taskBeingEdited !== undefined && (
          <section aria-label="Edit task">
            <TaskForm
              task={taskBeingEdited}
              onSubmitted={() => setEditingTaskId(null)}
            />
          </section>
        )}

        <TagFilterBar
          tasks={state.tasks}
          selectedTags={selectedTags}
          availableTags={options}
          onChange={setSelectedTags}
        />

        <TaskList tasks={filtered} onEdit={(taskId) => setEditingTaskId(taskId)} />
      </section>

      <section aria-labelledby="habits-heading">
        <h2 id="habits-heading">Habits</h2>

        <HabitForm />
        <HabitList />
      </section>

      <ProgressView />
    </main>
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
