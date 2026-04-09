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
      screenshot         TEXT
    )
  `);

  async function saveDB() {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle('buglog.db', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(db.export());
      await writable.close();
    } catch {
      // file:// — OPFS unavailable, writes are in-memory only
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
      "INSERT INTO defects (build_id, defect_id, status, severity, priority, description, expected_result, actual_result, steps_to_reproduce, date_raised, reference, screenshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [buildId, data.defect_id, data.status, data.severity, data.priority, data.description, data.expected_result, data.actual_result, data.steps_to_reproduce, data.date_raised, data.reference, data.screenshot]
    );
    BuglogAPI._save();
  };

  BuglogAPI.getRecentDefects = (buildId, n = 5) =>
    query("SELECT defect_id, description, severity, status FROM defects WHERE build_id = ? ORDER BY id DESC LIMIT ?", [buildId, n]);

  // Stats — return fixed-shape objects used by dashboard and metrics page.
  BuglogAPI.getTestCaseStats = buildId => {
    const rows = query("SELECT status, COUNT(*) as count FROM test_cases WHERE build_id = ? GROUP BY status", [buildId]);
    const stats = { passed: 0, failed: 0, blocked: 0, not_run: 0 };
    for (const row of rows) {
      if (row.status === 'Passed')       stats.passed  = row.count;
      else if (row.status === 'Failed')  stats.failed  = row.count;
      else if (row.status === 'Blocked') stats.blocked = row.count;
      else if (row.status === 'Not Run') stats.not_run = row.count;
    }
    return stats;
  };

  BuglogAPI.getDefectStats = buildId => {
    const total = query("SELECT COUNT(*) as count FROM defects WHERE build_id = ?", [buildId])[0]?.count || 0;
    const open  = query("SELECT COUNT(*) as count FROM defects WHERE build_id = ? AND status = 'Open'", [buildId])[0]?.count || 0;
    const by_severity = {};
    for (const row of query("SELECT severity, COUNT(*) as count FROM defects WHERE build_id = ? GROUP BY severity", [buildId]))
      by_severity[row.severity] = row.count;
    const by_priority = {};
    for (const row of query("SELECT priority, COUNT(*) as count FROM defects WHERE build_id = ? GROUP BY priority", [buildId]))
      by_priority[row.priority] = row.count;
    return { total, open, by_severity, by_priority };
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

  // _db and _save are internal — page scripts use the public API methods only.
  window.BuglogAPI._db = db;
  window.BuglogAPI._save = saveDB;
});
