# Task & Habit Tracker Frontend (Kiro Power)

A project-specific Kiro Power that gives the agent on-demand context for working on
this app: its layered architecture, domain rules, and accessible, responsive
React + Tailwind conventions — plus the MCP tools used during development.

It was authored for this project (inspired by community React/MCP powers such as
[praveenc/kiro-powers](https://github.com/praveenc/kiro-powers)) rather than
installed from a third party, so its contents are reviewed and trusted.

## What's included

### Skills (`skills/`)

| Skill | Purpose |
| --- | --- |
| `architecture` | Layered design (domain / storage / state / UI) and rules for changes |
| `domain-rules` | Task, tag, habit, streak, and statistics rules (matches the spec) |
| `frontend-conventions` | Component, form/validation, accessibility, and styling patterns |

### MCP servers (`mcp.json`)

| Server | Purpose |
| --- | --- |
| `fetch` (`uvx mcp-server-fetch`) | Retrieve up-to-date docs from URLs during development |
| `git` (`uvx mcp-server-git`) | Read local repository status, history, and diffs |

The same two servers are also registered at the workspace level in
`.kiro/settings/mcp.json` so they are available across the project.

## Activating

Mention project keywords in chat and Kiro loads this power's context on demand,
e.g. "add a feature to the task habit tracker", "update the habit streak logic",
or "style this component with Tailwind". Keywords are defined in `plugin.json`.

## Requirements

- [uv / uvx](https://docs.astral.sh/uv/) available on PATH (for the MCP servers).
- Node.js 18+ for the app itself.
