# Buglog v1.0.0 — Functional Requirements

## Overview

Buglog is a browser-only QA tracking tool. It stores all data locally in the browser using sql.js (SQLite via WebAssembly) with OPFS for persistence. No server, no account, no network dependency after the initial page load.

---

## REQ-001 — Project Management

- The user can create a new project by entering a name and confirming.
- Created projects appear in a Project dropdown on every page that has one.
- Projects persist across page reloads and browser restarts.
- Project names must be non-empty.

## REQ-002 — Build Management

- The user can create a new build scoped to the currently selected project.
- Created builds appear in a Build dropdown on the same page.
- Selecting a different project resets the Build dropdown to its available builds.
- Builds persist across page reloads and browser restarts.
- Build names must be non-empty.

## REQ-003 — Test Case Management

- A test case can only be added when a project and build are both selected.
- The form captures all 9 fields in order: Test Case ID, Title, Preconditions, Steps, Expected Result, Actual Result, Status, Priority, Notes.
- Test Case ID format: `TC_AAA_XXX` (e.g. `TC_LOG_001`). Field is optional — left blank if not assigned.
- Title is required; all other fields are optional.
- Status values: Not Run (default), Passed, Failed, Blocked.
- Priority values: P0 — High, P1 — Medium (default), P2 — Low.
- After submission, the test case appears in the test case table without a page reload.
- The table displays: Test Case ID, Title, Priority, Status.
- Test cases are scoped to the selected build — switching builds shows only that build's test cases.
- Test case data persists across page reloads.

## REQ-004 — Defect Management

- A defect can only be reported when a project and build are both selected.
- The form captures all 12 fields in order: Defect ID, Status, Severity, Priority, Defect Description, Expected Result, Actual Result, Steps to Reproduce, Date Raised, Date Closed, Reference, Screenshot.
- Date Raised is set automatically to today's date at the time of submission.
- Defect ID format: `D_XXX` (e.g. `D_001`). Field is optional.
- Status values: Open (default), In Progress, Resolved, Closed.
- Severity values: Blocker, Critical, Major (default), Minor.
- Priority values: P0 — High, P1 — Medium (default), P2 — Low.
- After submission, the defect appears in the defect table without a page reload.
- The table displays: Defect ID, Description, Severity, Priority, Status.
- Defects are scoped to the selected build — switching builds shows only that build's defects.
- Defect data persists across page reloads.

## REQ-005 — Dashboard

- The dashboard displays a Project and Build selector.
- When a build is selected, four stat cards update to show the count of test cases with status: Passed, Failed, Blocked, Not Run.
- The dashboard displays a Recent Defects table showing the 5 most recently reported defects for the selected build: Defect ID, Description, Severity, Status.
- Stat cards and the recent defects table show placeholder values (— or 0) when no build is selected.
- Stat cards and the recent defects table update immediately when the build selection changes.

## REQ-006 — Metrics Page

- The metrics page displays a Project and Build selector.
- When a build is selected, execution stat cards show:
  - % Executed (test cases with any status other than Not Run, as a percentage of total)
  - % Passed
  - % Failed
  - % Blocked
- A doughnut chart renders test execution breakdown by status using Chart.js.
- Defect analysis cards show: Total Defects, Open Defects, Average Defect Age (days), Oldest Open Defect (days).
- A doughnut chart renders defect breakdown by severity using Chart.js.
- All values update when the build selection changes.
- Cards show — when no build is selected or no data exists.

## REQ-007 — Settings

- The settings page allows the user to customise: Test Case Status values, Priority values, Severity values, Defect Status values.
- Each setting is a textarea with one value per line.
- Changes are saved to localStorage when the user clicks Save Settings.
- Saved values persist across page reloads.
- A Reset to Defaults button restores all settings to the standard values defined below.
- Saved status/priority/severity values do not retroactively affect existing records — they only affect the dropdowns for new entries.

**Default values:**

| Setting | Defaults |
|---|---|
| Test Case Status | Not Run, Passed, Failed, Blocked |
| Priority | P0 — High, resolve immediately / P1 — Medium, resolve ASAP for next build / P2 — Low, resolve in any future version |
| Severity | Blocker — Cannot proceed further in test cycle / Critical — Main function not working, breaks user flow / Major — Causes undesirable behaviour but still functional / Minor — Will not cause breakdown of flow |
| Defect Status | Open, In Progress, Resolved, Closed |

## REQ-008 — Data Persistence

- All project, build, test case, and defect data persists across page reloads in both `file://` (local development) and HTTPS (deployed on Netlify) environments.
- Persistence is implemented via OPFS (Origin Private File System): the sql.js database binary is saved to OPFS after every write operation and reloaded on page init.
- Settings persist via localStorage independently of the main database.
- Data is not shared between different browsers or devices.

## REQ-009 — Error Handling

- If sql.js or its WASM binary fails to load, a visible error message is shown on the page. The app does not silently fail.
- If a form is submitted without a project/build selected, submission is prevented and the user is informed.
- If a required field (Title for test cases) is empty, submission is prevented by standard HTML5 form validation.

## REQ-010 — Confirmation Messages

- All create and save actions display a styled success message that auto-hides after 2 seconds.
- Covered actions: adding a project, adding a build, adding a test case, updating a test case, reporting a defect, updating a defect, saving settings, resetting settings to defaults.
- Changing the project or build selection displays a confirmation message showing the new selection name.

## REQ-011 — Cross-Page Selection Persistence

- The selected project and build persist across page navigation via localStorage.
- When a project is selected, the latest build for that project is auto-selected.
- On page load, the previously selected project and build are restored and their data is displayed automatically.
- Selecting a different project clears the stored build selection.

## REQ-012 — Test Case Detail and Edit

- Clicking a row in the test case table expands an inline detail view showing all 9 fields.
- Clicking the same row again, or clicking Close, collapses the detail view.
- Only one detail row is open at a time — opening a new one closes any existing one.
- An Edit button within the detail view switches to an editable form pre-filled with current values.
- Saving an edit updates the record in place and returns to the read-only detail view.
- Cancel reverts to the read-only view without saving.

## REQ-013 — Defect Detail and Edit

- Same expand/collapse and inline edit behaviour as REQ-012, applied to the defects table.
- The edit form includes Date Raised (editable) and Date Closed (optional).
- Date Raised defaults to today on the add form.
- Date Closed is stored when provided and displayed in the detail view and Markdown export.

## REQ-014 — Defect Reference Autocomplete

- The Reference field on the defect form offers autocomplete suggestions drawn from existing test case IDs for the currently selected build.
- The field still accepts manual free-text entry.
- Suggestions update when the build selection changes.

## REQ-015 — Build Version in Defect List

- The defects table includes a Build column showing the name of the currently selected build.

## REQ-016 — Markdown Export

- The Dashboard provides an Export as Markdown button, visible only when a build is selected.
- Clicking it downloads a `.md` file containing the project name, build name, a full test cases table, and a full defects table for that build.
- The Settings page provides an Export All Data as Markdown button.
- Clicking it downloads a single `buglog_export.md` file containing all projects and builds, separated by horizontal rules.
