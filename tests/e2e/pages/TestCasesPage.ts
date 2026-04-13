import { Page, Locator } from '@playwright/test';

export class TestCasesPage {
  readonly page: Page;
  readonly projectSelect: Locator;
  readonly buildSelect: Locator;
  readonly tcIdInput: Locator;
  readonly titleInput: Locator;
  readonly statusSelect: Locator;
  readonly prioritySelect: Locator;
  readonly submitBtn: Locator;
  readonly savedMsg: Locator;
  readonly tableBody: Locator;

  constructor(page: Page) {
    this.page           = page;
    this.projectSelect  = page.locator('#project');
    this.buildSelect    = page.locator('#build');
    this.tcIdInput      = page.locator('#tc-id');
    this.titleInput     = page.locator('#title');
    this.statusSelect   = page.locator('#status');
    this.prioritySelect = page.locator('#priority');
    this.submitBtn      = page.locator('button[type="submit"]');
    this.savedMsg       = page.locator('#tc-saved-msg');
    this.tableBody      = page.locator('#test-cases-body');
  }

  async goto(): Promise<void> {
    await this.page.goto('test-cases.html');
    await this.page.evaluate(() => (window as any).BuglogAPI.ready);
  }

  async fillAndSubmit(data: {
    tcId: string;
    title: string;
    status?: string;
    priority?: string;
  }): Promise<void> {
    await this.tcIdInput.fill(data.tcId);
    await this.titleInput.fill(data.title);
    if (data.status)   await this.statusSelect.selectOption(data.status);
    if (data.priority) await this.prioritySelect.selectOption(data.priority);
    await this.submitBtn.click();
  }

  firstDataRow(): Locator {
    return this.tableBody.locator('tr:not(.expand-row)').first();
  }

  expandRow(): Locator {
    return this.tableBody.locator('tr.expand-row');
  }
}
