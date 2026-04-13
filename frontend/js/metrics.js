window.BuglogAPI.ready.then(() => {
  const projectSel   = document.getElementById('project');
  const buildSel     = document.getElementById('build');
  const selectionMsg = document.getElementById('selection-msg');
  let executionChart = null;
  let defectChart    = null;

  function flashMsg(el, text) {
    el.textContent = text;
    el.style.display = 'inline';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
  }

  function loadProjects() {
    for (const p of BuglogAPI.getProjects()) {
      projectSel.add(new Option(p.name, p.id));
    }
  }

  function loadBuilds(projectId) {
    buildSel.options.length = 1;
    for (const b of BuglogAPI.getBuilds(projectId)) {
      buildSel.add(new Option(b.name, b.id));
    }
    if (buildSel.options.length > 1) {
      buildSel.value = buildSel.options[1].value;
      updateMetrics(buildSel.value);
    }
  }

  function daysSince(dateStr) {
    // 86400000 ms = 1 day.
    return Math.floor((new Date() - new Date(dateStr)) / 86400000);
  }

  function updateMetrics(buildId) {
    const settings    = BuglogAPI.getSettings();
    const tcStats     = BuglogAPI.getTestCaseStats(buildId);
    const defectStats = BuglogAPI.getDefectStats(buildId);
    const total    = tcStats.passed + tcStats.failed + tcStats.blocked + tcStats.not_run;
    const executed = tcStats.passed + tcStats.failed + tcStats.blocked;

    const pct = (n, d) => d === 0 ? '—' : Math.round(n / d * 100) + '%';
    document.getElementById('pct-executed').textContent = pct(executed, total);
    document.getElementById('pct-pass').textContent     = pct(tcStats.passed, total);
    document.getElementById('pct-fail').textContent     = pct(tcStats.failed, total);
    document.getElementById('pct-blocked').textContent  = pct(tcStats.blocked, total);

    document.getElementById('total-defects').textContent = defectStats.total || '—';
    document.getElementById('open-defects').textContent  = defectStats.open  || '—';

    const firstStatus  = settings.defect_status.split('\n').filter(s => s.trim())[0];
    // Strip description so the value matches what's stored in the DB.
    const statusValue  = firstStatus.includes(' — ') ? firstStatus.split(' — ')[0] : firstStatus;
    const openDefects  = BuglogAPI.getDefects(buildId).filter(d => d.status === statusValue && d.date_raised);
    if (openDefects.length) {
      const ages = openDefects.map(d => daysSince(d.date_raised));
      document.getElementById('avg-defect-age').textContent = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) + 'd';
      document.getElementById('oldest-defect').textContent  = Math.max(...ages) + 'd';
    } else {
      document.getElementById('avg-defect-age').textContent = '—';
      document.getElementById('oldest-defect').textContent  = '—';
    }

    const tcStatuses   = settings.tc_status.split('\n').filter(s => s.trim());
    const severityOrder = settings.severity.split('\n').filter(s => s.trim()).map(s => s.includes(' — ') ? s.split(' — ')[0] : s);

    if (executionChart) executionChart.destroy();
    if (defectChart)    defectChart.destroy();

    const execPanel   = document.getElementById('execution-chart-panel');
    const defectPanel = document.getElementById('defect-chart-panel');

    if (total > 0) {
      execPanel.classList.remove('hidden');
      executionChart = new Chart(document.getElementById('execution-chart'), {
        type: 'doughnut',
        data: {
          labels: [tcStatuses[1], tcStatuses[2], tcStatuses[3], tcStatuses[0]],
          datasets: [{ data: [tcStats.passed, tcStats.failed, tcStats.blocked, tcStats.not_run], backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#607d8b'] }]
        }
      });
    } else {
      execPanel.classList.add('hidden');
    }

    if (defectStats.total > 0) {
      defectPanel.classList.remove('hidden');
      defectChart = new Chart(document.getElementById('defect-chart'), {
        type: 'doughnut',
        data: {
          labels: severityOrder,
          datasets: [{ data: severityOrder.map(s => defectStats.bySeverity[s] || 0), backgroundColor: ['#b71c1c', '#f44336', '#ff9800', '#ffeb3b'] }]
        }
      });
    } else {
      defectPanel.classList.add('hidden');
    }
  }

  function resetMetrics() {
    ['pct-executed', 'pct-pass', 'pct-fail', 'pct-blocked',
     'total-defects', 'open-defects', 'avg-defect-age', 'oldest-defect'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    if (executionChart) { executionChart.destroy(); executionChart = null; }
    if (defectChart)    { defectChart.destroy();    defectChart    = null; }
    document.getElementById('execution-chart-panel').classList.add('hidden');
    document.getElementById('defect-chart-panel').classList.add('hidden');
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    resetMetrics();
    const val = projectSel.value;
    if (val) {
      BuglogAPI.setSelectedProject(val);
      BuglogAPI.setSelectedBuild('');
      loadBuilds(val);
      flashMsg(selectionMsg, `Project changed to ${projectSel.options[projectSel.selectedIndex].text}.`);
    }
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val) {
      BuglogAPI.setSelectedBuild(val);
      updateMetrics(val);
      flashMsg(selectionMsg, `Build changed to ${buildSel.options[buildSel.selectedIndex].text}.`);
    } else {
      resetMetrics();
    }
  });

  loadProjects();

  const savedProject = BuglogAPI.getSelectedProject();
  if (savedProject) {
    projectSel.value = savedProject;
    if (projectSel.value) {
      loadBuilds(savedProject);
      const savedBuild = BuglogAPI.getSelectedBuild();
      if (savedBuild) {
        buildSel.value = savedBuild;
        if (buildSel.value) updateMetrics(savedBuild);
      }
    }
  }
});
