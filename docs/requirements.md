# Buglog v1.0.0 — Functional Requirements

## Overview

Buglog is a browser-only QA tracking tool. It stores all data locally in the browser using sql.js (SQLite via WebAssembly) and IndexedDB for persistence. No server, no account, no network dependency after the initial page load.

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
- The form captures all 10 fields in order: Defect ID, Status, Severity, Priority, Defect Description, Expected Result, Actual Result, Steps to Reproduce, Reference, Screenshot.
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
