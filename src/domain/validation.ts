// Feature: task-habit-tracker
// Field validation shared by forms and the reducer (R1, R3, R5, R7).
//
// Every validator is a pure function that returns a `Validated<T>` result and
// NEVER throws. On failure it returns `{ ok: false, errors }` where each error
// carries a `field` name so the UI can render the message adjacent to the
// offending input. On success it returns `{ ok: true, value }` with the
// normalized (e.g. trimmed) value.

import type { TargetFrequency, Validated, ValidationError } from './types';

/** Maximum length of a task title, inclusive (R1.4, R3.3). */
const TITLE_MAX = 200;
/** Maximum length of a tag name, inclusive (R5.3). */
const TAG_NAME_MAX = 50;
/** Maximum number of tags associated with a single task (R5.5, R1.6). */
const TAGS_PER_TASK_MAX = 20;
/** Maximum length of a habit name, inclusive (R7.3). */
const HABIT_NAME_MAX = 100;

/** Build a failed `Validated` result for a single field. */
function fail<T>(field: string, message: string): Validated<T> {
  const error: ValidationError = { field, message };
  return { ok: false, errors: [error] };
}

/**
 * Validate a task title: trim, then require a length of 1..200 (R1.3, R1.4, R3.3).
 * On success returns the trimmed title.
 */
export function validateTaskTitle(raw: string): Validated<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fail('title', 'Title is required.');
  }
  if (trimmed.length > TITLE_MAX) {
    return fail('title', `Title must be at most ${TITLE_MAX} characters.`);
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a due date (R1.5). `null` (no due date) is valid. Otherwise the
 * string must be a `YYYY-MM-DD` value that parses to a real calendar date;
 * unparseable or non-existent dates (e.g. "2024-02-30") are rejected.
 * On success returns the normalized `YYYY-MM-DD` string (or `null`).
 */
export function validateDueDate(raw: string | null): Validated<string | null> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    // An empty string means "no due date".
    return { ok: true, value: null };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return fail('dueDate', 'Due date must be a valid date (YYYY-MM-DD).');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Reject values that overflowed (e.g. month 13, Feb 30) — the constructed
  // Date's components must match the parsed input exactly.
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  if (!isRealDate) {
    return fail('dueDate', 'Due date must be a valid date (YYYY-MM-DD).');
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a tag name: trim, then require a length of 1..50 (R5.3).
 * On success returns the trimmed name.
 */
export function validateTagName(raw: string): Validated<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fail('tags', 'Tag name is required.');
  }
  if (trimmed.length > TAG_NAME_MAX) {
    return fail('tags', `Tag name must be at most ${TAG_NAME_MAX} characters.`);
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate adding a tag to a task's existing tag list (R1.6, R5.1, R5.4, R5.5).
 * The candidate must be a valid tag name (trim -> 1..50), not already present
 * in `existing`, and the task must currently have fewer than 20 tags.
 * On success returns the new tag list (existing plus the trimmed name),
 * which is distinct and has length <= 20.
 */
export function validateTagsForTask(
  existing: string[],
  toAdd: string,
): Validated<string[]> {
  const nameResult = validateTagName(toAdd);
  if (!nameResult.ok) {
    return nameResult;
  }
  const trimmed = nameResult.value;
  if (existing.includes(trimmed)) {
    return fail('tags', 'Tag is already added.');
  }
  if (existing.length >= TAGS_PER_TASK_MAX) {
    return fail(
      'tags',
      `A task can have at most ${TAGS_PER_TASK_MAX} tags.`,
    );
  }
  return { ok: true, value: [...existing, trimmed] };
}

/**
 * Validate a habit name: trim, then require a length of 1..100 (R7.2, R7.3).
 * On success returns the trimmed name.
 */
export function validateHabitName(raw: string): Validated<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fail('name', 'Habit name is required.');
  }
  if (trimmed.length > HABIT_NAME_MAX) {
    return fail('name', `Habit name must be at most ${HABIT_NAME_MAX} characters.`);
  }
  return { ok: true, value: trimmed };
}

/**
 * Validate a target frequency (R7.4). A missing value (`null`) or any value
 * other than a supported `TargetFrequency` is rejected. On success returns the
 * `TargetFrequency`.
 */
export function validateTargetFrequency(
  raw: string | null,
): Validated<TargetFrequency> {
  if (raw === null || raw.trim().length === 0) {
    return fail('targetFrequency', 'Target frequency is required.');
  }
  const trimmed = raw.trim();
  if (trimmed === 'daily') {
    return { ok: true, value: 'daily' };
  }
  return fail('targetFrequency', 'Target frequency must be "daily".');
}
