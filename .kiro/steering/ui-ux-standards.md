---
inclusion: fileMatch
fileMatchPattern: '**/*.{tsx,jsx,ts,css}'
---

# UI/UX Standards

Standards for all frontend work in this project. Build on the accessibility
requirements **R14 (keyboard operability)** and **R15 (accessible labels)** in
`.kiro/specs/task-habit-tracker/requirements.md`. Target **WCAG 2.1 AA**.

## Styling approach

- Use **Tailwind CSS v4 utility classes** on native semantic HTML elements.
- Do **not** add a component library or hand-write ad-hoc CSS when a Tailwind utility exists.
- Intent: consistent, purge-friendly, easy-to-review styling.

```tsx
// Good
<button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
  Save
</button>

// Bad — unstyled / inline styles
<button style={{ background: 'blue', color: 'white' }}>Save</button>
```

## Accessibility (WCAG 2.1 AA)

- Every input has an associated `<label>` (`htmlFor`/`id`) or an `aria-label`. No unlabeled inputs.
- Every button has an accessible name; icon-only buttons carry an `aria-label`.
- Interactive controls are **native elements**, reachable by Tab/Shift+Tab, activatable with Enter (and Space for buttons/checkboxes).
- A visible `:focus-visible` indicator is always present; never remove the outline without an equivalent replacement.
- Associate validation errors with their field via `aria-describedby`, and set `aria-invalid` on invalid fields.
- Meet AA color contrast (>= 4.5:1 for normal text).
- Intent: fully operable with keyboard and screen reader.

```tsx
// Good — label + error wired to the input
<label htmlFor="title">Title</label>
<input id="title" aria-invalid={!!error} aria-describedby={error ? 'title-err' : undefined} />
{error && <p id="title-err" role="alert">{error}</p>}

// Bad — no association between input and error
<input type="text" />
<div>{error}</div>
```

## Responsive, mobile-first design

- Design **mobile-first**: base classes target small screens; use `sm:`/`md:`/`lg:` to enhance larger screens.
- Fluid single column on mobile that expands to a centered, max-width, multi-section layout on larger screens.
- Touch targets large enough to tap comfortably (aim for ~44px min height).
- Avoid fixed pixel widths that cause horizontal scrolling on small screens.
- Intent: equally usable on phone and desktop.

```tsx
// Good — mobile-first, expands with breakpoints
<div className="flex flex-col gap-4 md:flex-row">…</div>

// Bad — fixed width, overflows small screens
<div className="w-[800px]">…</div>
```

## Interaction & visual consistency

- Interactive elements expose clear **hover**, **focus-visible**, and **disabled** states.
- Follow a consistent spacing and typography scale.
- Intent: predictable, legible, low-friction operation.

```tsx
// Good — feedback for every state
<button className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed">
  Add task
</button>

// Bad — no hover/focus/disabled feedback
<button className="bg-blue-600 text-white">Add task</button>
```
