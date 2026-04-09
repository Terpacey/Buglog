window.BuglogAPI.ready.then(() => {
  const projectSel = document.getElementById('project');
  const buildSel = document.getElementById('build');
  const newProjectInput = document.getElementById('new-project');
  const newBuildInput = document.getElementById('new-build');

  // Rebuild project dropdown, preserving static options at index 0 and 1.
  function loadProjects(selectId) {
    projectSel.options.length = 2;
    for (const p of BuglogAPI.getProjects()) {
      projectSel.add(new Option(p.name, p.id));
    }
    if (selectId) projectSel.value = selectId;
  }

  // Rebuild build dropdown for the given project.
  function loadBuilds(projectId, selectId) {
    buildSel.options.length = 2;
    for (const b of BuglogAPI.getBuilds(projectId)) {
      buildSel.add(new Option(b.name, b.id));
    }
    if (selectId) buildSel.value = selectId;
  }

  // Update stat cards and recent defects table for the selected build.
  function updateDashboard(buildId) {
    const stats = BuglogAPI.getTestCaseStats(buildId);
    document.getElementById('count-passed').textContent = stats.passed;
    document.getElementById('count-failed').textContent = stats.failed;
    document.getElementById('count-blocked').textContent = stats.blocked;
    document.getElementById('count-not-run').textContent = stats.not_run;

    const tbody = document.getElementById('defects-body');
    tbody.innerHTML = '';
    for (const d of BuglogAPI.getRecentDefects(buildId)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.defect_id}</td><td>${d.description}</td><td>${d.severity}</td><td>${d.status}</td>`;
      tbody.appendChild(tr);
    }
  }

  // Clear stat cards and defects table when no build is selected.
  function resetDashboard() {
    ['count-passed', 'count-failed', 'count-blocked', 'count-not-run'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    document.getElementById('defects-body').innerHTML = '';
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 2;
    resetDashboard();
    const val = projectSel.value;
    if (val && val !== '__add__') loadBuilds(val);
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val && val !== '__add__') updateDashboard(val);
  });

  newProjectInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const name = newProjectInput.value.trim();
    if (!name) return;
    BuglogAPI.addProject(name);
    newProjectInput.value = '';
    newProjectInput.style.display = 'none';
    // getProjects() is ordered by name — find first match to get the new id.
    const newId = BuglogAPI.getProjects().find(p => p.name === name)?.id;
    loadProjects(newId);
    buildSel.options.length = 2;
    resetDashboard();
  });

  newBuildInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const name = newBuildInput.value.trim();
    if (!name) return;
    const projectId = projectSel.value;
    BuglogAPI.addBuild(projectId, name);
    newBuildInput.value = '';
    newBuildInput.style.display = 'none';
    // getBuilds() is ordered by id DESC — newest is always index 0.
    const newId = BuglogAPI.getBuilds(projectId)[0]?.id;
    loadBuilds(projectId, newId);
    if (newId) updateDashboard(newId);
  });

  loadProjects();
});
