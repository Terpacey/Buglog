import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly projectSelect: Locator;
  readonly buildSelect: Locator;
  readonly statPassed: Locator;
  readonly statFailed: Locator;
  readonly statBlocked: Locator;
  readonly statNotRun: Locator;
  readonly recentDefectsBody: Locator;

  constructor(page: Page) {
    this.page              = page;
    this.projectSelect     = page.locator('#project');
    this.buildSelect       = page.locator('#build');
    this.statPassed        = page.locator('#count-passed');
    this.statFailed        = page.locator('#count-failed');
    this.statBlocked       = page.locator('#count-blocked');
    this.statNotRun        = page.locator('#count-not-run');
    this.recentDefectsBody = page.locator('#defects-body');
  }

  async goto(): Promise<void> {
    await this.page.goto('index.html');
    await this.page.evaluate(() => (window as any).BuglogAPI.ready);
  }
}
