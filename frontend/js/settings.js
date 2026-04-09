window.BuglogAPI.ready.then(() => {
  // Maps textarea IDs to localStorage keys used by BuglogAPI.
  const fields = {
    'setting-tc-status':     'tc_status',
    'setting-priority':      'priority',
    'setting-severity':      'severity',
    'setting-defect-status': 'defect_status'
  };

  // Populate all textareas from localStorage (or defaults if not yet saved).
  function loadSettings() {
    const settings = BuglogAPI.getSettings();
    for (const [id, key] of Object.entries(fields)) {
      document.getElementById(id).value = settings[key];
    }
  }

  document.getElementById('save-settings').addEventListener('click', () => {
    for (const [id, key] of Object.entries(fields)) {
      BuglogAPI.setSetting(key, document.getElementById(id).value);
    }
    const msg = document.getElementById('settings-saved');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  });

  document.getElementById('reset-settings').addEventListener('click', () => {
    BuglogAPI.resetSettingsToDefaults();
    loadSettings();
  });

  loadSettings();
});
