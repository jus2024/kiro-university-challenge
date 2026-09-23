# Domain Rules

Business rules for the Task & Habit Tracker domain. These mirror the requirements
in `.kiro/specs/task-habit-tracker/requirements.md` and the correctness properties
in `design.md`. Preserve them exactly — they are covered by property-based tests.

## Tasks

- **Title**: trimmed length must be 1–200 chars. Empty/whitespace-only or >200 is
  invalid and rejected (state unchanged).
- **Due date**: optional; must be a parseable calendar date or `null`.
- **Status**: `"open"` or `"done"`. Completing sets `status="done"` and stamps
  `completedAt` once; re-completing an already-done task leaves the original
  timestamp unchanged (idempotent).
- **Delete**: requires confirmation; removes only that task.

## Tags

- Trimmed name must be 1–50 chars; a task holds at most 20 **distinct** tags.
- Adding is accepted only if the name is valid, not already present, and under the
  cap; otherwise the tag list is unchanged.
- Available tags are exactly the distinct names in use across tasks (derived).
- Filtering is an AND/superset match: a task matches only if it has **all** selected
  tags. An empty selection shows all tasks.

## Habits

- **Name**: trimmed length 1–100 chars. Target frequency is `"daily"`.
- **Completions**: a set of `DateKey` (`YYYY-MM-DD`, local) — at most one entry per
  calendar date. Check-off adds the day iff absent (idempotent); uncheck removes it
  if present, else no-op.
- **Current streak**: the count of consecutive calendar days ending on and
  including today that all have a completion; `0` when today has no completion.

## Statistics (local time)

- Tasks completed today = tasks whose `completedAt` falls on the given day.
- Tasks completed this week = within the **Monday–Sunday** local week containing
  the day.
- Habit completion rate = `round(daysCompletedInLast7 / 7 * 100)`, an integer 0–100
  over the 7 days ending on and including today.

## Determinism

All of the above is implemented as pure functions that take the current day/clock
as an argument. Never read the system clock inside domain functions — pass it in.
When adding rules, add a matching correctness property and a fast-check test.
