# Architecture

The Task & Habit Tracker is a single-user, fully client-side React + TypeScript
app on Vite. There is no backend; everything runs in the browser and persists to
`localStorage`. Keep this architecture intact when adding features.

## Layers

Respect the one-way dependency flow: UI -> State -> Domain, with Storage at the edge.

- `src/domain/` — **pure, framework-free** functions over immutable data. No
  `Date.now()`, no `localStorage`, no React. The "current day" and any clock are
  passed in as arguments so the logic stays deterministic and testable. Owns all
  business rules: tasks, tags, habits, streaks, stats, validation, date utilities.
- `src/storage/` — the **only** module that touches `localStorage`. Serializes and
  restores `AppState`, handling write failures and corrupt-data on load.
- `src/state/` — a `useReducer` store exposed via React context (`appReducer`,
  `AppContext`, `useApp()`). The reducer is pure, never throws on bad user input,
  and returns the input state unchanged on invalid mutations.
- `src/components/` — presentational/container React components. They render
  derived data and dispatch actions; they hold only transient view state (form
  values, dialog open/closed, filter selection), never the canonical data.
- `src/App.tsx` — composition root wiring the layers together.

## Rules for changes

- New business logic goes in the **domain layer** as pure functions first, then is
  wired through the reducer, then consumed by components. Never put business rules
  in components.
- Actions carry `now`/`day` from the edge (the component) so the reducer and domain
  stay clock-free.
- `AppState` is the single source of truth: `{ version, tasks, habits }`. Tags are
  normalized names stored inline on tasks; the distinct set is derived, not stored
  separately.
- Persistence is a side effect at the edge — the reducer and domain never call
  storage. Persistence failures must never corrupt in-memory state.
- Keep it modular so later specs (reminders, notifications, export, integrations)
  can layer on without reworking the core.

## Reference

The authoritative design lives in `.kiro/specs/task-habit-tracker/design.md`, and
the requirements (EARS) in `requirements.md`. Read them before non-trivial changes.
