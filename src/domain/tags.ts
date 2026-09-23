// Feature: task-habit-tracker
// Tag association and filtering (R1.6, R5, R6).
//
// All functions in this module are pure and operate over immutable data. Tags
// are modeled as normalized (trimmed) names stored inline on each task; the
// distinct set of "available" tags is derived from the tasks that reference
// them, so a tag exists as a filter option exactly when a task uses it (R5.2).

import type { AppState, Task, TagName } from './types';
import { validateTagsForTask } from './validation';

/**
 * Associate a trimmed tag name with the task identified by `taskId` (R1.6,
 * R5.1, R5.3, R5.4, R5.5). The tag is added if and only if it is valid
 * (trimmed length 1..50), not already present on the task, and the task
 * currently has fewer than 20 tags. In every rejected case — invalid name,
 * duplicate, or the 20-tag cap already reached — the state is returned
 * unchanged. On success a new state is returned with only the target task's
 * `tags` replaced by a new distinct list of length <= 20.
 */
export function addTagToTask(
  state: AppState,
  taskId: string,
  tagName: string,
): AppState {
  const task = state.tasks.find((t) => t.id === taskId);
  if (task === undefined) {
    // Unknown task: nothing to change.
    return state;
  }

  const result = validateTagsForTask(task.tags, tagName);
  if (!result.ok) {
    // Invalid name, duplicate, or cap reached — leave tags unchanged.
    return state;
  }

  const nextTasks = state.tasks.map((t) =>
    t.id === taskId ? { ...t, tags: result.value } : t,
  );
  return { ...state, tasks: nextTasks };
}

/**
 * The distinct tag names in use across all tasks, in first-seen order (R5.2).
 * Each returned name appears on at least one task; there are no duplicates and
 * no names that appear on no task.
 */
export function availableTags(state: AppState): string[] {
  const seen = new Set<TagName>();
  const result: string[] = [];
  for (const task of state.tasks) {
    for (const tag of task.tags) {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push(tag);
      }
    }
  }
  return result;
}

/**
 * Return the tasks associated with ALL selected tags (superset match) (R6).
 * When `selectedTags` is empty, every task is returned (R6.2). Otherwise a task
 * is included only when its tag set contains every selected tag (R6.1); a
 * non-empty selection that matches no task yields an empty list (R6.3).
 */
export function filterTasksByTags(
  tasks: Task[],
  selectedTags: string[],
): Task[] {
  if (selectedTags.length === 0) {
    return [...tasks];
  }
  return tasks.filter((task) => {
    const tagSet = new Set(task.tags);
    return selectedTags.every((selected) => tagSet.has(selected));
  });
}
