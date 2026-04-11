window.BuglogAPI.ready.then(() => {
  const projectSel      = document.getElementById('project');
  const buildSel        = document.getElementById('build');
  const exportBtn       = document.getElementById('export-md');
  const selectionMsg    = document.getElementById('selection-msg');
  const addRow          = document.getElementById('add-row');
  const newProjectInput = document.getElementById('new-project');
  const newBuildInput   = document.getElementById('new-build');
  const saveProjectBtn  = document.getElementById('save-project');
  const saveBuildBtn    = document.getElementById('save-build');
  const projectSaveMsg  = document.getElementById('project-save-msg');
  const buildSaveMsg    = document.getElementById('build-save-msg');

  function flashMsg(el, text) {
    if (text) el.textContent = text;
    el.style.display = 'inline';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
  }

  // Rebuild project dropdown — data rows first, + Add Project at the end.
  function loadProjects(selectId) {
    projectSel.options.length = 1;
    for (const p of BuglogAPI.getProjects()) {
      projectSel.add(new Option(p.name, p.id));
    }
    projectSel.add(new Option('+ Add Project', '__add__'));
    if (selectId) projectSel.value = selectId;
  }

  // Rebuild build dropdown for the given project — + Add Build at the end.
  function loadBuilds(projectId, selectId) {
    buildSel.options.length = 1;
    for (const b of BuglogAPI.getBuilds(projectId)) {
      buildSel.add(new Option(b.name, b.id));
    }
    buildSel.add(new Option('+ Add Build', '__add__'));
    if (selectId) {
      buildSel.value = selectId;
    } else if (buildSel.options.length > 2) {
      // Auto-select the latest build (first real option — builds ordered id DESC).
      buildSel.value = buildSel.options[1].value;
      updateDashboard(buildSel.value);
      exportBtn.style.display = 'inline-block';
    }
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

  function hideProjectInput() {
    newProjectInput.style.display = 'none';
    saveProjectBtn.style.display = 'none';
    newProjectInput.value = '';
    saveProjectBtn.disabled = true;
    if (newBuildInput.style.display === 'none') addRow.style.display = 'none';
  }

  function hideBuildInput() {
    newBuildInput.style.display = 'none';
    saveBuildBtn.style.display = 'none';
    newBuildInput.value = '';
    saveBuildBtn.disabled = true;
    if (newProjectInput.style.display === 'none') addRow.style.display = 'none';
  }

  projectSel.addEventListener('change', () => {
    hideBuildInput();
    resetDashboard();
    exportBtn.style.display = 'none';
    const val = projectSel.value;
    if (val === '__add__') {
      addRow.style.display = 'flex';
      newProjectInput.style.display = 'inline-block';
      saveProjectBtn.style.display = 'inline-block';
      buildSel.options.length = 1;
    } else if (val) {
      hideProjectInput();
      BuglogAPI.setSelectedProject(val);
      BuglogAPI.setSelectedBuild('');
      loadBuilds(val);
      flashMsg(selectionMsg, `Project changed to ${projectSel.options[projectSel.selectedIndex].text}.`);
    } else {
      hideProjectInput();
      buildSel.options.length = 1;
    }
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val === '__add__') {
      addRow.style.display = 'flex';
      newBuildInput.style.display = 'inline-block';
      saveBuildBtn.style.display = 'inline-block';
      exportBtn.style.display = 'none';
    } else if (val) {
      hideBuildInput();
      BuglogAPI.setSelectedBuild(val);
      updateDashboard(val);
      exportBtn.style.display = 'inline-block';
      flashMsg(selectionMsg, `Build changed to ${buildSel.options[buildSel.selectedIndex].text}.`);
    } else {
      hideBuildInput();
      resetDashboard();
      exportBtn.style.display = 'none';
    }
  });

  // Enable/disable save buttons based on input content.
  newProjectInput.addEventListener('input', () => {
    saveProjectBtn.disabled = !newProjectInput.value.trim();
  });

  newBuildInput.addEventListener('input', () => {
    saveBuildBtn.disabled = !newBuildInput.value.trim();
  });

  // Shared logic for adding a project.
  function submitProject() {
    const name = newProjectInput.value.trim();
    if (!name) return;
    BuglogAPI.addProject(name);
    hideProjectInput();
    const newId = BuglogAPI.getProjects().find(p => p.name === name)?.id;
    loadProjects(newId);
    buildSel.options.length = 1;
    if (newId) {
      BuglogAPI.setSelectedProject(newId);
      loadBuilds(newId);
    }
    resetDashboard();
    flashMsg(projectSaveMsg);
  }

  // Shared logic for adding a build.
  function submitBuild() {
    const projectId = projectSel.value;
    if (!projectId || projectId === '__add__') return;
    const name = newBuildInput.value.trim();
    if (!name) return;
    BuglogAPI.addBuild(projectId, name);
    hideBuildInput();
    const newId = BuglogAPI.getBuilds(projectId)[0]?.id;
    loadBuilds(projectId, newId);
    if (newId) {
      BuglogAPI.setSelectedBuild(newId);
      updateDashboard(newId);
      exportBtn.style.display = 'inline-block';
    }
    flashMsg(buildSaveMsg);
  }

  newProjectInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitProject(); });
  saveProjectBtn.addEventListener('click', submitProject);

  newBuildInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitBuild(); });
  saveBuildBtn.addEventListener('click', submitBuild);

  exportBtn.addEventListener('click', () => {
    const projectId = projectSel.value;
    const buildId   = buildSel.value;
    if (!projectId || !buildId) return;
    const md       = BuglogAPI.exportBuildMarkdown(projectId, buildId);
    const filename = `${BuglogAPI.getBuildName(buildId).replace(/\s+/g, '_')}.md`;
    // Trigger download without appending anchor to DOM.
    const a        = document.createElement('a');
    a.href         = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download     = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  loadProjects();

  const savedProject = BuglogAPI.getSelectedProject();
  if (savedProject) {
    projectSel.value = savedProject;
    // .value silently stays '' if the saved id is no longer in the dropdown — this guard catches that.
    if (projectSel.value) {
      loadBuilds(savedProject);
      const savedBuild = BuglogAPI.getSelectedBuild();
      if (savedBuild) {
        buildSel.value = savedBuild;
        if (buildSel.value) {
          updateDashboard(savedBuild);
          exportBtn.style.display = 'inline-block';
        }
      }
    }
  }
});
