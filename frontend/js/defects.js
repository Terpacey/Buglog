window.BuglogAPI.ready.then(() => {
  const projectSel  = document.getElementById('project');
  const buildSel    = document.getElementById('build');
  const form        = document.getElementById('defect-form');
  const savedMsg    = document.getElementById('defect-saved-msg');
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
      const value = line.includes(' — ') ? line.split(' — ')[0] : line;
      sel.add(new Option(line, value));
    }
  }

  const settings = BuglogAPI.getSettings();
  populateSelect('status',   settings.defect_status.split('\n').filter(l => l.trim()));
  populateSelect('severity', settings.severity.split('\n').filter(l => l.trim()));
  populateSelect('priority', settings.priority.split('\n').filter(l => l.trim()));

  // Accepts a Date object — avoids manual string formatting for the input.
  document.getElementById('date-raised').valueAsDate = new Date();

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
      loadDefects(buildSel.value);
    }
  }

  function detailHTML(d) {
    const fields = [
      ['Defect ID',          d.defect_id],
      ['Description',        d.description],
      ['Expected Result',    d.expected_result],
      ['Actual Result',      d.actual_result],
      ['Steps to Reproduce', d.steps_to_reproduce],
      ['Date Raised',        d.date_raised],
      ['Date Closed',        d.date_closed],
      ['Reference',          d.reference],
      ['Screenshot',         d.screenshot],
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

  function editHTML(d) {
    const s = BuglogAPI.getSettings();
    const statusOpts   = s.defect_status.split('\n').filter(l => l.trim());
    const severityOpts = s.severity.split('\n').filter(l => l.trim());
    const priorityOpts = s.priority.split('\n').filter(l => l.trim());

    function optionsFor(opts, current) {
      return opts.map(o => {
        const val = o.includes(' — ') ? o.split(' — ')[0] : o;
        return `<option value="${val}" ${val === current ? 'selected' : ''}>${o}</option>`;
      }).join('');
    }

    return `
      <div class="detail-grid">
        <div class="edit-field"><div class="detail-field-label">Defect ID</div><input class="edit-defect-id" value="${d.defect_id || ''}"></div>
        <div class="edit-field"><div class="detail-field-label">Status</div><select class="edit-status">${optionsFor(statusOpts, d.status)}</select></div>
        <div class="edit-field"><div class="detail-field-label">Severity</div><select class="edit-severity">${optionsFor(severityOpts, d.severity)}</select></div>
        <div class="edit-field"><div class="detail-field-label">Priority</div><select class="edit-priority">${optionsFor(priorityOpts, d.priority)}</select></div>
        <div class="edit-field"><div class="detail-field-label">Description</div><textarea class="edit-description" rows="2">${d.description || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Expected Result</div><textarea class="edit-expected" rows="2">${d.expected_result || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Actual Result</div><textarea class="edit-actual" rows="2">${d.actual_result || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Steps to Reproduce</div><textarea class="edit-steps" rows="4">${d.steps_to_reproduce || ''}</textarea></div>
        <div class="edit-field"><div class="detail-field-label">Date Raised</div><input class="edit-date-raised" type="date" value="${d.date_raised || ''}"></div>
        <div class="edit-field"><div class="detail-field-label">Date Closed</div><input class="edit-date-closed" type="date" value="${d.date_closed || ''}"></div>
        <div class="edit-field"><div class="detail-field-label">Reference</div><input class="edit-reference" value="${d.reference || ''}"></div>
        <div class="edit-field"><div class="detail-field-label">Screenshot</div><input class="edit-screenshot" value="${d.screenshot || ''}"></div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary btn-save-edit">Save</button>
        <button class="btn-secondary btn-cancel-edit">Cancel</button>
      </div>`;
  }

  function loadDefects(buildId) {
    const tbody    = document.getElementById('defects-body');
    const buildName = BuglogAPI.getBuildName(buildId);
    tbody.innerHTML = '';

    const tcs = BuglogAPI.getTestCases(buildId);
    const datalist = document.getElementById('tc-id-list');
    datalist.innerHTML = '';
    for (const tc of tcs) {
      if (tc.tc_id) {
        const opt = document.createElement('option');
        opt.value = tc.tc_id;
        datalist.appendChild(opt);
      }
    }

    for (const d of BuglogAPI.getDefects(buildId)) {
      const tr = document.createElement('tr');
      tr.dataset.id = d.id;
      tr.innerHTML = `<td>${d.defect_id || ''}</td><td>${d.description || ''}</td><td>${d.severity || ''}</td><td>${d.priority || ''}</td><td>${d.status || ''}</td><td>${buildName}</td>`;
      tr.style.cursor = 'pointer';

      tr.addEventListener('click', () => {
        const existing = tbody.querySelector(`.expand-row[data-for="${d.id}"]`);
        if (existing) { existing.remove(); return; }

        tbody.querySelectorAll('.expand-row').forEach(r => r.remove());

        const expandTr = document.createElement('tr');
        expandTr.className = 'expand-row';
        expandTr.dataset.for = d.id;
        const td = document.createElement('td');
        td.colSpan = 6;
        td.innerHTML = detailHTML(d);
        expandTr.appendChild(td);
        tr.insertAdjacentElement('afterend', expandTr);

        function showReadOnly() {
          td.innerHTML = detailHTML(d);
          td.querySelector('.btn-close').addEventListener('click', () => expandTr.remove());
          td.querySelector('.btn-edit').addEventListener('click', showEdit);
        }

        function showEdit() {
          td.innerHTML = editHTML(d);

          td.querySelector('.btn-cancel-edit').addEventListener('click', showReadOnly);

          td.querySelector('.btn-save-edit').addEventListener('click', () => {
            const updated = {
              defect_id:          td.querySelector('.edit-defect-id').value.trim(),
              status:             td.querySelector('.edit-status').value,
              severity:           td.querySelector('.edit-severity').value,
              priority:           td.querySelector('.edit-priority').value,
              description:        td.querySelector('.edit-description').value.trim(),
              expected_result:    td.querySelector('.edit-expected').value.trim(),
              actual_result:      td.querySelector('.edit-actual').value.trim(),
              steps_to_reproduce: td.querySelector('.edit-steps').value.trim(),
              date_raised:        td.querySelector('.edit-date-raised').value || null,
              date_closed:        td.querySelector('.edit-date-closed').value || null,
              reference:          td.querySelector('.edit-reference').value.trim(),
              screenshot:         td.querySelector('.edit-screenshot').value.trim(),
            };
            BuglogAPI.updateDefect(d.id, updated);
            // Patch d in-place so reopening the row reflects the update without re-querying.
            Object.assign(d, updated);
            tr.innerHTML = `<td>${d.defect_id || ''}</td><td>${d.description || ''}</td><td>${d.severity || ''}</td><td>${d.priority || ''}</td><td>${d.status || ''}</td><td>${buildName}</td>`;
            tr.style.cursor = 'pointer';
            showReadOnly();
            flashMsg(savedMsg, 'Defect updated.');
          });
        }

        td.querySelector('.btn-close').addEventListener('click', () => expandTr.remove());
        td.querySelector('.btn-edit').addEventListener('click', showEdit);
      });

      tbody.appendChild(tr);
    }
  }

  projectSel.addEventListener('change', () => {
    buildSel.options.length = 1;
    document.getElementById('defects-body').innerHTML = '';
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
      loadDefects(val);
      flashMsg(selectionMsg, `Build changed to ${buildSel.options[buildSel.selectedIndex].text}.`);
    } else {
      document.getElementById('defects-body').innerHTML = '';
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const buildId = buildSel.value;
    if (!buildId) return;
    BuglogAPI.addDefect(buildId, {
      defect_id:          document.getElementById('defect-id').value.trim(),
      status:             document.getElementById('status').value,
      severity:           document.getElementById('severity').value,
      priority:           document.getElementById('priority').value,
      description:        document.getElementById('description').value.trim(),
      expected_result:    document.getElementById('expected').value.trim(),
      actual_result:      document.getElementById('actual').value.trim(),
      steps_to_reproduce: document.getElementById('steps').value.trim(),
      date_raised:        document.getElementById('date-raised').value,
      date_closed:        document.getElementById('date-closed').value || null,
      reference:          document.getElementById('reference').value.trim(),
      screenshot:         document.getElementById('screenshot').value.trim(),
    });
    form.reset();
    populateSelect('status',   BuglogAPI.getSettings().defect_status.split('\n').filter(l => l.trim()));
    populateSelect('severity', BuglogAPI.getSettings().severity.split('\n').filter(l => l.trim()));
    populateSelect('priority', BuglogAPI.getSettings().priority.split('\n').filter(l => l.trim()));
    document.getElementById('date-raised').valueAsDate = new Date();
    loadDefects(buildId);
    flashMsg(savedMsg, 'Defect reported.');
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
        if (buildSel.value) loadDefects(savedBuild);
      }
    }
  }
});
