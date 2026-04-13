// Shared data layer for all page scripts.
// Pages wait on .ready before querying database.
window.BuglogAPI = {};

// locateFile tells initSqlJs where to fetch the .wasm binary.
window.BuglogAPI.ready = initSqlJs({
  locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/${file}`
}).then(async SQL => {
  let db;

  // Attempt to find existing database from OPFS, on fail, creates fresh empty database.
  // Edge case: OPFS unavailable on file://
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('buglog.db');
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
  } catch {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS builds (
      id         INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL,
      name       TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS test_cases (
      id              INTEGER PRIMARY KEY,
      build_id        INTEGER NOT NULL,
      tc_id           TEXT,
      title           TEXT NOT NULL,
      preconditions   TEXT,
      steps           TEXT,
      expected_result TEXT,
      actual_result   TEXT,
      status          TEXT,
      priority        TEXT,
      notes           TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS defects (
      id                 INTEGER PRIMARY KEY,
      build_id           INTEGER NOT NULL,
      defect_id          TEXT,
      status             TEXT,
      severity           TEXT,
      priority           TEXT,
      description        TEXT,
      expected_result    TEXT,
      actual_result      TEXT,
      steps_to_reproduce TEXT,
      date_raised        TEXT,
      reference          TEXT,
      screenshot         TEXT,
      date_closed        TEXT
    )
  `);

  try { db.run("ALTER TABLE defects ADD COLUMN date_closed TEXT"); } catch(e) { /* column already exists */ }

  async function saveDB() {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle('buglog.db', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(db.export());
      await writable.close();
    } catch {
      console.log('OPFS unavailable — running on file://, writes are in-memory only');
    }
  }

  // Reusable parameterised SELECT — frees statement after each use to avoid WASM memory leaks.
  function query(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  // Projects — no build scope, global to the database.
  BuglogAPI.getProjects = () =>
    query("SELECT id, name FROM projects ORDER BY name");

  BuglogAPI.addProject = name => {
    db.run("INSERT INTO projects (name) VALUES (?)", [name]);
    BuglogAPI._save();
  };

  // Builds — scoped to a project.
  BuglogAPI.getBuilds = projectId =>
    query("SELECT id, name FROM builds WHERE project_id = ? ORDER BY id DESC", [projectId]);

  BuglogAPI.addBuild = (projectId, name) => {
    db.run("INSERT INTO builds (project_id, name) VALUES (?, ?)", [projectId, name]);
    BuglogAPI._save();
  };

  // Test cases — scoped to a build.
  BuglogAPI.getTestCases = buildId =>
    query("SELECT * FROM test_cases WHERE build_id = ? ORDER BY id", [buildId]);

  BuglogAPI.addTestCase = (buildId, data) => {
    db.run(
      "INSERT INTO test_cases (build_id, tc_id, title, preconditions, steps, expected_result, actual_result, status, priority, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [buildId, data.tc_id, data.title, data.preconditions, data.steps, data.expected_result, data.actual_result, data.status, data.priority, data.notes]
    );
    BuglogAPI._save();
  };

  // Defects — scoped to a build.
  BuglogAPI.getDefects = buildId =>
    query("SELECT * FROM defects WHERE build_id = ? ORDER BY id", [buildId]);

  BuglogAPI.addDefect = (buildId, data) => {
    db.run(
      "INSERT INTO defects (build_id, defect_id, status, severity, priority, description, expected_result, actual_result, steps_to_reproduce, date_raised, reference, screenshot, date_closed) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [buildId, data.defect_id, data.status, data.severity, data.priority, data.description, data.expected_result, data.actual_result, data.steps_to_reproduce, data.date_raised, data.reference, data.screenshot, data.date_closed || null]
    );
    BuglogAPI._save();
  };

  BuglogAPI.updateTestCase = (id, data) => {
    db.run(
      "UPDATE test_cases SET tc_id=?, title=?, preconditions=?, steps=?, expected_result=?, actual_result=?, status=?, priority=?, notes=? WHERE id=?",
      [data.tc_id, data.title, data.preconditions, data.steps, data.expected_result, data.actual_result, data.status, data.priority, data.notes, id]
    );
    BuglogAPI._save();
  };

  BuglogAPI.updateDefect = (id, data) => {
    db.run(
      "UPDATE defects SET defect_id=?, status=?, severity=?, priority=?, description=?, expected_result=?, actual_result=?, steps_to_reproduce=?, date_raised=?, reference=?, screenshot=?, date_closed=? WHERE id=?",
      [data.defect_id, data.status, data.severity, data.priority, data.description, data.expected_result, data.actual_result, data.steps_to_reproduce, data.date_raised, data.reference, data.screenshot, data.date_closed || null, id]
    );
    BuglogAPI._save();
  };

  BuglogAPI.getRecentDefects = (buildId, n = 5) =>
    query("SELECT defect_id, description, severity, status FROM defects WHERE build_id = ? ORDER BY id DESC LIMIT ?", [buildId, n]);

  // Stats — return fixed-shape objects used by dashboard and metrics page.
  BuglogAPI.getBuildName = buildId => {
    const rows = query("SELECT name FROM builds WHERE id = ?", [buildId]);
    return rows[0]?.name || '';
  };

  BuglogAPI.getTestCaseStats = buildId => {
    // Status order from settings: [0]=not_run default, [1]=passed, [2]=failed, [3]=blocked
    const statuses = BuglogAPI.getSettings().tc_status.split('\n').filter(s => s.trim());
    const rows = query("SELECT status, COUNT(*) as count FROM test_cases WHERE build_id = ? GROUP BY status", [buildId]);
    const statusCountMap = {};
    for (const row of rows) statusCountMap[row.status] = row.count;
    return {
      not_run: statusCountMap[statuses[0]] || 0,
      passed:  statusCountMap[statuses[1]] || 0,
      failed:  statusCountMap[statuses[2]] || 0,
      blocked: statusCountMap[statuses[3]] || 0
    };
  };

  BuglogAPI.getDefectStats = buildId => {
    const firstStatus = BuglogAPI.getSettings().defect_status.split('\n').filter(s => s.trim())[0];
    const total = query("SELECT COUNT(*) as count FROM defects WHERE build_id = ?", [buildId])[0]?.count || 0;
    const open  = query("SELECT COUNT(*) as count FROM defects WHERE build_id = ? AND status = ?", [buildId, firstStatus])[0]?.count || 0;
    const bySeverity = {};
    for (const row of query("SELECT severity, COUNT(*) as count FROM defects WHERE build_id = ? GROUP BY severity", [buildId]))
      bySeverity[row.severity] = row.count;
    const byPriority = {};
    for (const row of query("SELECT priority, COUNT(*) as count FROM defects WHERE build_id = ? GROUP BY priority", [buildId]))
      byPriority[row.priority] = row.count;
    return { total, open, bySeverity, byPriority };
  };

  // Settings — stored in localStorage, not the database. Keyed with buglog_ prefix to avoid collisions.
  const SETTING_DEFAULTS = {
    tc_status:     "Not Run\nPassed\nFailed\nBlocked",
    priority:      "P0 — High, resolve immediately\nP1 — Medium, resolve ASAP for next build\nP2 — Low, resolve in any future version",
    severity:      "Blocker — Cannot proceed further in test cycle\nCritical — Main function not working, breaks user flow\nMajor — Causes undesirable behaviour but still functional\nMinor — Will not cause breakdown of flow",
    defect_status: "Open\nIn Progress\nResolved\nClosed"
  };

  BuglogAPI.getSettings = () => {
    const settings = {};
    for (const key of Object.keys(SETTING_DEFAULTS))
      settings[key] = localStorage.getItem(`buglog_${key}`) ?? SETTING_DEFAULTS[key];
    return settings;
  };

  BuglogAPI.setSetting = (key, value) =>
    localStorage.setItem(`buglog_${key}`, value);

  BuglogAPI.resetSettingsToDefaults = () => {
    for (const key of Object.keys(SETTING_DEFAULTS))
      localStorage.removeItem(`buglog_${key}`);
  };

  BuglogAPI.resetAppState = () => {
    db.run("DELETE FROM defects");
    db.run("DELETE FROM test_cases");
    db.run("DELETE FROM builds");
    db.run("DELETE FROM projects");
    saveDB();
  };

  // Markdown export — returns formatted string; caller handles download.
  BuglogAPI.exportBuildMarkdown = (projectId, buildId) => {
    const projects = query("SELECT name FROM projects WHERE id = ?", [projectId]);
    const projectName = projects[0]?.name || 'Unknown Project';
    const buildName = BuglogAPI.getBuildName(buildId);

    // Newlines collapse to spaces; pipes are escaped to avoid breaking MD table columns.
    const cell = v => (v || '').toString().replace(/\n/g, ' ').replace(/\|/g, '\\|');

    const tcs = BuglogAPI.getTestCases(buildId);
    let tcTable = '## Test Cases\n\n';
    if (tcs.length) {
      tcTable += '| TC ID | Title | Preconditions | Steps | Expected Result | Actual Result | Status | Priority | Notes |\n';
      tcTable += '|---|---|---|---|---|---|---|---|---|\n';
      for (const testCase of tcs)
        tcTable += `| ${cell(testCase.tc_id)} | ${cell(testCase.title)} | ${cell(testCase.preconditions)} | ${cell(testCase.steps)} | ${cell(testCase.expected_result)} | ${cell(testCase.actual_result)} | ${cell(testCase.status)} | ${cell(testCase.priority)} | ${cell(testCase.notes)} |\n`;
    } else {
      tcTable += '_No test cases logged._\n';
    }

    const defects = BuglogAPI.getDefects(buildId);
    let defectTable = '## Defects\n\n';
    if (defects.length) {
      defectTable += '| Defect ID | Status | Severity | Priority | Description | Expected Result | Actual Result | Steps to Reproduce | Date Raised | Date Closed | Reference |\n';
      defectTable += '|---|---|---|---|---|---|---|---|---|---|---|\n';
      for (const defect of defects)
        defectTable += `| ${cell(defect.defect_id)} | ${cell(defect.status)} | ${cell(defect.severity)} | ${cell(defect.priority)} | ${cell(defect.description)} | ${cell(defect.expected_result)} | ${cell(defect.actual_result)} | ${cell(defect.steps_to_reproduce)} | ${cell(defect.date_raised)} | ${cell(defect.date_closed)} | ${cell(defect.reference)} |\n`;
    } else {
      defectTable += '_No defects logged._\n';
    }

    return `# ${projectName} — ${buildName}\n\n${tcTable}\n${defectTable}`;
  };

  BuglogAPI.exportAllMarkdown = () => {
    const projects = BuglogAPI.getProjects();
    const sections = [];
    for (const project of projects) {
      for (const build of BuglogAPI.getBuilds(project.id))
        sections.push(BuglogAPI.exportBuildMarkdown(project.id, build.id));
    }
    return sections.join('\n\n---\n\n');
  };

  // Cross-page selection — persisted in localStorage so dropdowns survive navigation.
  BuglogAPI.setSelectedProject = id => localStorage.setItem('buglog_selected_project', id);
  BuglogAPI.getSelectedProject = ()  => localStorage.getItem('buglog_selected_project');
  BuglogAPI.setSelectedBuild   = id => localStorage.setItem('buglog_selected_build', id);
  BuglogAPI.getSelectedBuild   = ()  => localStorage.getItem('buglog_selected_build');

  // _db and _save are internal — page scripts use the public API methods only.
  window.BuglogAPI._db = db;
  window.BuglogAPI._save = saveDB;
});
