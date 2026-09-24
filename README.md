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
- [Tailwind CSS v4](https://tailwindcss.com/) (via the `@tailwindcss/vite` plugin)
  for styling
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

## Built with Kiro

This project was built for the Kiro University Challenge, applying one Kiro
capability per lesson. Everything is configured under the `.kiro/` directory.

### Lesson 1 — Spec-driven development

Features were developed with Kiro's spec workflow. Each spec captures
requirements, design, and an incremental task plan:

- `.kiro/specs/task-habit-tracker/` — the core feature.
  - `requirements.md` — requirements in EARS notation, with a glossary.
  - `design.md` — architecture, data models, 17 correctness properties, and the
    testing strategy.
  - `tasks.md` — the incremental implementation plan.
- `.kiro/specs/data-export-import/` — a follow-on spec adding JSON backup/restore
  (export to a file, validated import that reuses the storage schema, and a
  round-trip correctness property), built on the same architecture.

### Lesson 2 — Steering documents

`.kiro/steering/ui-ux-standards.md` is a steering file that keeps frontend work
consistent without repeating instructions. It defines accessibility (WCAG 2.1 AA),
responsive mobile-first, and interaction-consistency standards, each with a
rationale and good-vs-bad code examples. It is scoped to frontend files via
`fileMatch` so the standards surface when editing `.tsx`/`.ts`/`.css`. Tailwind
CSS was adopted alongside these standards to restyle the UI.

### Lesson 3 — Hooks

`.kiro/hooks/test-on-save.json` is an agent hook that runs the Vitest suite on
every TypeScript/TSX file save (a `PostFileSave` trigger). It automates test
execution so the property-based and unit tests stay green as the code changes.

### Lesson 4 — Property-based testing

The 17 correctness properties defined in `design.md` are implemented as
property-based tests with [fast-check](https://fast-check.dev/) (at least 100
runs each), co-located with the domain and storage modules they target
(`src/domain/*.test.ts`, `src/storage/storage.test.ts`). Each test references
its design property via a `// Feature: task-habit-tracker, Property {n}: ...`
comment, tying the tests back to the spec.

### Lesson 5 — Powers

`.kiro/powers/task-habit-tracker-frontend/` is a project-specific Kiro Power that
loads on-demand context when working on this app. It ships a `plugin.json` manifest
(conforming to the Agent Plugins 1.0.0 schema), a `POWER.md` overview, `steering/`
files (architecture, domain rules, and frontend conventions), and an `mcp.json`
bundling a `fetch` MCP server. It was authored for this project (inspired by
community React/MCP powers) rather than installed from a third party, so its
contents are reviewed and trusted.

### Lesson 6 — Model Context Protocol (MCP)

Two MCP servers are used during development, each registered where it fits best:

- `fetch` (`mcp-server-fetch`) — bundled inside the Lesson 5 Power's `mcp.json`,
  demonstrating that a Power can package its own tools.
- `git` (`mcp-server-git`) — registered at the workspace level in
  `.kiro/settings/mcp.json`, where it runs at the repository root so its
  `--repository .` resolves correctly.

Both are launched with `uvx`; `autoApprove` is limited to read-only operations.

### Lesson 7 — Custom agents

`.kiro/agents/tracker-dev.json` is a purpose-built agent for this project that ties
the previous lessons together. It loads both specs and the UI/UX steering as
`resources` (Lessons 1–2), pulls in the project Power via `includePowers` (Lesson
5) and the workspace MCP servers via `includeMcpJson` (Lesson 6), and defines
capability-based `permissions` that pre-approve `npm`/`git` work while gating
destructive commands (`git push`, `rm`, `git reset`) behind an `ask` prompt. Its
`prompt` encodes the project's architecture, domain rules, and testing conventions.
Hooks stay in `.kiro/hooks/` since the IDE ignores agents that embed hooks.

### Bonus Lesson 2 — Package a Kiro power

The Lesson 5 Power is also published as a standalone public repository so it can be
shared and installed on its own:
[jus2024/task-habit-tracker-frontend-power](https://github.com/jus2024/task-habit-tracker-frontend-power).
Its `plugin.json` conforms to the Agent Plugins 1.0.0 manifest schema
(`$schema` + `name`), and the repo carries an MIT license.

## License

This project was created for the Kiro University Challenge.
