# Frontend Conventions

How to build UI for the Task & Habit Tracker. This complements the always-on
steering in `.kiro/steering/ui-ux-standards.md` (WCAG 2.1 AA, responsive
mobile-first, Tailwind v4) with project-specific component patterns.

## Component patterns

- Components read state via the `useApp()` hook and dispatch typed `AppAction`s.
  They never mutate or own the canonical task/habit data.
- Keep only transient view state locally (form field values, dialog open/closed,
  selected tag filters).
- Capture the clock at the edge: when dispatching `COMPLETE_TASK`/`CHECK_HABIT`,
  pass `now`/`day` from the component so the reducer stays deterministic.

## Forms and validation

- Every form is a native `<form>` with labeled inputs (`<label htmlFor>` + `id`).
- Call the domain validators from `src/domain/validation.ts` on submit. On failure,
  **retain the entered values** and render the error adjacent to the offending
  field, wired with `aria-describedby` and `aria-invalid`.
- On success, dispatch the corresponding action; do not duplicate validation logic
  in the component — reuse the domain validators.

## Controls and accessibility

- Use native `<button>`, `<input type="checkbox">`, `<select>` so keyboard
  operability and Enter/Space activation come from the platform.
- Icon-only buttons (delete, check-off) carry an explicit `aria-label`.
- Destructive delete goes through `ConfirmDialog`; nothing is removed until the
  user confirms.
- Never remove the focus outline without an equivalent `:focus-visible` style.

## Styling

- Style with Tailwind v4 utility classes on native elements. Mobile-first base
  classes, enhanced with `sm:`/`md:`/`lg:`. No component library, no ad-hoc CSS
  where a utility exists.
- Expose hover, focus-visible, and disabled states on interactive elements; follow
  a consistent spacing and typography scale.

## Testing new UI

- Assert inputs are reachable via `getByLabelText` and buttons via
  `getByRole('button', { name })`.
- For new domain logic behind the UI, add a fast-check property test tagged
  `// Feature: task-habit-tracker, Property {n}: {text}` referencing design.md.
