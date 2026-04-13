// REQ-001: Dashboard shows test case stat cards
// REQ-002: Dashboard shows recent defects table
// REQ-004: Defects are scoped to the selected build
// REQ-005: Stats reflect current build data
// REQ-011: Project/build selection persists across pages

import { test, expect, SeededPage } from './fixtures/buglog.fixture';
import { DashboardPage } from './pages/DashboardPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { DefectsPage } from './pages/DefectsPage';

test('stat cards and recent defects table reflect data added from other pages', async ({
  seededPage,
}) => {
  const { page, buildId } = seededPage as SeededPage;

  // Add 2 "Not Run" TCs and 1 "Passed" TC on the test cases page
  const tcPage = new TestCasesPage(page);
  await tcPage.goto();

  await tcPage.fillAndSubmit({ tcId: 'TC_LOG_001', title: 'Login with valid credentials', status: 'Not Run', priority: 'P0' });
  await tcPage.fillAndSubmit({ tcId: 'TC_LOG_002', title: 'Login with invalid password', status: 'Not Run', priority: 'P1' });
  await tcPage.fillAndSubmit({ tcId: 'TC_LOG_003', title: 'Logout clears session', status: 'Passed', priority: 'P1' });

  // Flush OPFS before navigating away
  await page.evaluate(async () => { await (window as any).BuglogAPI._save(); });

  // Add 1 defect on the defects page
  const defectsPage = new DefectsPage(page);
  await defectsPage.goto();

  await defectsPage.defectIdInput.fill('D_001');
  await defectsPage.descriptionInput.fill('Login button unresponsive');
  await defectsPage.submitBtn.click();

  await page.evaluate(async () => { await (window as any).BuglogAPI._save(); });

  // Navigate back to dashboard — localStorage project/build restores selection automatically
  const dashboard = new DashboardPage(page);
  await dashboard.goto();

  // Stat cards
  await expect(dashboard.statNotRun).toHaveText('2');
  await expect(dashboard.statPassed).toHaveText('1');
  await expect(dashboard.statFailed).toHaveText('0');
  await expect(dashboard.statBlocked).toHaveText('0');

  // Recent defects table has exactly 1 row
  await expect(dashboard.recentDefectsBody.locator('tr')).toHaveCount(1);
});
