// Feature: task-habit-tracker
// Storage layer (Storage_Manager) — the ONLY module that references localStorage.
//
// Serializes AppState to localStorage and restores it, handling write failures
// (R12.2) and parse/corruption failures (R13.2). Persistence is a side effect at
// the edge: a failed save never mutates in-memory state, and a failed restore
// yields EMPTY_STATE plus a warning so the app can start clean.

import {
  EMPTY_STATE,
  type AppState,
  type DateKey,
  type Habit,
  type LoadResult,
  type SaveResult,
  type Task,
  type TagName,
} from '../domain/types';

/** Single localStorage key holding the serialized AppState. */
const STORAGE_KEY = 'task-habit-tracker/state';

/**
 * Serialize AppState to localStorage under a single key.
 *
 * On any write failure (serialization error, quota exceeded, unavailable
 * storage) returns { ok: false, warning } without throwing; the caller's
 * in-memory state is left untouched (R12.1, R12.2).
 */
export function saveState(state: AppState): SaveResult {
  try {
    const serialized = JSON.stringify(state);
    getLocalStorage().setItem(STORAGE_KEY, serialized);
    return { ok: true, warning: null };
  } catch {
    return {
      ok: false,
      warning: 'Your changes could not be saved to this browser. They remain available until you reload.',
    };
  }
}

/**
 * Read and restore AppState from localStorage.
 *
 * Reads the single key, JSON.parses it, and validates it against the current
 * schema/version. On any failure (missing entry, unavailable storage, non-JSON,
 * wrong version, schema-invalid) returns EMPTY_STATE with a non-null warning
 * (R13.1, R13.2).
 */
export function loadState(): LoadResult {
  let raw: string | null;
  try {
    raw = getLocalStorage().getItem(STORAGE_KEY);
  } catch {
    return corrupt('Saved data could not be read; starting with an empty workspace.');
  }

  if (raw === null) {
    // Nothing persisted yet: a clean first run, not a corruption. No warning.
    return { state: EMPTY_STATE, warning: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return corrupt('Saved data was unreadable and has been reset.');
  }

  if (!isValidAppState(parsed)) {
    return corrupt('Saved data was in an unexpected format and has been reset.');
  }

  return { state: parsed, warning: null };
}

/** Build a LoadResult that substitutes EMPTY_STATE and carries a warning. */
function corrupt(warning: string): LoadResult {
  return { state: EMPTY_STATE, warning };
}

/**
 * Access localStorage. Kept as a single accessor so this remains the only
 * module referencing the global; throws (caught by callers) when unavailable.
 */
function getLocalStorage(): Storage {
  const ls = (globalThis as { localStorage?: Storage }).localStorage;
  if (!ls) {
    throw new Error('localStorage is not available');
  }
  return ls;
}

// --- Schema validation ---

function isValidAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.tasks) || !value.tasks.every(isValidTask)) return false;
  if (!Array.isArray(value.habits) || !value.habits.every(isValidHabit)) return false;
  return true;
}

function isValidTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.title !== 'string') return false;
  if (!(value.dueDate === null || isDateKey(value.dueDate))) return false;
  if (!isStringArray(value.tags)) return false;
  if (value.status !== 'open' && value.status !== 'done') return false;
  if (!(value.completedAt === null || typeof value.completedAt === 'number')) return false;
  if (typeof value.createdAt !== 'number') return false;
  return true;
}

function isValidHabit(value: unknown): value is Habit {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.name !== 'string') return false;
  if (value.targetFrequency !== 'daily') return false;
  if (!isStringArray(value.completions)) return false;
  if (typeof value.createdAt !== 'number') return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is (TagName | DateKey)[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string';
}
