# Requirements Document

## Introduction

This document defines the requirements for the Data Export & Import feature of the personal Task & Habit Tracker web application. This is a follow-on specification that builds directly on the foundational task and habit tracking capabilities defined in `.kiro/specs/task-habit-tracker/`. It lets a single user back up their data to a downloadable file and restore it later, entirely client-side with no backend server.

This specification covers three capabilities: exporting the complete current application state (tasks, tags, and habits, together with the schema version) to a downloadable JSON file; importing a previously exported file to restore that data; and validating imported files so that invalid or corrupt input never destroys existing data. Reminders, notifications, and external integrations remain out of scope, as in the foundational specification.

The feature preserves the existing architecture: React and TypeScript with Vite, a pure domain layer, a localStorage-backed storage layer (Storage_Manager), and a reducer-plus-context state layer, with native-HTML UI components styled with Tailwind CSS v4. The following design constraints apply and are noted here so that later phases honor them:

- **Reuse the existing schema.** Export and import MUST reuse the existing AppState type and the storage layer's schema and version validation. This feature MUST NOT introduce a second, divergent schema; the exported document is the same AppState shape (including its `version` field) that the Storage_Manager already persists and validates.
- **Keep pure logic pure.** Serialization, parsing, and validation logic MUST live in the pure domain or storage layer as pure functions. DOM and file APIs (Blob creation, download triggering, and file reading) MUST remain at the UI edge.
- **Follow project standards.** The export and import controls MUST follow the project's UI/UX steering (accessible, responsive, Tailwind CSS v4 on native semantic HTML per `.kiro/steering/ui-ux-standards.md`) and the existing frontend conventions, and MUST be added into the existing App composition without disrupting current components.
- **Testing direction (for later phases).** A property-based round-trip test (using fast-check) SHALL cover export-then-import equivalence, complemented by example-based tests confirming that invalid or corrupt import payloads leave existing state unchanged.

## Glossary

- **App**: The Task & Habit Tracker web application as a whole, running in the user's browser.
- **AppState**: The complete persisted application state — the single source of truth — comprising the schema version, all Tasks, and all Habits, where Tags are modeled as normalized names inline on Tasks.
- **Schema_Version**: The integer version field of the AppState that identifies the schema the data conforms to, used by the Storage_Manager for validation and future migrations.
- **Task**: A unit of work with a title, an optional due date, optional tags, a status, and (once completed) a completion timestamp, as defined in the foundational specification.
- **Tag**: A user-defined label associated with one or more Tasks, modeled as a normalized name inline on Tasks rather than as a separate persisted entity.
- **Habit**: A recurring activity with a name, a target frequency, and a completion history, as defined in the foundational specification.
- **Export_Manager**: The component responsible for serializing the current AppState to a JSON document and triggering a browser download of that document as a file.
- **Import_Manager**: The component responsible for reading a user-selected file, validating its contents against the AppState schema, and replacing the current application state with the imported data.
- **Storage_Manager**: The component responsible for persisting and restoring AppState using browser localStorage, and the owner of the AppState schema and version validation reused by this feature.
- **Local_Storage**: The browser localStorage mechanism used to persist application data on the user's device.
- **Export_Control**: The interactive user-interface control that the user activates to initiate an export.
- **Import_Control**: The interactive user-interface control that the user operates to select a file and initiate an import.
- **Export_File**: The JSON document produced by the Export_Manager and downloaded by the user, containing a serialized AppState.
- **Import_File**: The file the user selects for import, whose contents the Import_Manager parses and validates.
- **Current_Day**: The current calendar date as determined by the user's local system clock.

## Requirements

### Requirement 1: Export Application State

**User Story:** As a user, I want to export all of my tasks, tags, and habits to a downloadable file, so that I can keep a backup of my data.

#### Acceptance Criteria

1. WHEN the user activates the Export_Control, THE Export_Manager SHALL serialize the complete current AppState, comprising the Schema_Version, all Tasks, all Tags, and all Habits, to a JSON document.
2. WHEN the Export_Manager has serialized the AppState to a JSON document, THE Export_Manager SHALL trigger a browser download of that JSON document as an Export_File.
3. WHEN the Export_Manager triggers the download, THE Export_Manager SHALL name the Export_File with a fixed application-identifying prefix, followed by the Current_Day formatted as an ISO 8601 calendar date (YYYY-MM-DD), followed by a `.json` extension.
4. IF the Export_Manager cannot serialize the AppState or cannot trigger the browser download, THEN THE Export_Manager SHALL leave the current AppState unchanged and display a non-blocking error indicating that the export could not be completed.

### Requirement 2: Import Application State

**User Story:** As a user, I want to import a previously exported file, so that I can restore my tasks, tags, and habits.

#### Acceptance Criteria

1. WHEN the user selects an Import_File no larger than 10 megabytes through the Import_Control AND the Import_File contains a schema-valid AppState, THE Import_Manager SHALL replace the current in-memory AppState with the imported AppState.
2. WHEN the Import_Manager replaces the current in-memory AppState with a schema-valid imported AppState, THE Import_Manager SHALL persist the imported AppState to Local_Storage through the Storage_Manager.
3. IF the selected Import_File cannot be read, is not valid JSON, is larger than 10 megabytes, or does not parse into a schema-valid AppState, THEN THE Import_Manager SHALL leave the current AppState unchanged in memory and in Local_Storage, and display a non-blocking error indicating that the file could not be imported.
4. IF persisting the imported AppState to Local_Storage through the Storage_Manager fails, THEN THE Import_Manager SHALL restore the current in-memory AppState to the value it held before the replacement and display a non-blocking error indicating that the import could not be saved.

### Requirement 3: Confirm Before Replacing Data

**User Story:** As a user, I want to confirm before an import overwrites my current data, so that I do not lose data by accident.

#### Acceptance Criteria

1. WHEN the user selects a schema-valid Import_File AND the current AppState contains at least one Task or Habit, THE Import_Manager SHALL request confirmation from the user before replacing the current AppState.
2. WHEN the user selects a schema-valid Import_File AND the current AppState contains no Tasks and no Habits, THE Import_Manager SHALL apply the imported AppState without requesting confirmation.
3. WHEN the user confirms the replacement, THE Import_Manager SHALL replace the current in-memory AppState with the imported AppState and persist the imported AppState to Local_Storage through the Storage_Manager.
4. IF the user cancels or dismisses the confirmation, THEN THE Import_Manager SHALL leave the current AppState unchanged in memory and in Local_Storage.

### Requirement 4: Validate Imported Data

**User Story:** As a user, I want imported files checked before they are applied, so that a bad file cannot corrupt or erase my data.

#### Acceptance Criteria

1. WHEN the Import_Manager receives the contents of an Import_File, THE Import_Manager SHALL parse those contents as JSON and validate the parsed result against the same AppState schema and Schema_Version used by the Storage_Manager, completing this validation before it applies any part of the contents to the current AppState.
2. IF the parsed contents of the Import_File do not conform to the AppState schema or the parsed Schema_Version does not equal the Schema_Version used by the Storage_Manager, THEN THE Import_Manager SHALL reject the import, leave the current AppState unchanged in memory and in Local_Storage, and display a non-blocking error indicating that the file could not be imported.
3. IF the contents of the Import_File cannot be parsed as JSON, THEN THE Import_Manager SHALL reject the import before applying any contents and leave the current AppState unchanged in memory and in Local_Storage.
4. WHEN the Export_Manager serializes an AppState to an Export_File and the Import_Manager subsequently imports that Export_File, THE Import_Manager SHALL reconstruct an AppState that equals the original AppState in its Schema_Version, its complete set of Tasks (including each Task's inline Tags), and its complete set of Habits.

### Requirement 5: Keyboard Accessibility of Export and Import Controls

**User Story:** As a user who relies on a keyboard, I want to operate the export and import controls without a mouse, so that I can back up and restore my data fully.

#### Acceptance Criteria

1. THE App SHALL place the Export_Control and the Import_Control in the sequential focus order such that each is reachable by pressing Tab moving focus forward and Shift+Tab moving focus backward, in an order that matches their visual reading order.
2. WHEN the Export_Control or the Import_Control receives keyboard focus, THE App SHALL display a focus indicator on that control that remains continuously visible for as long as the control holds focus and that meets the WCAG 2.1 AA contrast requirement (contrast ratio of at least 3:1 against adjacent colors).
3. WHEN the focused Export_Control or Import_Control is activated using the Enter key or the Space key, THE App SHALL perform the same action that a pointer click on that control performs.
4. WHILE either the Export_Control or the Import_Control holds keyboard focus, THE App SHALL allow the user to move focus away from that control using the Tab and Shift+Tab keys without requiring any pointer input, so that no keyboard focus trap occurs.

### Requirement 6: Accessible Labels for Export and Import Controls

**User Story:** As a user who relies on assistive technology, I want the export and import controls labeled, so that I can understand and operate each control.

#### Acceptance Criteria

1. THE App SHALL expose to assistive technology a non-empty accessible label for the Export_Control whose text conveys that the control initiates an export of the user's data.
2. THE App SHALL expose to assistive technology a non-empty accessible label for the Import_Control whose text conveys that the control selects a file and initiates an import of the user's data.
3. THE App SHALL make the accessible label of the Export_Control distinct from the accessible label of the Import_Control so that the two controls are distinguishable by assistive technology.
4. WHILE the Export_Control or the Import_Control is enabled, disabled, or focused, THE App SHALL keep that control's accessible label present and unchanged.
