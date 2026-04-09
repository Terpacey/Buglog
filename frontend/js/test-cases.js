window.BuglogAPI.ready.then(() => {
  const projectSel = document.getElementById('project');
  const buildSel = document.getElementById('build');
  const form = document.getElementById('test-case-form');

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

  // Render test cases for the selected build.
  function loadTestCases(buildId) {
    const tbody = document.getElementById('test-cases-body');
    tbody.innerHTML = '';
    for (const tc of BuglogAPI.getTestCases(buildId)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${tc.tc_id}</td><td>${tc.title}</td><td>${tc.priority}</td><td>${tc.status}</td>`;
      tbody.appendChild(tr);
    }
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    document.getElementById('test-cases-body').innerHTML = '';
    const val = projectSel.value;
    if (val) loadBuilds(val);
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val) loadTestCases(val);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const buildId = buildSel.value;
    if (!buildId) return; // no build selected, nothing to scope to
    BuglogAPI.addTestCase(buildId, {
      tc_id: document.getElementById('tc-id').value.trim(),
      title: document.getElementById('title').value.trim(),
      preconditions: document.getElementById('preconditions').value.trim(),
      steps: document.getElementById('steps').value.trim(),
      expected_result: document.getElementById('expected').value.trim(),
      actual_result: document.getElementById('actual').value.trim(),
      status: document.getElementById('status').value,
      priority: document.getElementById('priority').value,
      notes: document.getElementById('notes').value.trim()
    });
    form.reset();
    loadTestCases(buildId);
  });

  loadProjects();
});
