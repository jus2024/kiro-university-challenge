# Requirements Document

## Introduction

This document defines the requirements for the core feature of a personal Task & Habit Tracker web application. The application is a single-user, fully client-side web app that lets a person capture tasks, organize them with tags, track daily habits, and view progress over time.

This first specification covers the foundational task and habit tracking capabilities: creating and managing tasks, organizing and filtering tasks with tags, defining and checking off habits, viewing simple progress statistics, and persisting all data locally so nothing is lost on reload. The application is built with React and TypeScript using Vite, persists data to browser localStorage, uses plain CSS or CSS modules for styling, and uses Vitest for unit tests. The architecture is intended to remain simple and modular so that later specifications (reminders, notifications, data export, and external integrations) can build on it.

Reminders, notifications, and external integrations are explicitly out of scope for this specification and will be addressed in later specifications. No backend server is involved; everything runs client-side.

## Glossary

- **App**: The Task & Habit Tracker web application as a whole, running in the user's browser.
- **Task_Manager**: The component responsible for creating, editing, completing, and deleting tasks.
- **Task**: A unit of work with a title, an optional due date, optional tags, a status, and (once completed) a completion timestamp.
- **Task_Status**: The state of a task, one of "open" or "done".
- **Task_Title**: The user-provided name of a Task, which after trimming leading and trailing whitespace must contain 1 to 200 characters.
- **Tag**: A user-defined label whose name, after trimming, contains 1 to 50 characters, that can be associated with one or more tasks and used as a filter. A single Task may have at most 20 associated Tags.
- **Tag_Filter**: The component that restricts the displayed tasks based on selected tags.
- **Habit**: A recurring activity with a name, a target frequency, and a completion history.
- **Habit_Name**: The user-provided name of a Habit, which after trimming leading and trailing whitespace must contain 1 to 100 characters.
- **Target_Frequency**: The intended cadence for a habit (for this specification, "daily").
- **Habit_Tracker**: The component responsible for creating habits and recording daily completions.
- **Completion_Record**: A dated entry indicating that a habit was completed on a specific calendar date; at most one Completion_Record exists per Habit per calendar date.
- **Current_Streak**: The count of consecutive calendar days, ending on and including the Current_Day, on which a Habit has a Completion_Record, expressed as an integer that is 0 when the Current_Day has no Completion_Record.
- **Completion_Rate**: For a Habit, the number of days with a Completion_Record over the last 7 calendar days ending on the Current_Day divided by 7, expressed as a whole-number percentage from 0 to 100 rounded to the nearest whole percent.
- **Calendar_Week**: A seven-day period that begins on Monday and ends on Sunday in the user's local time zone.
- **Progress_View**: The component that displays task completion statistics and habit progress.
- **Storage_Manager**: The component responsible for persisting and restoring application data using browser localStorage.
- **Local_Storage**: The browser localStorage mechanism used to persist application data on the user's device.
- **Current_Day**: The current calendar date as determined by the user's local system clock.

## Requirements

### Requirement 1: Create Tasks

**User Story:** As a user, I want to create tasks with a title and optional details, so that I can capture work I need to do.

#### Acceptance Criteria

1. WHEN the user submits the new-task form with a Task_Title that is 1 to 200 characters after trimming, a valid optional due date, and optional Tags that satisfy the Tag constraints, THE Task_Manager SHALL create a Task with that title, the due date, the Tags, and a Task_Status of "open".
2. WHEN a Task is created, THE Task_Manager SHALL add the created Task to the task list.
3. IF the user submits the new-task form with a title that is empty or contains only whitespace after trimming, THEN THE Task_Manager SHALL reject the submission, retain the entered form values, and display a validation error adjacent to the title field.
4. IF the user submits the new-task form with a title that exceeds 200 characters after trimming, THEN THE Task_Manager SHALL reject the submission, retain the entered form values, and display a validation error adjacent to the title field.
5. IF the user submits the new-task form with a due date that is not a valid date, THEN THE Task_Manager SHALL reject the submission, retain the entered form values, and display a validation error adjacent to the due date field.
6. IF the user submits the new-task form with more than 20 Tags or with any Tag whose name is empty or exceeds 50 characters after trimming, THEN THE Task_Manager SHALL reject the submission, retain the entered form values, and display a validation error describing the invalid Tags.

### Requirement 2: Complete Tasks

**User Story:** As a user, I want to mark tasks as complete, so that I can track what I have finished.

#### Acceptance Criteria

1. WHEN the user marks an open Task as complete, THE Task_Manager SHALL set the Task_Status to "done".
2. WHEN the user marks an open Task as complete, THE Task_Manager SHALL record the completion timestamp.
3. WHEN a Task is marked complete, THE Task_Manager SHALL persist the updated Task to Local_Storage.
4. IF the user marks a Task that is already "done", THEN THE Task_Manager SHALL leave the existing completion timestamp unchanged.

### Requirement 3: Edit Tasks

**User Story:** As a user, I want to edit a task's details, so that I can keep task information accurate.

#### Acceptance Criteria

1. WHEN the user edits a Task's title, due date, or tags with valid values, THE Task_Manager SHALL save the updated values to Local_Storage.
2. WHEN the updated values are saved, THE Task_Manager SHALL display the updated values in the task list.
3. IF the user edits a Task's title to an empty, whitespace-only, or over-200-character value, THEN THE Task_Manager SHALL reject the change, retain the previous values, and display a validation error adjacent to the title field.

### Requirement 4: Delete Tasks

**User Story:** As a user, I want to delete tasks with a confirmation step, so that I can remove tasks without accidental loss.

#### Acceptance Criteria

1. WHEN the user deletes a Task, THE Task_Manager SHALL request confirmation before removing the Task.
2. WHEN the user confirms the deletion, THE Task_Manager SHALL remove the Task from the task list.
3. WHEN the user confirms the deletion, THE Task_Manager SHALL remove the Task from Local_Storage.
4. IF the user cancels the deletion, THEN THE Task_Manager SHALL retain the Task in the task list and in Local_Storage.

### Requirement 5: Tag Tasks

**User Story:** As a user, I want to add tags to tasks, so that I can organize related tasks together.

#### Acceptance Criteria

1. WHEN the user adds a Tag with a non-empty name of 1 to 50 characters to a Task that has fewer than 20 associated Tags and does not already have that Tag, THE Task_Manager SHALL associate that Tag with the Task.
2. WHEN a Tag is associated with a Task, THE Tag_Filter SHALL make that Tag available as a filter option.
3. IF the user attempts to add a Tag whose name is empty or exceeds 50 characters, THEN THE Task_Manager SHALL reject the operation, leave the Task's existing Tags unchanged, and provide an error indication describing the invalid Tag name.
4. IF the user attempts to add a Tag that is already associated with the Task, THEN THE Task_Manager SHALL reject the operation and leave the Task's existing Tags unchanged.
5. IF the user attempts to add a Tag to a Task that already has 20 associated Tags, THEN THE Task_Manager SHALL reject the operation, leave the Task's existing Tags unchanged, and provide an error indication that the maximum Tag limit has been reached.

### Requirement 6: Filter Tasks by Tag

**User Story:** As a user, I want to filter tasks by tags, so that I can focus on a specific subset of tasks.

#### Acceptance Criteria

1. WHEN the user selects 1 to 20 Tag filters, THE Tag_Filter SHALL display only the Tasks that are associated with all selected Tags.
2. WHEN no Tag filter is selected, THE Tag_Filter SHALL display all Tasks.
3. IF the user selects one or more Tag filters and no Task is associated with all selected Tags, THEN THE Tag_Filter SHALL display zero Tasks and provide an indication that no Tasks match the selected Tags.

### Requirement 7: Create Habits

**User Story:** As a user, I want to define habits with a name and frequency, so that I can track recurring activities.

#### Acceptance Criteria

1. WHEN the user creates a Habit with a name containing 1 to 100 characters after trimming and a Target_Frequency, THE Habit_Tracker SHALL add the Habit to the habit list with an empty completion history.
2. IF the user submits the new-habit form with a name that is empty or only whitespace after trimming, THEN THE Habit_Tracker SHALL reject the submission, display a validation error adjacent to the name field, and retain the entered form values.
3. IF the user submits the new-habit form with a name exceeding 100 characters after trimming, THEN THE Habit_Tracker SHALL reject the submission, display a validation error adjacent to the name field, and retain the entered form values.
4. IF the user submits the new-habit form without a selected Target_Frequency, THEN THE Habit_Tracker SHALL reject the submission, display a validation error adjacent to the frequency field, and retain the entered form values.

### Requirement 8: Record Habit Completions

**User Story:** As a user, I want to check off a habit for today, so that I can record that I completed it.

#### Acceptance Criteria

1. WHEN the user checks off a Habit for the Current_Day, THE Habit_Tracker SHALL record exactly one Completion_Record dated the Current_Day for that Habit.
2. IF a Completion_Record already exists for the Habit on the Current_Day when the user checks it off, THEN THE Habit_Tracker SHALL retain a single Completion_Record for that date without creating a duplicate.
3. WHEN the user unchecks a Habit that has a Completion_Record for the Current_Day, THE Habit_Tracker SHALL remove that Completion_Record for the Current_Day.
4. IF the user unchecks a Habit that has no Completion_Record for the Current_Day, THEN THE Habit_Tracker SHALL leave the Habit's completion history unchanged.

### Requirement 9: Habit Streaks

**User Story:** As a user, I want to see my current streak for each habit, so that I stay motivated to keep it going.

#### Acceptance Criteria

1. WHILE the Current_Day has a Completion_Record for a Habit, THE Habit_Tracker SHALL calculate that Habit's Current_Streak as the count of consecutive calendar days, ending on and including the Current_Day, on which a Completion_Record exists.
2. IF the Current_Day has no Completion_Record for a Habit, THEN THE Habit_Tracker SHALL set that Habit's Current_Streak to 0.
3. THE Habit_Tracker SHALL display the Current_Streak as an integer value for each Habit, including a value of 0.

### Requirement 10: Task Progress Statistics

**User Story:** As a user, I want to see how many tasks I have completed, so that I can gauge my productivity.

#### Acceptance Criteria

1. WHEN the Progress_View is displayed, THE Progress_View SHALL display a daily count equal to the number of Tasks with a completion timestamp falling on the Current_Day in the user's local time zone.
2. WHEN the Progress_View is displayed, THE Progress_View SHALL display a weekly count equal to the number of Tasks with a completion timestamp falling within the calendar week that contains the Current_Day, where the calendar week begins on Monday and ends on Sunday in the user's local time zone.
3. IF no Tasks have a completion timestamp within the applicable period, THEN THE Progress_View SHALL display a count of 0 for that period.

### Requirement 11: Habit Progress Statistics

**User Story:** As a user, I want to see each habit's streak and recent completion rate, so that I can understand my consistency.

#### Acceptance Criteria

1. WHEN the Progress_View is displayed, THE Progress_View SHALL display the Current_Streak for each Habit as a whole number of consecutive days ending on the Current_Day.
2. WHEN the Progress_View is displayed, THE Progress_View SHALL display the Completion_Rate for each Habit as a whole-number percentage from 0 to 100 over the last 7 calendar days ending on the Current_Day, rounded to the nearest whole percent.
3. IF no Habits exist, THEN THE Progress_View SHALL display an empty-state indication that no Habits are being tracked.

### Requirement 12: Persist Data

**User Story:** As a user, I want my data saved locally, so that nothing is lost when I reload the application.

#### Acceptance Criteria

1. WHEN a Task, Tag, or Habit is created, modified, or deleted, THE Storage_Manager SHALL persist the complete current set of all Tasks, Tags, and Habits to Local_Storage.
2. IF writing to Local_Storage fails, THEN THE Storage_Manager SHALL retain the in-memory Tasks, Tags, and Habits unchanged and display a non-blocking warning indicating that data could not be saved.

### Requirement 13: Restore Data

**User Story:** As a user, I want my saved data restored on load, so that I can continue where I left off.

#### Acceptance Criteria

1. WHEN the App loads, THE Storage_Manager SHALL restore all previously saved Tasks, Tags, and Habits from Local_Storage and make them available to the App.
2. IF stored data cannot be read or fails to parse into valid Tasks, Tags, and Habits, THEN THE Storage_Manager SHALL initialize the App with an empty set of Tasks, Tags, and Habits and display a non-blocking warning indicating that saved data could not be restored.

### Requirement 14: Keyboard Accessibility

**User Story:** As a user who relies on a keyboard, I want to operate all controls without a mouse, so that I can use the application fully.

#### Acceptance Criteria

1. THE App SHALL make every interactive control reachable through sequential keyboard navigation using the Tab and Shift+Tab keys.
2. WHEN an interactive control receives keyboard focus, THE App SHALL render a visible focus indicator on that control.
3. WHEN a focused interactive control is activated using the Enter key or, for buttons and checkboxes, the Space key, THE App SHALL perform the same action that a pointer click on that control performs.

### Requirement 15: Accessible Labels

**User Story:** As a user who relies on assistive technology, I want labeled inputs and buttons, so that I can understand each control.

#### Acceptance Criteria

1. THE App SHALL provide a non-empty, programmatically associated accessible label for each form input.
2. THE App SHALL provide a non-empty accessible label, exposed to assistive technology, for each button.
