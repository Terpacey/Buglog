import { test as base, Page, expect } from '@playwright/test';

export type SeededPage = {
  page: Page;
  projectId: string;
  buildId: string;
};

export const test = base.extend<{ seededPage: SeededPage }>({
  seededPage: async ({ page }, use) => {
    await page.goto('index.html');
    await page.evaluate(() => (window as any).BuglogAPI.ready);

    // Add project via the dashboard UI (only page with the add-project flow)
    await page.selectOption('#project', '__add__');
    await page.fill('#new-project', 'Test Project');
    await page.click('#save-project');
    const projectId = await page.evaluate(
      () => (window as any).BuglogAPI.getSelectedProject() as string
    );

    // Add build
    await page.selectOption('#build', '__add__');
    await page.fill('#new-build', 'v1.0.0');
    await page.click('#save-build');
    const buildId = await page.evaluate(
      () => (window as any).BuglogAPI.getSelectedBuild() as string
    );

    // Flush OPFS write before any navigation so data survives cross-page loads
    await page.evaluate(async () => {
      await (window as any).BuglogAPI._save();
    });

    await use({ page, projectId, buildId });

    // Teardown — wipe DB and localStorage so tests are isolated
    await page.evaluate(() => {
      (window as any).BuglogAPI.resetAppState();
      localStorage.removeItem('buglog_selected_project');
      localStorage.removeItem('buglog_selected_build');
    });
  },
});

export { expect };
