window.BuglogAPI.ready.then(() => {
  const projectSel  = document.getElementById('project');
  const buildSel    = document.getElementById('build');
  const form        = document.getElementById('test-case-form');
  const savedMsg    = document.getElementById('tc-saved-msg');
  const selectionMsg = document.getElementById('selection-msg');

  function flashMsg(el, text) {
    el.textContent = text;
    el.style.display = 'inline';
    setTimeout(() => { el.style.display = 'none'; }, 2000);
  }

  function populateSelect(id, lines) {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    for (const line of lines) {
      // Strip description — only the part before ' — ' is stored as the option value.
      const value = line.includes(' — ') ? line.split(' — ')[0] : line;
      sel.add(new Option(line, value));
    }
  }

  const settings = BuglogAPI.getSettings();
  populateSelect('status',   settings.tc_status.split('\n').filter(l => l.trim()));
  populateSelect('priority', settings.priority.split('\n').filter(l => l.trim()));

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
    // Auto-select latest build if available.
    if (buildSel.options.length > 1) {
      buildSel.value = buildSel.options[1].value;
      loadTestCases(buildSel.value);
    }
  }

  // Build a read-only detail grid for the expand row.
  function detailHTML(tc) {
    const fields = [
      ['Test Case ID', tc.tc_id],
      ['Preconditions', tc.preconditions],
      ['Steps', tc.steps],
      ['Expected Result', tc.expected_result],
      ['Actual Result', tc.actual_result],
      ['Notes', tc.notes],
    ];
    const pairs = fields.map(([label, val]) => `
      <div>
        <div class="detail-field-label">${label}</div>
        <div class="detail-field-value">${val || '—'}</div>
      </div>`).join('');
    return `
      <div class="detail-grid">${pairs}</div>
      <div class="detail-actions">
        <button class="btn-secondary btn-edit">Edit</button>
        <button class="btn-secondary btn-close">Close</button>
      </div>`;
  }

  // Build an editable form inside the expand row.
  function editHTML(tc) {
    const s = BuglogAPI.getSettings();
    const statusOpts   = s.tc_status.split('\n').filter(l => l.trim());
    const priorityOpts = s.priority.split('\n').filter(l => l.trim());

    function optionsFor(opts, current) {
      return opts.map(o => {
        const val = o.includes(' — ') ? o.split(' — ')[0] : o;
        return `<option value="${val}" ${val === current ? 'selected' : ''}>${o}</option>`;
      }).join('');
    }

    return `
      <div class="detail-grid">
        <div class="edit-field"><div class="detail-field-label">Test Case ID</div><input class="edit-tc-id" value="${tc.tc_id || ''}"></div>
        <div class="edit-field"><div class="detail-field-label">Title</div><input class="edit-title" value="${tc.title || ''}" required></div>
        <div class="edit-field"><div class="detail-field-label">Preconditions</div><textarea class="edit-preconditions" rows="2">${tc.preconditions || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Steps</div><textarea class="edit-steps" rows="4">${tc.steps || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Expected Result</div><textarea class="edit-expected" rows="2">${tc.expected_result || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Actual Result</div><textarea class="edit-actual" rows="2">${tc.actual_result || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Status</div><select class="edit-status">${optionsFor(statusOpts, tc.status)}</select></div>
        <div class="edit-field"><div class="detail-field-label">Priority</div><select class="edit-priority">${optionsFor(priorityOpts, tc.priority)}</select></div>
        <div class="edit-field"><div class="detail-field-label">Notes</div><textarea class="edit-notes" rows="2">${tc.notes || ''}</textarea></div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary btn-save-edit">Save</button>
        <button class="btn-secondary btn-cancel-edit">Cancel</button>
      </div>`;
  }

  function loadTestCases(buildId) {
    const tbody = document.getElementById('test-cases-body');
    tbody.innerHTML = '';
    for (const tc of BuglogAPI.getTestCases(buildId)) {
      const tr = document.createElement('tr');
      tr.dataset.id = tc.id;
      tr.innerHTML = `<td>${tc.tc_id || ''}</td><td>${tc.title}</td><td>${tc.priority}</td><td>${tc.status}</td>`;
      tr.style.cursor = 'pointer';

      tr.addEventListener('click', () => {
        // Toggle: if expand row already open for this TC, close it.
        const existing = tbody.querySelector(`.expand-row[data-for="${tc.id}"]`);
        if (existing) { existing.remove(); return; }

        // Close any other open expand row first.
        tbody.querySelectorAll('.expand-row').forEach(r => r.remove());

        const expandTr = document.createElement('tr');
        expandTr.className = 'expand-row';
        expandTr.dataset.for = tc.id;
        const td = document.createElement('td');
        td.colSpan = 4;
        td.innerHTML = detailHTML(tc);
        expandTr.appendChild(td);
        tr.insertAdjacentElement('afterend', expandTr);

        td.querySelector('.btn-close').addEventListener('click', () => expandTr.remove());

        function showReadOnly() {
          td.innerHTML = detailHTML(tc);
          td.querySelector('.btn-close').addEventListener('click', () => expandTr.remove());
          td.querySelector('.btn-edit').addEventListener('click', showEdit);
        }

        function showEdit() {
          td.innerHTML = editHTML(tc);

          td.querySelector('.btn-cancel-edit').addEventListener('click', showReadOnly);

          td.querySelector('.btn-save-edit').addEventListener('click', () => {
            const updated = {
              tc_id:           td.querySelector('.edit-tc-id').value.trim(),
              title:           td.querySelector('.edit-title').value.trim(),
              preconditions:   td.querySelector('.edit-preconditions').value.trim(),
              steps:           td.querySelector('.edit-steps').value.trim(),
              expected_result: td.querySelector('.edit-expected').value.trim(),
              actual_result:   td.querySelector('.edit-actual').value.trim(),
              status:          td.querySelector('.edit-status').value,
              priority:        td.querySelector('.edit-priority').value,
              notes:           td.querySelector('.edit-notes').value.trim(),
            };
            if (!updated.title) return;
            BuglogAPI.updateTestCase(tc.id, updated);
            // Patch tc in-place so reopening the row reflects the update without re-querying.
            Object.assign(tc, updated);
            tr.innerHTML = `<td>${tc.tc_id || ''}</td><td>${tc.title}</td><td>${tc.priority}</td><td>${tc.status}</td>`;
            tr.style.cursor = 'pointer';
            showReadOnly();
            flashMsg(savedMsg, 'Test case updated.');
          });
        }

        td.querySelector('.btn-edit').addEventListener('click', showEdit);
      });

      tbody.appendChild(tr);
    }
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    document.getElementById('test-cases-body').innerHTML = '';
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
      loadTestCases(val);
      flashMsg(selectionMsg, `Build changed to ${buildSel.options[buildSel.selectedIndex].text}.`);
    } else {
      document.getElementById('test-cases-body').innerHTML = '';
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const buildId = buildSel.value;
    if (!buildId) return;
    BuglogAPI.addTestCase(buildId, {
      tc_id:           document.getElementById('tc-id').value.trim(),
      title:           document.getElementById('title').value.trim(),
      preconditions:   document.getElementById('preconditions').value.trim(),
      steps:           document.getElementById('steps').value.trim(),
      expected_result: document.getElementById('expected').value.trim(),
      actual_result:   document.getElementById('actual').value.trim(),
      status:          document.getElementById('status').value,
      priority:        document.getElementById('priority').value,
      notes:           document.getElementById('notes').value.trim()
    });
    form.reset();
    // form.reset() wipes the selects — re-populate from settings.
    populateSelect('status',   BuglogAPI.getSettings().tc_status.split('\n').filter(l => l.trim()));
    populateSelect('priority', BuglogAPI.getSettings().priority.split('\n').filter(l => l.trim()));
    loadTestCases(buildId);
    flashMsg(savedMsg, 'Test case added.');
  });

  loadProjects();

  // Restore last selected project/build from localStorage.
  const savedProject = BuglogAPI.getSelectedProject();
  if (savedProject) {
    projectSel.value = savedProject;
    if (projectSel.value) {
      loadBuilds(savedProject);
      const savedBuild = BuglogAPI.getSelectedBuild();
      if (savedBuild) {
        buildSel.value = savedBuild;
        if (buildSel.value) loadTestCases(savedBuild);
      }
    }
  }
});
