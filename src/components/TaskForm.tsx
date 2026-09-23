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
    <form onSubmit={handleSubmit} noValidate aria-label={isEdit ? 'Edit task' : 'Create task'}>
      <div>
        <label htmlFor={titleId}>Title</label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? titleErrorId : undefined}
        />
        {errors.title && (
          <p id={titleErrorId} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={dueDateId}>Due date</label>
        <input
          id={dueDateId}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-invalid={errors.dueDate ? true : undefined}
          aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
        />
        {errors.dueDate && (
          <p id={dueDateErrorId} role="alert">
            {errors.dueDate}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={tagsId}>Add tag</label>
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
        />
        <button type="button" onClick={handleAddTag}>
          Add tag
        </button>
        {errors.tags && (
          <p id={tagsErrorId} role="alert">
            {errors.tags}
          </p>
        )}
        {tags.length > 0 && (
          <ul aria-label="Selected tags">
            {tags.map((tag) => (
              <li key={tag}>
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit">{isEdit ? 'Save task' : 'Add task'}</button>
    </form>
  );
}
