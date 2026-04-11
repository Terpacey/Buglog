# Buglog

A browser-only QA tracking tool for logging test cases and defects. Demonstrates QA methodology. Playwright tests pending.

All data is stored locally in the browser using sql.js (SQLite compiled to WebAssembly) with OPFS for persistence. No server, no account, no sign-up required.

**Features**
- Create projects and builds to scope your test effort
- Log test cases with full fields: ID, title, preconditions, steps, expected/actual results, status, priority, notes
- Report defects with severity, priority, reference to test cases, dates, and steps to reproduce
- Dashboard with live stat cards and a recent defects summary
- Metrics page with execution and defect analysis, including Chart.js visualisations
- Inline row expansion and editing for test cases and defects
- Markdown export per build, or all data at once
- Customisable status, severity, and priority values via Settings

**Tech stack:** HTML/CSS/JS — no framework, no bundler. sql.js + OPFS. Hosted on Netlify.

## Live Demo

https://buglogqa.netlify.app/
