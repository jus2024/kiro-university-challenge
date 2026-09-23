# Implementation Plan: Task & Habit Tracker

## Overview

This plan implements the Task & Habit Tracker as a React + TypeScript + Vite app with `localStorage` persistence, following the layered architecture in the design: a pure domain core, a storage layer, a reducer-based state layer, and native-HTML UI components, wired together in `App`/`AppProvider`.

The plan is strictly incremental and test-driven. It scaffolds the project and test tooling first, then builds the pure domain layer bottom-up (types → date utilities → validation → tasks → tags → habits → streaks → stats), implementing all 17 correctness properties as `fast-check` property tests alongside their functions. It then adds the storage layer, the state layer, and the UI components with component/interaction and accessibility tests, and finishes by wiring persistence and assembling `App`. Each task builds on prior tasks and ends in wired, tested code with no orphaned pieces.

Every property test is tagged with the comment format:
`// Feature: task-habit-tracker, Property {number}: {property text}`

## Tasks

- [x] 1. Scaffold project and test tooling
  - Initialize a Vite React + TypeScript project structure (`index.html`, `src/main.tsx`, `src/App.tsx` placeholder, `tsconfig.json`, `vite.config.ts`).
  - Add and configure dependencies: `react`, `react-dom`, `vitest`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`.
  - Configure Vitest in `vite.config.ts` (or `vitest.config.ts`) with the `jsdom` environment, a global test setup file importing `@testing-library/jest-dom`, and a default of at least 100 runs for `fast-check` (via `fc.configureGlobal({ numRuns: 100 })` in setup).
  - Create the directory structure: `src/domain/`, `src/storage/`, `src/state/`, `src/components/`.
  - Add a global `src/index.css` with a `:focus-visible` outline rule so every focused control shows a visible indicator.
  - Add a smoke test that renders the `App` placeholder to confirm the toolchain runs.
  - _Requirements: 14.2_

- [x] 2. Define core data models and shared types
  - [x] 2.1 Create domain types module
    - In `src/domain/types.ts`, define `TaskStatus`, `TargetFrequency`, `DateKey`, `TagName`, `Task`, `Habit`, `AppState` (with `version: 1`), `EMPTY_STATE`, `NewTaskInput`, `TaskPatch`, and `NewHabitInput` exactly as specified in the design's Data Models section.
    - Define `ValidationError`, `Validated<T>`, `LoadResult`, and `SaveResult` types (shared by validation and storage layers).
    - Provide a small `newId()` helper (UUID string) used by creation functions.
    - _Requirements: 1.1, 7.1, 12.1, 13.1_

- [x] 3. Implement date and week utilities
  - [x] 3.1 Implement dateUtils
    - In `src/domain/dateUtils.ts`, implement `toDateKey`, `addDays`, `isSameLocalDay`, `weekRange` (Monday–Sunday local week), and `lastNDays`, all in local time and pure (no `Date.now()`).
    - _Requirements: 10.2_

  - [ ]* 3.2 Write unit tests for dateUtils
    - Test `toDateKey` formatting, `addDays` across month/year boundaries, `weekRange` for days landing on Monday and Sunday, and `lastNDays` ordering/length.
    - _Requirements: 10.2_

- [x] 4. Implement input validation
  - [x] 4.1 Implement validation functions
    - In `src/domain/validation.ts`, implement `validateTaskTitle` (trim → 1..200), `validateDueDate` (valid date or null), `validateTagName` (trim → 1..50), `validateTagsForTask` (distinct + ≤20), `validateHabitName` (trim → 1..100), and `validateTargetFrequency`. All return `Validated<T>` and never throw.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.3, 5.3, 5.4, 5.5, 7.2, 7.3, 7.4_

  - [ ]* 4.2 Write property test for title validation
    - **Property 2: Title validity governs task creation and edits** — trimmed length 0 or >200 → `ok:false`; 1–200 → `ok:true` with trimmed value.
    - **Validates: Requirements 1.3, 1.4, 3.1, 3.3**

  - [ ]* 4.3 Write property test for due-date validation
    - **Property 3: Due-date validation accepts exactly parseable dates** — unparseable → `ok:false`; parseable or `null` → `ok:true`.
    - **Validates: Requirements 1.5**

  - [ ]* 4.4 Write unit tests for validation boundaries
    - Test title lengths 200 vs 201, habit-name lengths 100 vs 101, specific valid/invalid due-date strings, and missing target frequency.
    - _Requirements: 1.4, 3.3, 7.3, 7.4_

- [x] 5. Implement task lifecycle domain functions
  - [x] 5.1 Implement task operations
    - In `src/domain/tasks.ts`, implement `createTask` (trims title, defaults `status:"open"`, `completedAt:null`, appends to list), `editTask` (validates then patches title/dueDate/tags, else returns state unchanged), `completeTask` (sets `"done"` + `completedAt=now`, idempotent stamp), and `deleteTask` (removes only that task).
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 3.1, 3.2, 4.2_

  - [ ]* 5.2 Write property test for task creation
    - **Property 1: Task creation grows the list and preserves inputs** — list length +1; new task has trimmed title, given due date/tags, `status:"open"`, `completedAt:null`.
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 5.3 Write property test for task completion
    - **Property 7: Completing a task is idempotent and stamps once** — first complete sets `done`/`completedAt=now`; re-complete with later `now2` keeps original `completedAt`.
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [ ]* 5.4 Write property test for task deletion
    - **Property 8: Deleting a task removes only that task** — result omits exactly that task, keeps all others, length −1.
    - **Validates: Requirements 4.2**

  - [ ]* 5.5 Write property test for edit title validity
    - **Property 2: Title validity governs task creation and edits** (edit branch) — invalid title leaves state unchanged; valid title applies trimmed value.
    - **Validates: Requirements 3.1, 3.3**

- [x] 6. Implement tag association and filtering
  - [x] 6.1 Implement tag operations
    - In `src/domain/tags.ts`, implement `addTagToTask` (associate trimmed name iff valid, distinct, and <20 tags; else unchanged), `availableTags` (distinct in-use names), and `filterTasksByTags` (AND/superset match; empty selection → all tasks).
    - _Requirements: 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [ ]* 6.2 Write property test for tag-add semantics
    - **Property 4: Tag-add semantics (valid, distinct, capped)** — associates iff valid/distinct/<20; rejected cases leave tags unchanged; accepted cases stay distinct with length ≤20.
    - **Validates: Requirements 1.6, 5.1, 5.3, 5.4, 5.5**

  - [ ]* 6.3 Write property test for available tags
    - **Property 5: Available tags are exactly the distinct tags in use** — each in-use tag appears once, no unused names.
    - **Validates: Requirements 5.2**

  - [ ]* 6.4 Write property test for tag filtering
    - **Property 6: Tag filtering returns exactly the tasks matching all selected tags** — superset match; empty selection returns all.
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 7. Implement habit lifecycle and completion toggling
  - [x] 7.1 Implement habit operations
    - In `src/domain/habits.ts`, implement `createHabit` (trimmed name, given frequency, empty `completions`), `checkOffHabit` (add day iff absent — idempotent), `uncheckHabit` (remove day if present, else no-op), and `isCompletedOn`.
    - _Requirements: 7.1, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 7.2 Write property test for habit creation
    - **Property 9: Habit creation adds a habit with empty history** — appends habit with trimmed name, frequency, empty `completions`.
    - **Validates: Requirements 7.1**

  - [ ]* 7.3 Write property test for check-off idempotence
    - **Property 10: Check-off is idempotent (exactly one record per day)** — once vs twice yield equal histories; exactly one entry for the date.
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 7.4 Write property test for check/uncheck identity
    - **Property 11: Check-off then uncheck is the identity on completion history** — `uncheck(check(habit, day), day)` equals original set; uncheck of absent day is unchanged.
    - **Validates: Requirements 8.3, 8.4**

- [x] 8. Implement streak calculation
  - [x] 8.1 Implement currentStreak
    - In `src/domain/streaks.ts`, implement `currentStreak(habit, today)` as the maximal consecutive run of completed days ending on and including `today`, returning 0 when `today` has no record.
    - _Requirements: 9.1, 9.2_

  - [ ]* 8.2 Write property test for current streak
    - **Property 12: Current streak equals the consecutive run ending today** — equals maximal consecutive run ending today; 0 when today missing.
    - **Validates: Requirements 9.1, 9.2**

- [x] 9. Implement progress statistics
  - [x] 9.1 Implement stats functions
    - In `src/domain/stats.ts`, implement `tasksCompletedOn` (count `completedAt` on `day` local), `tasksCompletedInWeekOf` (count within Monday–Sunday week using `weekRange`), and `completionRate` (integer `round(daysCompletedInLast7 / 7 * 100)`, 0..100).
    - _Requirements: 10.1, 10.2, 10.3, 11.2_

  - [ ]* 9.2 Write property test for daily task count
    - **Property 13: Daily task count matches tasks completed on that day** — equals count of tasks whose `completedAt` falls on `day` local; 0 when none.
    - **Validates: Requirements 10.1, 10.3**

  - [ ]* 9.3 Write property test for weekly task count
    - **Property 14: Weekly task count matches the Monday-start week of today** — equals count within the Monday–Sunday week containing `day`; 0 when none.
    - **Validates: Requirements 10.2, 10.3**

  - [ ]* 9.4 Write property test for completion rate
    - **Property 15: Completion rate is a whole percent within 0–100** — integer 0..100 equal to `round(daysCompletedInLast7 / 7 * 100)`.
    - **Validates: Requirements 11.2**

  - [ ]* 9.5 Write unit tests for empty statistics
    - Assert daily/weekly counts and completion rate are 0 when no completions fall in the period.
    - _Requirements: 10.3_

- [x] 10. Checkpoint - domain layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement the storage layer
  - [x] 11.1 Implement loadState and saveState
    - In `src/storage/storage.ts`, implement `saveState` (serialize `AppState` to `localStorage`, try/catch write failures → `{ ok:false, warning }`, leaving in-memory state untouched) and `loadState` (read + `JSON.parse` + schema/version validation, returning `{ state, warning }`; on any failure return `EMPTY_STATE` with a non-null warning).
    - _Requirements: 12.1, 12.2, 13.1, 13.2_

  - [ ]* 11.2 Write property test for save/load roundtrip
    - **Property 16: Save/load roundtrip preserves application state** — `loadState()` after `saveState(state)` deep-equals the original.
    - **Validates: Requirements 13.1**

  - [ ]* 11.3 Write property test for corrupt-data handling
    - **Property 17: Corrupt stored data yields empty state with a warning** — non-JSON or schema-invalid stored strings → `EMPTY_STATE` with a non-null warning.
    - **Validates: Requirements 13.2**

  - [ ]* 11.4 Write unit tests for storage failures
    - Test `loadState` on hand-crafted corrupt payloads (non-JSON, wrong `version`, missing fields) and a `setItem` that throws (write failure returns a warning without mutating state).
    - _Requirements: 12.2, 13.2_

- [x] 12. Implement the state layer (reducer + context)
  - [x] 12.1 Implement appReducer
    - In `src/state/appReducer.ts`, define `AppAction` and implement `appReducer(state, action)` delegating to domain functions for `CREATE_TASK`, `EDIT_TASK`, `COMPLETE_TASK`, `DELETE_TASK`, `ADD_TAG`, `CREATE_HABIT`, `CHECK_HABIT`, `UNCHECK_HABIT`, and `HYDRATE`. The reducer is pure, never throws, and returns the input state unchanged on invalid mutations.
    - _Requirements: 1.1, 2.1, 3.1, 4.2, 5.1, 7.1, 8.1, 8.3, 13.1_

  - [ ]* 12.2 Write unit tests for appReducer
    - Test each action produces the expected next state and that invalid mutations (e.g., empty title, duplicate tag) leave state unchanged; test `HYDRATE` replaces state.
    - _Requirements: 1.1, 2.1, 3.1, 4.2, 5.1, 7.1, 8.1, 8.3_

  - [x] 12.3 Implement AppContext and useApp
    - In `src/state/AppContext.tsx`, create the context, the `AppContextValue` shape (`state`, `dispatch`, `warning`, `dismissWarning`), and the `useApp()` hook. Leave provider persistence wiring to Task 15 (this task establishes the context and hook only, consumed by a minimal test harness).
    - _Requirements: 12.2, 13.2_

- [x] 13. Implement task and tag UI components
  - [x] 13.1 Implement TaskForm
    - In `src/components/TaskForm.tsx`, build a native `<form>` for create/edit with labeled title, due-date, and tag inputs; call validators on submit; on failure retain values and render error messages adjacent to the offending field; on success dispatch `CREATE_TASK`/`EDIT_TASK`.
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 15.1_

  - [ ]* 13.2 Write component tests for TaskForm
    - Test validation surfacing (empty/over-length title, invalid date, invalid tags) retains values and shows adjacent errors; test successful submit dispatches the action; assert every input is reachable via `getByLabelText`.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.2, 3.3, 15.1_

  - [x] 13.3 Implement TaskList, TaskItem, and ConfirmDialog
    - In `src/components/TaskList.tsx`, `src/components/TaskItem.tsx`, and `src/components/ConfirmDialog.tsx`, render tasks with a native `<button>` complete control, an edit entry point, and a delete trigger that opens `ConfirmDialog`; confirm dispatches `DELETE_TASK`, cancel closes without dispatch. Icon-only buttons carry `aria-label`s.
    - _Requirements: 2.1, 3.2, 4.1, 4.2, 4.4, 14.3, 15.2_

  - [ ]* 13.4 Write component tests for TaskList/TaskItem/ConfirmDialog
    - Test complete control dispatches `COMPLETE_TASK`; delete opens the dialog and removes nothing; confirm removes; cancel retains; Enter/Space on controls invoke the same handler as click; buttons reachable via `getByRole('button', { name })`.
    - _Requirements: 2.1, 4.1, 4.4, 14.3, 15.2_

  - [x] 13.5 Implement TagFilterBar
    - In `src/components/TagFilterBar.tsx`, render multi-select tag filters from `availableTags`, apply `filterTasksByTags` to the displayed list, and show a no-match indication when a non-empty selection matches zero tasks.
    - _Requirements: 5.2, 6.1, 6.2, 6.3_

  - [ ]* 13.6 Write component tests for TagFilterBar
    - Test empty selection shows all tasks, selecting tags filters by AND, and a non-matching selection shows the no-match indication.
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 14. Implement habit and progress UI components
  - [x] 14.1 Implement HabitForm
    - In `src/components/HabitForm.tsx`, build a native `<form>` with labeled name and target-frequency inputs; validate on submit; on failure retain values and render errors adjacent to the correct field; on success dispatch `CREATE_HABIT`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 15.1_

  - [ ]* 14.2 Write component tests for HabitForm
    - Test validation surfacing for empty/over-length name and missing frequency retains values and shows adjacent errors; successful submit dispatches; inputs reachable via `getByLabelText`.
    - _Requirements: 7.2, 7.3, 7.4, 15.1_

  - [x] 14.3 Implement HabitList and HabitItem
    - In `src/components/HabitList.tsx` and `src/components/HabitItem.tsx`, render habits with a native `<input type="checkbox">` check/uncheck toggle (dispatching `CHECK_HABIT`/`UNCHECK_HABIT` with the current `DateKey`) and display the current streak integer (including 0).
    - _Requirements: 8.1, 8.3, 9.3, 14.3, 15.2_

  - [ ]* 14.4 Write component tests for HabitList/HabitItem
    - Test check toggles dispatch check/uncheck; streak renders as an integer including 0; checkbox is labeled and Space-activatable.
    - _Requirements: 8.1, 8.3, 9.3, 14.3, 15.2_

  - [x] 14.5 Implement ProgressView
    - In `src/components/ProgressView.tsx`, display daily and weekly task counts (via `tasksCompletedOn`/`tasksCompletedInWeekOf`), per-habit streak and completion rate (via `currentStreak`/`completionRate`), and an empty-state indication when no habits exist.
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3_

  - [ ]* 14.6 Write component tests for ProgressView
    - Test daily/weekly counts (including 0), per-habit streak and rate display, and the empty-state indication when no habits exist.
    - _Requirements: 10.3, 11.1, 11.2, 11.3_

  - [x] 14.7 Implement WarningBanner
    - In `src/components/WarningBanner.tsx`, render a non-blocking, dismissible banner from the context `warning`, with a labeled dismiss `<button>` calling `dismissWarning`.
    - _Requirements: 12.2, 13.2, 15.2_

- [x] 15. Wire persistence and assemble the App
  - [x] 15.1 Implement AppProvider with persistence effects
    - In `src/state/AppContext.tsx` (or `src/components/AppProvider.tsx`), initialize the reducer by calling `loadState()` on mount (dispatch `HYDRATE`, surface any restore warning), and add an effect that calls `saveState` after each committed mutation, setting a non-null `warning` on write failure without mutating in-memory state.
    - _Requirements: 12.1, 12.2, 13.1, 13.2_

  - [ ]* 15.2 Write integration tests for persistence wiring
    - With a mocked `localStorage`: assert each committed mutation (create/edit/complete/delete/tag/habit) triggers `saveState` with the full state; a throwing `setItem` leaves state unchanged and shows the warning banner; on load, persisted state is restored into the reducer.
    - _Requirements: 2.3, 4.3, 12.1, 12.2, 13.1_

  - [x] 15.3 Assemble App
    - In `src/App.tsx`, compose `AppProvider` around `WarningBanner`, `TaskForm`, `TagFilterBar`, `TaskList`, `HabitForm`, `HabitList`, and `ProgressView`, passing filtered tasks from `TagFilterBar` into `TaskList` and reading state via `useApp()`. Ensure no orphaned components remain.
    - _Requirements: 6.1, 10.1, 11.1, 12.1, 13.1_

  - [ ]* 15.4 Write end-to-end assembly and accessibility tests
    - Render the full `App` and test a representative flow (create task → filter by tag → complete task → create habit → check off → progress updates); assert every input is reachable via `getByLabelText`, every button via `getByRole('button', { name })`, and controls are in tab order.
    - _Requirements: 14.1, 14.3, 15.1, 15.2_

- [x] 16. Final checkpoint - full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement clauses for traceability, and every property test references its numbered design property.
- The domain layer is pure and built bottom-up so each function is testable in isolation before the state and UI layers consume it.
- Property tests use `fast-check` (≥100 runs) and are tagged `// Feature: task-habit-tracker, Property {number}: {property text}`; unit, component, and integration tests cover boundaries, validation surfacing, accessibility, and persistence wiring.
- Checkpoints provide incremental validation after the domain layer and at final assembly.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "11.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.1", "11.2", "11.3", "11.4"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "6.1", "7.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "7.2", "7.3", "7.4", "8.2", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 6, "tasks": ["12.1"] },
    { "id": 7, "tasks": ["12.2", "12.3"] },
    { "id": 8, "tasks": ["13.1", "13.3", "13.5", "14.1", "14.3", "14.5", "14.7"] },
    { "id": 9, "tasks": ["13.2", "13.4", "13.6", "14.2", "14.4", "14.6", "15.1"] },
    { "id": 10, "tasks": ["15.2", "15.3"] },
    { "id": 11, "tasks": ["15.4"] }
  ]
}
```
