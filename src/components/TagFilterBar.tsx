// Feature: task-habit-tracker
// UI component: TagFilterBar — multi-select tag filters with a no-match
// indication (R5.2, R6).
//
// The bar is a controlled component: the parent owns the transient filter
// selection (`selectedTags`) and is notified of changes via `onChange`. It
// renders one native, labeled `<input type="checkbox">` per available tag so
// every filter is keyboard-reachable, Space-activatable, and exposes a
// programmatic label (R14, R15). Available options are exactly the distinct
// tags currently in use, supplied by the caller from `availableTags(state)`
// (R5.2).
//
// The component also derives the no-match indication: when a non-empty
// selection matches zero tasks (per `filterTasksByTags`, an AND/superset
// match), it renders an explicit "no tasks match" message (R6.3). An empty
// selection matches all tasks and shows no such message (R6.2); a non-empty
// selection that matches at least one task likewise shows none (R6.1).

import type { Task } from '../domain/types';
import { filterTasksByTags } from '../domain/tags';

export interface TagFilterBarProps {
  /** The full set of tasks the filter is applied against (for match detection). */
  tasks: Task[];
  /** The currently selected tag filters (transient view state, owned by parent). */
  selectedTags: string[];
  /** The distinct tags available as filter options, from `availableTags(state)`. */
  availableTags: string[];
  /** Called with the next selection whenever a tag checkbox is toggled. */
  onChange: (selectedTags: string[]) => void;
}

/** Text shown when a non-empty selection matches no tasks (R6.3). */
export const NO_MATCH_MESSAGE = 'No tasks match the selected tags';

/**
 * Multi-select tag filter bar. Renders a labeled checkbox for each available
 * tag and a no-match indication when a non-empty selection matches zero tasks.
 */
export function TagFilterBar({
  tasks,
  selectedTags,
  availableTags,
  onChange,
}: TagFilterBarProps): JSX.Element {
  const selected = new Set(selectedTags);

  const toggle = (tag: string, checked: boolean): void => {
    if (checked) {
      // Add the tag if not already present, preserving option order.
      if (selected.has(tag)) return;
      onChange(availableTags.filter((t) => selected.has(t) || t === tag));
    } else {
      // Remove the tag.
      onChange(selectedTags.filter((t) => t !== tag));
    }
  };

  // A non-empty selection that matches no task drives the no-match indication
  // (R6.3). An empty selection matches all tasks, so it is never a no-match.
  const noMatch =
    selectedTags.length > 0 &&
    filterTasksByTags(tasks, selectedTags).length === 0;

  return (
    <section aria-label="Filter tasks by tag" className="tag-filter-bar">
      {availableTags.length === 0 ? (
        <p className="tag-filter-empty">No tags available</p>
      ) : (
        <ul className="tag-filter-options">
          {availableTags.map((tag) => {
            const inputId = `tag-filter-${tag}`;
            return (
              <li key={tag}>
                <input
                  type="checkbox"
                  id={inputId}
                  checked={selected.has(tag)}
                  onChange={(e) => toggle(tag, e.target.checked)}
                />
                <label htmlFor={inputId}>{tag}</label>
              </li>
            );
          })}
        </ul>
      )}
      {noMatch ? (
        <p role="status" className="tag-filter-no-match">
          {NO_MATCH_MESSAGE}
        </p>
      ) : null}
    </section>
  );
}
