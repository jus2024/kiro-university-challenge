// Feature: task-habit-tracker
// UI: the create/edit task form.
//
// A native <form> with labeled title, due-date, and tag inputs. On submit it
// runs the shared domain validators (validateTaskTitle, validateDueDate,
// validateTagsForTask). If any field is invalid the submission is rejected, the
// entered values are retained, and a validation error is rendered adjacent to
// the offending field (R1.3, R1.4, R1.5, R1.6, R3.3) — no action is dispatched.
// On success it dispatches EDIT_TASK when editing an existing task (a `task`
// prop is supplied) or CREATE_TASK otherwise (R1.1, R3.1), and clears the form
// in create mode. Every input is associated with a <label> via htmlFor/id so it
// is reachable by its accessible name (R15.1).

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import type { Task } from '../domain/types';
import {
  validateDueDate,
  validateTagsForTask,
  validateTaskTitle,
} from '../domain/validation';
import { useApp } from '../state/AppContext';

export interface TaskFormProps {
  /**
   * When provided the form operates in edit mode: fields are prefilled from the
   * task and a valid submit dispatches EDIT_TASK. When omitted the form is in
   * create mode and dispatches CREATE_TASK.
   */
  task?: Task;
  /** Optional callback invoked after a successful submit (e.g. close an editor). */
  onSubmitted?: () => void;
}

/** Field-keyed validation messages surfaced adjacent to their input. */
interface FieldErrors {
  title?: string;
  dueDate?: string;
  tags?: string;
}

// Shared utility class strings keep inputs/labels/buttons visually consistent.
const labelClass = 'block text-sm font-medium text-slate-700';
const inputClass =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 aria-[invalid=true]:border-red-500';
const errorClass = 'mt-1 text-sm text-red-600';
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50';

export default function TaskForm({ task, onSubmitted }: TaskFormProps) {
  const { dispatch } = useApp();
  const isEdit = task !== undefined;

  // Controlled field state, prefilled from the task in edit mode.
  const [title, setTitle] = useState<string>(task?.title ?? '');
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ?? '');
  const [tags, setTags] = useState<string[]>(task ? [...task.tags] : []);
  const [tagDraft, setTagDraft] = useState<string>('');
  const [errors, setErrors] = useState<FieldErrors>({});

  // Stable, unique ids so each control is programmatically associated with its
  // <label> and its error message (R15.1).
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const titleErrorId = `${baseId}-title-error`;
  const dueDateId = `${baseId}-dueDate`;
  const dueDateErrorId = `${baseId}-dueDate-error`;
  const tagsId = `${baseId}-tags`;
  const tagsErrorId = `${baseId}-tags-error`;

  /**
   * Add the current tag draft to the tag list after validating it against the
   * existing tags (valid name, distinct, and fewer than 20). On failure the
   * error is shown adjacent to the tags field and the list is left unchanged
   * (R1.6). On success the draft is cleared.
   */
  function handleAddTag() {
    const result = validateTagsForTask(tags, tagDraft);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, tags: result.errors[0].message }));
      return;
    }
    setTags(result.value);
    setTagDraft('');
    setErrors((prev) => ({ ...prev, tags: undefined }));
  }

  /** Remove a previously added tag from the list. */
  function handleRemoveTag(name: string) {
    setTags((prev) => prev.filter((t) => t !== name));
    setErrors((prev) => ({ ...prev, tags: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    const titleResult = validateTaskTitle(title);
    if (!titleResult.ok) {
      nextErrors.title = titleResult.errors[0].message;
    }

    // An empty due-date input means "no due date".
    const dueRaw = dueDate.trim() === '' ? null : dueDate;
    const dueResult = validateDueDate(dueRaw);
    if (!dueResult.ok) {
      nextErrors.dueDate = dueResult.errors[0].message;
    }

    // Re-validate the committed tag list defensively (distinct + <=20). Each
    // tag was validated on add, so this normally passes; it guards against any
    // stale invalid entry before we build the action payload.
    let validatedTags: string[] = [];
    let tagsValid = true;
    for (const tag of tags) {
      const step = validateTagsForTask(validatedTags, tag);
      if (!step.ok) {
        nextErrors.tags = step.errors[0].message;
        tagsValid = false;
        break;
      }
      validatedTags = step.value;
    }

    if (nextErrors.title || nextErrors.dueDate || !tagsValid) {
      // Reject: retain entered values and render errors adjacent to fields.
      setErrors(nextErrors);
      return;
    }

    if (isEdit && task) {
      dispatch({
        type: 'EDIT_TASK',
        taskId: task.id,
        patch: {
          title: titleResult.ok ? titleResult.value : title,
          dueDate: dueResult.ok ? dueResult.value : null,
          tags: validatedTags,
        },
      });
    } else {
      dispatch({
        type: 'CREATE_TASK',
        input: {
          title,
          dueDate: dueRaw,
          tags: validatedTags,
        },
      });
      // Clear the form after a successful create.
      setTitle('');
      setDueDate('');
      setTags([]);
      setTagDraft('');
    }

    setErrors({});
    onSubmitted?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={isEdit ? 'Edit task' : 'Create task'}
      className="space-y-4"
    >
      <div>
        <label htmlFor={titleId} className={labelClass}>
          Title
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? titleErrorId : undefined}
          className={inputClass}
        />
        {errors.title && (
          <p id={titleErrorId} role="alert" className={errorClass}>
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={dueDateId} className={labelClass}>
          Due date
        </label>
        <input
          id={dueDateId}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
          className={inputClass}
        />
        {errors.dueDate && (
          <p id={dueDateErrorId} role="alert" className={errorClass}>
            {errors.dueDate}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={tagsId} className={labelClass}>
          Add tag
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id={tagsId}
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter within the tag input adds the tag rather than submitting
              // the whole form.
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            aria-invalid={errors.tags ? true : undefined}
            aria-describedby={errors.tags ? tagsErrorId : undefined}
            className={`${inputClass} mt-0 sm:flex-1`}
          />
          <button
            type="button"
            onClick={handleAddTag}
            className={secondaryButtonClass}
          >
            Add tag
          </button>
        </div>
        {errors.tags && (
          <p id={tagsErrorId} role="alert" className={errorClass}>
            {errors.tags}
          </p>
        )}
        {tags.length > 0 && (
          <ul aria-label="Selected tags" className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-1 pl-3 pr-1 text-sm font-medium text-blue-800"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-blue-700 transition-colors hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className={primaryButtonClass}>
        {isEdit ? 'Save task' : 'Add task'}
      </button>
    </form>
  );
}
