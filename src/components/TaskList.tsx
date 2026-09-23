// Feature: task-habit-tracker
// UI: renders an already-filtered list of tasks.
//
// `TaskList` is a thin presentational wrapper: it receives the tasks to show
// (the parent applies any tag filtering) and renders a `TaskItem` per task,
// forwarding the optional edit entry point. An empty list renders a simple
// note rather than an empty container so the UI stays understandable.

import type { Task } from '../domain/types';
import TaskItem from './TaskItem';

export interface TaskListProps {
  /** The tasks to render — already filtered by the parent. */
  tasks: Task[];
  /** Edit entry point forwarded to each row (R3.2). */
  onEdit?: (taskId: string) => void;
}

/**
 * Render the given tasks, one `TaskItem` each. When there are no tasks, show a
 * short empty-state note.
 */
export default function TaskList({ tasks, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No tasks yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Tasks">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onEdit={onEdit} />
      ))}
    </ul>
  );
}
