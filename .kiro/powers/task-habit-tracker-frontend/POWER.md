---
name: "task-habit-tracker-frontend"
displayName: "Task & Habit Tracker Frontend"
description: "Project-specific knowledge for the Task & Habit Tracker: its layered architecture, domain rules, spec-driven workflow, and accessible, responsive React + Tailwind UI conventions. Loads on demand when working on this app's frontend, domain logic, or tests."
keywords: ["task-habit-tracker", "tracker", "habit", "task", "streak", "domain layer", "reducer", "localStorage", "tailwind", "accessibility", "property-based test", "fast-check"]
author: "jus2024"
---

# Task & Habit Tracker Frontend

A project-specific Kiro Power that gives the agent on-demand context for working on
this app: its layered architecture, domain rules, and accessible, responsive
React + Tailwind conventions — plus the MCP tools used during development.

It was authored for this project (inspired by community React/MCP powers such as
[praveenc/kiro-powers](https://github.com/praveenc/kiro-powers)) rather than
installed from a third party, so its contents are reviewed and trusted.

## What's included

### Steering files (`steering/`)

| File | Purpose |
| --- | --- |
| `architecture.md` | Layered design (domain / storage / state / UI) and rules for changes |
| `domain-rules.md` | Task, tag, habit, streak, and statistics rules (matches the spec) |
| `frontend-conventions.md` | Component, form/validation, accessibility, and styling patterns |

### MCP servers (`mcp.json`)

| Server | Purpose |
| --- | --- |
| `fetch` (`uvx mcp-server-fetch`) | Retrieve up-to-date docs from URLs during development |

The Power bundles the environment-independent `fetch` server. A `git` server
(`uvx mcp-server-git`) is registered at the workspace level in
`.kiro/settings/mcp.json`, where it runs at the repository root so its
`--repository .` resolves correctly; keeping it out of the Power avoids a
path-dependent failure when the Power process starts elsewhere.

## When to load steering files

- Working on this app's architecture or a new feature -> `architecture.md`
- Changing task/tag/habit/streak/stats behavior -> `domain-rules.md`
- Building or styling UI components -> `frontend-conventions.md`

## Requirements

- [uv / uvx](https://docs.astral.sh/uv/) available on PATH (for the MCP servers).
- Node.js 18+ for the app itself.
