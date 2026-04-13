// REQ-011: Project/build selection persists when navigating between all pages

import { test, expect, SeededPage } from './fixtures/buglog.fixture';

test('project and build selection persists across all pages', async ({ seededPage }) => {
  const { page, projectId, buildId } = seededPage as SeededPage;

  // Test Cases page
  await page.goto('test-cases.html');
  await page.evaluate(() => (window as any).BuglogAPI.ready);
  await expect(page.locator('#project')).toHaveValue(projectId);
  await expect(page.locator('#build')).toHaveValue(buildId);

  // Defects page
  await page.goto('defects.html');
  await page.evaluate(() => (window as any).BuglogAPI.ready);
  await expect(page.locator('#project')).toHaveValue(projectId);
  await expect(page.locator('#build')).toHaveValue(buildId);

  // Metrics page
  await page.goto('metrics.html');
  await page.evaluate(() => (window as any).BuglogAPI.ready);
  await expect(page.locator('#project')).toHaveValue(projectId);
  await expect(page.locator('#build')).toHaveValue(buildId);

  // Dashboard
  await page.goto('index.html');
  await page.evaluate(() => (window as any).BuglogAPI.ready);
  await expect(page.locator('#project')).toHaveValue(projectId);
  await expect(page.locator('#build')).toHaveValue(buildId);

  // Verify localStorage values directly
  const storedProject = await page.evaluate(
    () => localStorage.getItem('buglog_selected_project')
  );
  const storedBuild = await page.evaluate(
    () => localStorage.getItem('buglog_selected_build')
  );
  expect(storedProject).toBe(projectId);
  expect(storedBuild).toBe(buildId);
});
