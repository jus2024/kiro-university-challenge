// Feature: task-habit-tracker
// UI: a single task row with complete, edit, and delete controls.
//
// `TaskItem` renders a task's details and its actions. The complete/reopen and
// delete triggers are native `<button>`s (R14.3). An open task shows a Complete
// button that dispatches `COMPLETE_TASK` with a timestamp captured at the edge
// (R2.1); a done task instead shows a Reopen button that dispatches
// `REOPEN_TASK` to undo completion (moving it back to "open"). Deleting does
// not remove anything directly: it opens a `ConfirmDialog`, and only a confirm
// dispatches `DELETE_TASK` (R4.1, R4.2); cancel closes the dialog with no
// dispatch, leaving the task in place (R4.4). Editing is surfaced through an
// edit `<button>` that calls `onEdit`, letting a parent reveal the edit form
// (R3.2).

import { useState } from 'react';
import type { Task } from '../domain/types';
import { useApp } from '../state/AppContext';
import ConfirmDialog from './ConfirmDialog';

export interface TaskItemProps {
  task: Task;
  /**
   * Edit entry point (R3.2). Called with the task id when the user activates
   * the edit control so a parent can surface an edit affordance (e.g. the
   * TaskForm in edit mode). Optional so TaskItem stays usable standalone.
   */
  onEdit?: (taskId: string) => void;
}

// Consistent action-button styling; a min height keeps touch targets adequate.
const actionButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50';
const deleteButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50';

/**
 * Render one task with its complete/edit/delete controls.
 *
 * All actions use native `<button>` elements, so Enter and Space activate them
 * exactly like a pointer click (R14.3). Every button has an accessible name:
 * text buttons via their content and, where a button would otherwise be
 * icon-only, via an explicit `aria-label` (R15.2).
 */
export default function TaskItem({ task, onEdit }: TaskItemProps) {
  const { dispatch } = useApp();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isDone = task.status === 'done';

  function handleComplete() {
    // Capture the timestamp at the edge; the domain stamps it once (R2.1, R2.4).
    dispatch({ type: 'COMPLETE_TASK', taskId: task.id, now: Date.now() });
  }

  function handleReopen() {
    // Undo completion: move the task back to "open" and clear its timestamp.
    dispatch({ type: 'REOPEN_TASK', taskId: task.id });
  }

  function handleConfirmDelete() {
    dispatch({ type: 'DELETE_TASK', taskId: task.id });
    setConfirmingDelete(false);
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-medium ${
                isDone ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {task.title}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                isDone
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isDone ? 'Done' : 'Open'}
            </span>
          </div>
          {task.dueDate !== null && (
            <span className="mt-1 block text-sm text-slate-500">
              Due {task.dueDate}
            </span>
          )}
          {task.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
              {task.tags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-wrap gap-2">
          {isDone ? (
            <button
              type="button"
              onClick={handleReopen}
              aria-label={`Reopen task: ${task.title}`}
              className={actionButtonClass}
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              aria-label={`Complete task: ${task.title}`}
              className={actionButtonClass}
            >
              Complete
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit?.(task.id)}
            aria-label={`Edit task: ${task.title}`}
            className={actionButtonClass}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete task: ${task.title}`}
            className={deleteButtonClass}
          >
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}
