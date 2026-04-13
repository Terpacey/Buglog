// REQ-004: Defects can be reported and listed
// REQ-014: Reference field autocomplete from test case IDs in the same build
// REQ-015: Defect rows show the Build column

import { test, expect, SeededPage } from './fixtures/buglog.fixture';
import { TestCasesPage } from './pages/TestCasesPage';
import { DefectsPage } from './pages/DefectsPage';

test('report defect with TC reference autocomplete, Build column shown, expand detail', async ({
  seededPage,
}) => {
  const { page, projectId, buildId } = seededPage as SeededPage;

  // Seed a test case so the datalist has an entry to autocomplete
  const tcPage = new TestCasesPage(page);
  await tcPage.goto();
  await tcPage.fillAndSubmit({ tcId: 'TC_LOG_001', title: 'Login with valid credentials' });
  await page.evaluate(async () => { await (window as any).BuglogAPI._save(); });

  const defectsPage = new DefectsPage(page);
  await defectsPage.goto();

  // Project and build dropdowns restored from localStorage
  await expect(defectsPage.projectSelect).toHaveValue(projectId);
  await expect(defectsPage.buildSelect).toHaveValue(buildId);

  // Fill defect form
  await defectsPage.defectIdInput.fill('D_001');
  await defectsPage.severitySelect.selectOption('Critical');
  await defectsPage.prioritySelect.selectOption('P0');
  await defectsPage.descriptionInput.fill('Login button unresponsive');

  // Reference autocomplete — datalist should contain TC_LOG_001
  await defectsPage.referenceInput.fill('TC_');
  const datalistOption = page.locator('#tc-id-list option[value="TC_LOG_001"]');
  await expect(datalistOption).toHaveCount(1);

  await defectsPage.referenceInput.fill('TC_LOG_001');

  // Date raised should default to today (not empty)
  await expect(defectsPage.dateRaisedInput).not.toHaveValue('');

  await defectsPage.submitBtn.click();
  await expect(defectsPage.savedMsg).toBeVisible();

  // First row — Build column (6th td, index 5) should show "v1.0.0"
  const firstRow = defectsPage.firstDataRow();
  await expect(firstRow.locator('td').nth(5)).toHaveText('v1.0.0');

  // Click row to expand detail — detail grid should contain the reference
  await firstRow.click();
  const expandRow = defectsPage.expandRow();
  await expect(expandRow).toBeVisible();
  await expect(expandRow.locator('.detail-grid')).toContainText('TC_LOG_001');
});
