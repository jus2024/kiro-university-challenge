// Feature: data-export-import
// Pure transfer logic: serialize AppState to JSON, parse+validate a candidate
// import string, and compute the export filename. No DOM, no file APIs — the
// side effects (Blob, FileReader, download) live at the UI edge.
import type { AppState, DateKey } from './types';
// Reuses the SAME schema/version validator the Storage_Manager applies on
// restore, promoted to a named export (no divergent schema) (R4.1).
import { isValidAppState } from '../storage/storage';

/** Fixed application-identifying filename prefix (R1.3). */
export const EXPORT_FILENAME_PREFIX = 'task-habit-tracker-backup';

/** Upper bound on import size, enforced at the UI edge (R2.1, R2.3). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Outcome of parsing + validating a candidate import string. */
export type ParseResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

/**
 * Serialize the complete AppState to a JSON document. This is the round-trip
 * source of truth: it emits the exact AppState shape (version, tasks with inline
 * tags, habits) the Storage_Manager persists (R1.1, R4.4).
 */
export function serializeState(state: AppState): string {
  return JSON.stringify(state);
}

/**
 * Parse and validate a candidate import string into an AppState.
 *
 * JSON.parses the text (catching syntax errors -> ok:false) then runs the SAME
 * isValidAppState predicate used by the Storage_Manager. Returns ok:false with a
 * user-facing message on invalid JSON, wrong version, or malformed task/habit;
 * ok:true with the validated state otherwise. Pure — no DOM, no file APIs
 * (R2.3, R4.1, R4.2, R4.3).
 */
export function parseImport(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The selected file is not valid JSON and could not be imported.' };
  }

  if (!isValidAppState(parsed)) {
    return {
      ok: false,
      error: 'The selected file is not a valid backup and could not be imported.',
    };
  }

  return { ok: true, state: parsed };
}

/**
 * Build the export filename: fixed prefix + ISO 8601 calendar date + ".json",
 * e.g. "task-habit-tracker-backup-2024-06-03.json". `day` is passed in from the
 * edge (no ambient clock) (R1.3).
 */
export function exportFileName(day: DateKey): string {
  return `${EXPORT_FILENAME_PREFIX}-${day}.json`;
}
