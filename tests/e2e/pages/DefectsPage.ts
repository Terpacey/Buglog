import { Page, Locator } from '@playwright/test';

export class DefectsPage {
  readonly page: Page;
  readonly projectSelect: Locator;
  readonly buildSelect: Locator;
  readonly defectIdInput: Locator;
  readonly descriptionInput: Locator;
  readonly severitySelect: Locator;
  readonly prioritySelect: Locator;
  readonly referenceInput: Locator;
  readonly dateRaisedInput: Locator;
  readonly submitBtn: Locator;
  readonly savedMsg: Locator;
  readonly tableBody: Locator;

  constructor(page: Page) {
    this.page             = page;
    this.projectSelect    = page.locator('#project');
    this.buildSelect      = page.locator('#build');
    this.defectIdInput    = page.locator('#defect-id');
    this.descriptionInput = page.locator('#description');
    this.severitySelect   = page.locator('#severity');
    this.prioritySelect   = page.locator('#priority');
    this.referenceInput   = page.locator('#reference');
    this.dateRaisedInput  = page.locator('#date-raised');
    this.submitBtn        = page.locator('button[type="submit"]');
    this.savedMsg         = page.locator('#defect-saved-msg');
    this.tableBody        = page.locator('#defects-body');
  }

  async goto(): Promise<void> {
    await this.page.goto('defects.html');
    await this.page.evaluate(() => (window as any).BuglogAPI.ready);
  }

  firstDataRow(): Locator {
    return this.tableBody.locator('tr:not(.expand-row)').first();
  }

  expandRow(): Locator {
    return this.tableBody.locator('tr.expand-row');
  }
}
