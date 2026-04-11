window.BuglogAPI.ready.then(() => {
  const fields = {
    'setting-tc-status':     'tc_status',
    'setting-priority':      'priority',
    'setting-severity':      'severity',
    'setting-defect-status': 'defect_status'
  };

  function flashMsg(el) {
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
  }

  function loadSettings() {
    const settings = BuglogAPI.getSettings();
    for (const [id, key] of Object.entries(fields)) {
      document.getElementById(id).value = settings[key];
    }
  }

  document.getElementById('save-settings').addEventListener('click', () => {
    const current = BuglogAPI.getSettings();
    // Bail early if nothing changed — avoids a spurious save and flash message.
    let changed = false;
    for (const [id, key] of Object.entries(fields)) {
      if (document.getElementById(id).value !== current[key]) { changed = true; break; }
    }
    if (!changed) return;
    for (const [id, key] of Object.entries(fields)) {
      BuglogAPI.setSetting(key, document.getElementById(id).value);
    }
    flashMsg(document.getElementById('settings-saved'));
  });

  document.getElementById('reset-settings').addEventListener('click', () => {
    BuglogAPI.resetSettingsToDefaults();
    loadSettings();
    flashMsg(document.getElementById('settings-reset-msg'));
  });

  document.getElementById('export-all').addEventListener('click', () => {
    const md = BuglogAPI.exportAllMarkdown();
    const a  = document.createElement('a');
    a.href   = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = 'buglog_export.md';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('reset-app').addEventListener('click', () => {
    if (!confirm('Are you sure? This will permanently delete all projects, builds, test cases, and defects.')) return;
    BuglogAPI.resetAppState();
  });

  loadSettings();
});
