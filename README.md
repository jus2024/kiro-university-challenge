# Task & Habit Tracker

A single-user, fully client-side web application for capturing tasks, organizing
them with tags, tracking daily habits, and viewing progress over time. Everything
runs in the browser and persists to `localStorage`, so no backend is required.

This project is built with [Kiro](https://kiro.dev) as part of the
**Kiro University Challenge**, using Kiro's spec-driven development workflow.

## Features

- **Tasks** — create, edit, complete, and delete tasks with titles and optional due dates.
- **Tags** — organize tasks with tags and filter the list by one or more tags.
- **Habits** — define daily habits, check them off, and build streaks.
- **Progress** — see tasks completed today and this week, plus each habit's current
  streak and 7-day completion rate.
- **Local persistence** — all data is saved to `localStorage` and restored on reload,
  with graceful, non-blocking handling of storage read/write failures.
- **Accessibility** — native semantic HTML controls, keyboard operability, visible
  focus indicators, and labeled inputs and buttons.

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for the dev server and build
- Browser `localStorage` for persistence
- [Vitest](https://vitest.dev/) with [fast-check](https://fast-check.dev/) and
  [Testing Library](https://testing-library.com/) for tests

## Architecture

The codebase separates pure domain logic from the React/browser shell:

- `src/domain/` — framework-free pure functions: tasks, tags, habits, streaks,
  statistics, validation, and date utilities.
- `src/storage/` — the only module that touches `localStorage`; serializes and
  restores application state.
- `src/state/` — a `useReducer`-based store exposed through React context.
- `src/components/` — presentational and container React components.
- `src/App.tsx` — the composition root wiring the layers together.

This keeps the domain logic deterministic and exhaustively testable, and keeps the
architecture modular so later features (reminders, notifications, data export,
external integrations) can build on it.

## Getting Started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Run the test suite
npm test
```

## Spec-Driven Development

This feature was developed with Kiro's spec workflow. The spec lives in
`.kiro/specs/task-habit-tracker/`:

- `requirements.md` — requirements written in EARS notation, with a glossary.
- `design.md` — architecture, data models, correctness properties, and testing strategy.
- `tasks.md` — the incremental implementation plan.

## License

This project was created for the Kiro University Challenge.
