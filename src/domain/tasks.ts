// Feature: task-habit-tracker
// Task lifecycle: creation, editing, completion, and deletion.
//
// Every function is a pure transformation over `AppState`: it takes the current
// state plus arguments and returns a NEW, immutable `AppState`. Functions never
// mutate their inputs and never throw. Invalid mutations (input the UI should
// have blocked) defensively return the input state unchanged so state can never
// become invalid.

import type { AppState, NewTaskInput, Task, TaskPatch } from './types';
import { newId } from './types';
import {
  validateDueDate,
  validateTagName,
  validateTaskTitle,
} from './validation';

/**
 * Create a task from validated input and append it to the task list (R1.1, R1.2).
 *
 * The title is trimmed, the due date and tags are taken as given (after
 * validation), the status defaults to "open", and `completedAt` is `null`.
 * If any provided field is invalid the input state is returned unchanged.
 */
export function createTask(state: AppState, input: NewTaskInput): AppState {
  const titleResult = validateTaskTitle(input.title);
  if (!titleResult.ok) {
    return state;
  }

  const dueDateResult = validateDueDate(input.dueDate);
  if (!dueDateResult.ok) {
    return state;
  }

  // Validate every tag name; the whole creation is rejected if any is invalid.
  for (const tag of input.tags) {
    if (!validateTagName(tag).ok) {
      return state;
    }
  }

  const task: Task = {
    id: newId(),
    title: titleResult.value,
    dueDate: dueDateResult.value,
    tags: [...input.tags],
    status: 'open',
    completedAt: null,
    createdAt: Date.now(),
  };

  return { ...state, tasks: [...state.tasks, task] };
}

/**
 * Edit a task's title, due date, and/or tags (R3.1, R3.2).
 *
 * Only the fields present in `patch` are considered. Each provided field is
 * validated; if any is invalid the state is returned unchanged. On success a
 * new state is returned with the matching task patched (trimmed title,
 * normalized due date, and/or the given tags). If no task matches `taskId`,
 * the state is returned unchanged.
 */
export function editTask(
  state: AppState,
  taskId: string,
  patch: TaskPatch,
): AppState {
  const index = state.tasks.findIndex((t) => t.id === taskId);
  if (index === -1) {
    return state;
  }

  const updates: Partial<Task> = {};

  if (patch.title !== undefined) {
    const titleResult = validateTaskTitle(patch.title);
    if (!titleResult.ok) {
      return state;
    }
    updates.title = titleResult.value;
  }

  if (patch.dueDate !== undefined) {
    const dueDateResult = validateDueDate(patch.dueDate);
    if (!dueDateResult.ok) {
      return state;
    }
    updates.dueDate = dueDateResult.value;
  }

  if (patch.tags !== undefined) {
    for (const tag of patch.tags) {
      if (!validateTagName(tag).ok) {
        return state;
      }
    }
    updates.tags = [...patch.tags];
  }

  const nextTasks = state.tasks.map((t, i) =>
    i === index ? { ...t, ...updates } : t,
  );
  return { ...state, tasks: nextTasks };
}

/**
 * Mark a task as complete (R2.1, R2.2, R2.4).
 *
 * Sets the status to "done" and stamps `completedAt` with `now`. Completion is
 * idempotent: a task that is already "done" keeps its original `completedAt`,
 * so re-completing with a later timestamp does not overwrite the first stamp.
 * If no task matches `taskId`, the state is returned unchanged.
 */
export function completeTask(
  state: AppState,
  taskId: string,
  now: number,
): AppState {
  const index = state.tasks.findIndex((t) => t.id === taskId);
  if (index === -1) {
    return state;
  }

  const task = state.tasks[index];
  if (task.status === 'done') {
    // Already complete: leave the existing completion timestamp unchanged.
    return state;
  }

  const nextTasks = state.tasks.map((t, i) =>
    i === index ? { ...t, status: 'done' as const, completedAt: now } : t,
  );
  return { ...state, tasks: nextTasks };
}

/**
 * Delete a task, removing only that task and keeping all others (R4.2).
 *
 * If no task matches `taskId`, the state is returned unchanged.
 */
export function deleteTask(state: AppState, taskId: string): AppState {
  const nextTasks = state.tasks.filter((t) => t.id !== taskId);
  if (nextTasks.length === state.tasks.length) {
    return state;
  }
  return { ...state, tasks: nextTasks };
}
