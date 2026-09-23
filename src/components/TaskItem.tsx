// Feature: task-habit-tracker
// UI: a single task row with complete, edit, and delete controls.
//
// `TaskItem` renders a task's details and its three actions. The complete and
// delete triggers are native `<button>`s (R14.3). Completing dispatches
// `COMPLETE_TASK` with a timestamp captured at the edge (R2.1). Deleting does
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

  function handleConfirmDelete() {
    dispatch({ type: 'DELETE_TASK', taskId: task.id });
    setConfirmingDelete(false);
  }

  return (
    <li className="task-item">
      <div className="task-item__body">
        <span className="task-item__title">{task.title}</span>
        <span className="task-item__status">{isDone ? 'Done' : 'Open'}</span>
        {task.dueDate !== null && (
          <span className="task-item__due">Due {task.dueDate}</span>
        )}
        {task.tags.length > 0 && (
          <ul className="task-item__tags" aria-label="Tags">
            {task.tags.map((tag) => (
              <li key={tag} className="task-item__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="task-item__actions">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isDone}
          aria-label={`Complete task: ${task.title}`}
        >
          Complete
        </button>

        <button
          type="button"
          onClick={() => onEdit?.(task.id)}
          aria-label={`Edit task: ${task.title}`}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Delete task: ${task.title}`}
        >
          Delete
        </button>
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
