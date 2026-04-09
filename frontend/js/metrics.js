window.BuglogAPI.ready.then(() => {
  const projectSel = document.getElementById('project');
  const buildSel = document.getElementById('build');
  let executionChart = null;
  let defectChart = null;

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

  // Days elapsed since a YYYY-MM-DD date string.
  function daysSince(dateStr) {
    return Math.floor((new Date() - new Date(dateStr)) / 86400000);
  }

  function updateMetrics(buildId) {
    const tcStats = BuglogAPI.getTestCaseStats(buildId);
    const defectStats = BuglogAPI.getDefectStats(buildId);
    const total = tcStats.passed + tcStats.failed + tcStats.blocked + tcStats.not_run;
    const executed = tcStats.passed + tcStats.failed + tcStats.blocked;

    // Show '—' if no test cases logged yet.
    const pct = (n, d) => d === 0 ? '—' : Math.round(n / d * 100) + '%';
    document.getElementById('pct-executed').textContent = pct(executed, total);
    document.getElementById('pct-pass').textContent = pct(tcStats.passed, total);
    document.getElementById('pct-fail').textContent = pct(tcStats.failed, total);
    document.getElementById('pct-blocked').textContent = pct(tcStats.blocked, total);

    document.getElementById('total-defects').textContent = defectStats.total || '—';
    document.getElementById('open-defects').textContent = defectStats.open || '—';

    // Age stats are scoped to open defects only.
    const firstDefectStatus = settings.defect_status.split('\n').filter(s => s.trim())[0];
    const openDefects = BuglogAPI.getDefects(buildId).filter(d => d.status === firstDefectStatus && d.date_raised);
    if (openDefects.length) {
      const ages = openDefects.map(d => daysSince(d.date_raised));
      document.getElementById('avg-defect-age').textContent = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) + 'd';
      document.getElementById('oldest-defect').textContent = Math.max(...ages) + 'd';
    } else {
      document.getElementById('avg-defect-age').textContent = '—';
      document.getElementById('oldest-defect').textContent = '—';
    }

    const settings = BuglogAPI.getSettings();
    const tcStatuses = settings.tc_status.split('\n').filter(s => s.trim());
    const severityOrder = settings.severity.split('\n').filter(s => s.trim()).map(s => s.includes(' — ') ? s.split(' — ')[0] : s);

    // Destroy before redraw — Chart.js throws if canvas is already in use.
    if (executionChart) executionChart.destroy();
    if (defectChart) defectChart.destroy();

    // Labels match settings order: [0]=not_run, [1]=passed, [2]=failed, [3]=blocked
    executionChart = new Chart(document.getElementById('execution-chart'), {
      type: 'doughnut',
      data: {
        labels: [tcStatuses[1], tcStatuses[2], tcStatuses[3], tcStatuses[0]],
        datasets: [{ data: [tcStats.passed, tcStats.failed, tcStats.blocked, tcStats.not_run], backgroundColor: ['#4caf50', '#f44336', '#ff9800', '#607d8b'] }]
      }
    });

    defectChart = new Chart(document.getElementById('defect-chart'), {
      type: 'doughnut',
      data: {
        labels: severityOrder,
        datasets: [{ data: severityOrder.map(s => defectStats.by_severity[s] || 0), backgroundColor: ['#b71c1c', '#f44336', '#ff9800', '#ffeb3b'] }]
      }
    });
  }

  function resetMetrics() {
    ['pct-executed', 'pct-pass', 'pct-fail', 'pct-blocked',
     'total-defects', 'open-defects', 'avg-defect-age', 'oldest-defect'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    if (executionChart) { executionChart.destroy(); executionChart = null; }
    if (defectChart) { defectChart.destroy(); defectChart = null; }
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    resetMetrics();
    const val = projectSel.value;
    if (val) loadBuilds(val);
  });

  buildSel.addEventListener('change', () => {
    const val = buildSel.value;
    if (val) updateMetrics(val);
  });

  loadProjects();
});
