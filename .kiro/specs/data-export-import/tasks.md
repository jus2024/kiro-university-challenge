# Implementation Plan: Data Export & Import

## Overview

This plan implements Data Export & Import as an additive feature on the already-complete Task & Habit Tracker (`.kiro/specs/task-habit-tracker/`). The toolchain (Vite + React 18 + TypeScript, Vitest, `fast-check`, `@testing-library/react`/`user-event`/`jest-dom`, jsdom, Tailwind CSS v4) is already in place and requires no scaffolding; the test setup already configures `fast-check` global runs.

The plan is strictly incremental and bottom-up, mirroring the foundational architecture and its separation of concerns. It first promotes the storage layer's schema validator to a named export so import validates against the exact same predicate the `Storage_Manager` uses on restore (no divergent schema). It then builds the pure `domain/dataTransfer.ts` module (serialize, parse/validate, filename) with its 5 correctness properties implemented as `fast-check` property tests alongside the functions. Only after the transfer logic is pure and tested does the UI consume it: a new `DataTransferBar` component owns every side effect (Blob/object-URL/anchor download, `<input type="file">`/`FileReader`, confirm-before-replace, HYDRATE dispatch, rollback), which is then mounted into the `App` composition and covered by component and integration tests. Import reuses the existing `HYDRATE` action and the provider's save-on-change effect — no new state-layer or persistence code. Each task builds on prior tasks and ends in wired, tested code with no orphaned pieces.

Every property test is tagged with the comment format:
`// Feature: data-export-import, Property {number}: {property text}`

## Tasks

- [x] 1. Promote the storage schema validator to a named export
  - In `src/storage/storage.ts`, change the private `function isValidAppState(value: unknown): value is AppState` to an exported named function (`export function isValidAppState(...)`) with no behavior change; `loadState` continues to use it. This is the single shared validator the import path reuses so restore-validation and import-validation are literally the same code path (no divergent schema).
  - _Requirements: 4.1_

  - [x] 1.1 Write unit tests for the exported validator
    - Assert `isValidAppState` accepts `EMPTY_STATE` and a populated valid `AppState`, and rejects a wrong `version`, a malformed task, and a malformed habit.
    - _Requirements: 4.1, 4.2_

- [x] 2. Implement the pure data-transfer domain module
  - [x] 2.1 Implement dataTransfer functions and constants
    - Create `src/domain/dataTransfer.ts` with pure functions: `serializeState(state: AppState): string` (`JSON.stringify` of the exact `AppState`), `parseImport(text: string): ParseResult` where `ParseResult = { ok: true; state: AppState } | { ok: false; error: string }` (`JSON.parse` catching syntax errors → `ok:false`, then reuse `isValidAppState` from `../storage/storage`, `ok:false` on schema/version mismatch), and `exportFileName(day: DateKey): string` (`` `${EXPORT_FILENAME_PREFIX}-${day}.json` ``). Export consts `EXPORT_FILENAME_PREFIX = 'task-habit-tracker-backup'` and `MAX_IMPORT_BYTES = 10 * 1024 * 1024`. Pure — no DOM, no file APIs.
    - _Requirements: 1.1, 1.3, 2.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 2.2 Write property test for export/import round-trip
    - **Property 1: Export/import round-trip preserves application state** — for any valid `AppState`, `parseImport(serializeState(state))` returns `{ ok: true, state }` deep-equal to the original in `version`, all tasks (including inline tags), and all habits.
    - **Validates: Requirements 4.4, 1.1, 2.1**

  - [x] 2.3 Write property test for non-JSON rejection
    - **Property 2: Non-JSON input is rejected with no state** — for any non-JSON string, `parseImport` returns `{ ok: false }` with a non-empty error and no `state` field.
    - **Validates: Requirements 4.3, 2.3**

  - [x] 2.4 Write property test for schema/version-invalid rejection
    - **Property 3: Schema- or version-invalid JSON is rejected** — for any JSON value that is not a schema-valid `AppState` (wrong `version`, missing `tasks`/`habits`, malformed task/habit), `parseImport` returns `{ ok: false }` and never `ok: true`.
    - **Validates: Requirements 4.1, 4.2, 2.3**

  - [x] 2.5 Write property test for export filename format
    - **Property 4: Export filename has the fixed prefix, the date, and the .json extension** — for any `DateKey`, `exportFileName(day)` starts with `EXPORT_FILENAME_PREFIX`, contains `day`, and ends with `.json`.
    - **Validates: Requirements 1.3**

  - [x] 2.6 Write property test for import/storage validation equivalence
    - **Property 5: Import validation matches storage validation exactly** — for any parsed JSON value, `parseImport(JSON.stringify(value))` is `ok: true` if and only if `isValidAppState(value)` is `true`.
    - **Validates: Requirements 4.1**

  - [x] 2.7 Write unit tests for dataTransfer examples and boundaries
    - Hand-crafted corrupt payloads (non-JSON, `version: 2`, missing `habits`, a task missing `status`) each give `parseImport` `{ ok: false }`; `EMPTY_STATE` round-trips to an equal empty state; `exportFileName` for a specific date produces the exact expected string.
    - _Requirements: 2.3, 4.2, 4.3, 1.3, 4.4_

- [x] 3. Implement the DataTransferBar UI component
  - [x] 3.1 Implement DataTransferBar
    - Create `src/components/DataTransferBar.tsx`, reading `state`/`dispatch` via `useApp()`. **Export:** on a native `<button>` (`Export_Control`) click → `serializeState(state)` → `Blob([json], { type: 'application/json' })` → `URL.createObjectURL` → click a transient `<a download={exportFileName(today)}>` → `URL.revokeObjectURL`; wrap in try/catch → non-blocking error, state untouched. **Import:** a labeled trigger backed by a hidden `<input type="file" accept="application/json">` (`Import_Control`); on change → size check vs `MAX_IMPORT_BYTES` → `FileReader.readAsText` → `parseImport` → capture `previousState` → if state has any task or habit open `ConfirmDialog` (reused) else apply directly → on confirm dispatch `{ type: 'HYDRATE', state: imported }` → rely on `AppProvider` save-on-change → if a subsequent save fails, roll back by re-dispatching `HYDRATE` with `previousState` and show an error; reset the file input value after each attempt. Non-blocking status/error region near the controls (`role="status"` `aria-live="polite"` for success, `role="alert"` for errors), consistent with `WarningBanner`. Distinct, stable accessible labels; native elements for keyboard operability.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 3.2 Write component tests for export
    - Clicking `Export_Control` calls `serializeState` and triggers a download with the correct filename (mock `URL.createObjectURL`/`revokeObjectURL` + anchor click); a throwing `createObjectURL` shows a non-blocking error and leaves state unchanged.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 Write component tests for the import confirm path
    - With a non-empty workspace, selecting a valid file opens `ConfirmDialog`; confirm dispatches `HYDRATE` with the imported state; cancel/Escape leaves state unchanged.
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 3.4 Write component tests for import into an empty workspace
    - With no tasks and no habits, selecting a valid file applies it with no dialog.
    - _Requirements: 3.2_

  - [x] 3.5 Write component tests for invalid/oversize import files
    - Selecting a non-JSON, schema-invalid, or oversize file shows a non-blocking error and dispatches nothing.
    - _Requirements: 2.3, 4.2, 4.3_

  - [x] 3.6 Write accessibility component tests
    - Export reachable via `getByRole('button', { name })`, import via `getByLabelText`/accessible name; the two names are distinct; labels stay unchanged across disabled/focus states; Enter/Space activate the same handler as click.
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4_

- [x] 4. Mount DataTransferBar into the App composition
  - In `src/App.tsx` (`AppContent`), add `DataTransferBar` into the layout (e.g. a toolbar near the header) without disrupting the existing sections (`WarningBanner`, `TaskForm`, `TagFilterBar`, `TaskList`, `HabitForm`, `HabitList`, `ProgressView`). Ensure no orphaned components remain.
  - _Requirements: 1.1, 2.1, 5.1_

  - [x] 4.1 Write integration tests for state replacement and persistence
    - With the real `AppProvider` and mocked/real `localStorage`: a confirmed import dispatches `HYDRATE` and the provider persists via `saveState` (a reload would restore it); forcing `saveState` to fail after a valid import surfaces the storage warning and rolls the workspace back to the captured pre-import state in both memory and storage, with a non-blocking error shown.
    - _Requirements: 2.2, 2.4, 3.3_

- [x] 5. Final checkpoint - full suite green
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific requirement clauses for traceability, and every property test references its numbered design property.
- The transfer logic in `domain/dataTransfer.ts` is pure and built (and tested) before the UI consumes it; DOM and file APIs stay at the UI edge in `DataTransferBar`.
- Import reuses the existing `HYDRATE` action and the storage layer's `isValidAppState` validator (no divergent schema); the provider's existing save-on-change effect persists imported state, so no new state-layer or persistence code is added.
- Property tests use `fast-check` (≥100 runs) and are tagged `// Feature: data-export-import, Property {number}: {property text}`; unit, component, and integration tests cover boundaries, error surfacing, accessibility, and persistence/rollback wiring.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["1.1", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "4"] },
    { "id": 4, "tasks": ["4.1"] }
  ]
}
```
