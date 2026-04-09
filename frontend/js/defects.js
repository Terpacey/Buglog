window.BuglogAPI.ready.then(() => {
  const projectSel = document.getElementById('project');
  const buildSel = document.getElementById('build');
  const form = document.getElementById('defect-form');

  // Populate project dropdown on load.
  function loadProjects() {
    for (const p of BuglogAPI.getProjects()) {
      projectSel.add(new Option(p.name, p.id));
    }
  }

  // Rebuild build dropdown for the selected project.
  function loadBuilds(projectId) {
    buildSel.options.length = 1;
    for (const b of BuglogAPI.getBuilds(projectId)) {
      buildSel.add(new Option(b.name, b.id));
    }
  }

  // Render defects for the selected build.
  function loadDefects(buildId) {
    const tbody = document.getElementById('defects-body');
    tbody.innerHTML = '';
    for (const d of BuglogAPI.getDefects(buildId)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.defect_id}</td><td>${d.description}</td><td>${d.severity}</td><td>${d.priority}</td><td>${d.status}</td>`;
      tbody.appendChild(tr);
    }
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    document.getElementById('defects-body').innerHTML = '';
    const val = projectSel.value;
    if (val) loadBuilds(val);
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val) loadDefects(val);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const buildId = buildSel.value;
    if (!buildId) return; // no build selected, nothing to scope to
    BuglogAPI.addDefect(buildId, {
      defect_id: document.getElementById('defect-id').value.trim(),
      status: document.getElementById('status').value,
      severity: document.getElementById('severity').value,
      priority: document.getElementById('priority').value,
      description: document.getElementById('description').value.trim(),
      expected_result: document.getElementById('expected').value.trim(),
      actual_result: document.getElementById('actual').value.trim(),
      steps_to_reproduce: document.getElementById('steps').value.trim(),
      date_raised: new Date().toISOString().split('T')[0],
      reference: document.getElementById('reference').value.trim(),
      screenshot: document.getElementById('screenshot').value.trim()
    });
    form.reset();
    loadDefects(buildId);
  });

  loadProjects();
});
