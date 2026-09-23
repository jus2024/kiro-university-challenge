// Feature: task-habit-tracker
// Core data models and shared types for the domain, state, and storage layers.
//
// All persisted data is plain, JSON-serializable TypeScript. Identifiers are
// string UUIDs. Timestamps are epoch milliseconds; calendar dates are stored as
// DateKey strings ("YYYY-MM-DD") in local time.

export type TaskStatus = 'open' | 'done';
export type TargetFrequency = 'daily';

/** Local calendar date key, e.g. "2024-06-03" (YYYY-MM-DD). */
export type DateKey = string;

/** Tag name, trimmed, 1..50 chars. Stored inline on tasks as normalized names. */
export type TagName = string;

export interface Task {
  id: string;
  title: string; // trimmed, 1..200 chars (Task_Title)
  dueDate: DateKey | null; // valid local date or none
  tags: TagName[]; // 0..20 distinct trimmed names (<=20 per task)
  status: TaskStatus; // "open" | "done"
  completedAt: number | null; // epoch ms; set when status becomes "done"
  createdAt: number;
}

export interface Habit {
  id: string;
  name: string; // trimmed, 1..100 chars (Habit_Name)
  targetFrequency: TargetFrequency; // "daily"
  completions: DateKey[]; // set of dates; at most one entry per calendar date
  createdAt: number;
}

/** The complete persisted application state — the single source of truth. */
export interface AppState {
  version: 1; // schema version for future migrations
  tasks: Task[];
  habits: Habit[];
  // Tags are modeled as normalized names inline on tasks; the distinct set is
  // derived via availableTags(). No separate tag entity is persisted, which keeps
  // tag data consistent by construction (a tag exists iff a task references it).
}

export const EMPTY_STATE: AppState = { version: 1, tasks: [], habits: [] };

export interface NewTaskInput {
  title: string;
  dueDate: string | null;
  tags: string[];
}

export interface TaskPatch {
  title?: string;
  dueDate?: DateKey | null;
  tags?: TagName[];
}

export interface NewHabitInput {
  name: string;
  targetFrequency: TargetFrequency;
}

// --- Shared validation types (used by validation.ts and forms) ---

export type ValidationError = { field: string; message: string };

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] };

// --- Shared storage result types (used by storage.ts) ---

export interface LoadResult {
  state: AppState;
  /** Set when restore failed and empty state was substituted (R13.2). */
  warning: string | null;
}

export interface SaveResult {
  ok: boolean;
  /** Set when the write failed (R12.2). */
  warning: string | null;
}

/**
 * Generate a UUID string used by creation functions.
 *
 * Prefers the platform `crypto.randomUUID()` when available and falls back to a
 * RFC 4122 version 4 compatible implementation otherwise.
 */
export function newId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
