import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXTENSION_PATH = resolve(__dirname, '../../dist');

test.describe('WebLens OS - Playwright E2E Extension Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeEach(async () => {
    // Launch Chrome with the unpacked extension loaded
    context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions only work in headful mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Retrieve the generated Extension ID from background pages
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    const parts = background.url().split('/');
    extensionId = parts[2];
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should load Popup and render pocket controls dashboard', async () => {
    // Navigate the first tab to a standard webpage to avoid system page error
    const activePage = await context.newPage();
    await activePage.goto('https://example.com');
    await activePage.bringToFront();

    const page = await context.newPage();
    page.on('console', msg => console.log('POPUP CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('POPUP PAGEERROR:', err));
    await page.goto(`chrome-extension://${extensionId}/apps/popup/index.html`);

    // Verify logo and pocket elements
    await expect(page.locator('h1')).toContainText('WebLens OS');
    await expect(page.locator('text=Dark Mode Override')).toBeVisible();
    await expect(page.locator('text=Focus Mode')).toBeVisible();
    await expect(page.locator('text=Clean Layout')).toBeVisible();
  });

  test('should load Side Panel and render radial gauges workspace', async () => {
    // Navigate the first tab to a standard webpage to avoid system page error
    const activePage = await context.newPage();
    await activePage.goto('https://example.com');
    await activePage.bringToFront();

    const page = await context.newPage();
    page.on('console', msg => console.log('SIDEPANEL CONSOLE:', msg.text()));
    page.on('pageerror', err => console.error('SIDEPANEL PAGEERROR:', err));
    await page.goto(`chrome-extension://${extensionId}/apps/sidepanel/index.html`);

    // Verify workspace tabs
    await expect(page.locator('button:has-text("dashboard")')).toBeVisible();
    await expect(page.locator('button:has-text("Fix Page")')).toBeVisible();
    await expect(page.locator('button:has-text("accessibility")')).toBeVisible();
    await expect(page.locator('button:has-text("privacy")')).toBeVisible();
    
    // Switch to Fix Page tab and verify typography sliders
    await page.click('button:has-text("Fix Page")');
    await expect(page.locator('text=Font Size Offset')).toBeVisible();
    await expect(page.locator('text=Line Height spacing')).toBeVisible();
  });
});
