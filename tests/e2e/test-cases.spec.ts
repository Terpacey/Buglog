// REQ-003: Test cases can be added and listed
// REQ-009: Submit without a build selected has no effect
// REQ-012: Inline editing of test cases

import { test, expect, SeededPage } from './fixtures/buglog.fixture';
import { test as baseTest } from '@playwright/test';
import { TestCasesPage } from './pages/TestCasesPage';

test('add test case, expand detail row, inline edit', async ({ seededPage }) => {
  const { page } = seededPage as SeededPage;

  const tcPage = new TestCasesPage(page);
  await tcPage.goto();

  // Project and build dropdowns should be pre-populated from localStorage
  await expect(tcPage.projectSelect).not.toHaveValue('');
  await expect(tcPage.buildSelect).not.toHaveValue('');

  // Submit a test case
  await tcPage.fillAndSubmit({
    tcId: 'TC_LOG_001',
    title: 'Login with valid credentials',
    status: 'Not Run',
    priority: 'P0',
  });

  await expect(tcPage.savedMsg).toBeVisible();

  // One data row in the table
  await expect(tcPage.tableBody.locator('tr:not(.expand-row)')).toHaveCount(1);
  const row = tcPage.firstDataRow();
  await expect(row.locator('td').nth(0)).toHaveText('TC_LOG_001');
  await expect(row.locator('td').nth(1)).toHaveText('Login with valid credentials');
  await expect(row.locator('td').nth(2)).toHaveText('P0');
  await expect(row.locator('td').nth(3)).toHaveText('Not Run');

  // Click row to open expand detail
  await row.click();
  const expandRow = tcPage.expandRow();
  await expect(expandRow).toBeVisible();
  await expect(expandRow.locator('.detail-grid')).toContainText('TC_LOG_001');

  // Switch to edit mode
  await expandRow.locator('.btn-edit').click();
  await expect(expandRow.locator('.edit-title')).toBeVisible();

  // Edit the title and status
  await expandRow.locator('.edit-title').fill('Login Test (Updated)');
  await expandRow.locator('.edit-status').selectOption('Passed');
  await expandRow.locator('.btn-save-edit').click();

  // Row should now reflect the updated values
  await expect(row.locator('td').nth(1)).toHaveText('Login Test (Updated)');
  await expect(row.locator('td').nth(3)).toHaveText('Passed');
});

// Negative test — no fixture, no project/build selected
baseTest('submit without build selected — table stays empty', async ({ page }) => {
  await page.goto('test-cases.html');
  await page.evaluate(() => (window as any).BuglogAPI.ready);

  await page.fill('#title', 'Orphan Test');
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('#test-cases-body tr')).toHaveCount(0);
  await expect(page.locator('#tc-saved-msg')).not.toBeVisible();
});
