import { test } from '@playwright/test';
import { TaxSimulatorPage } from '../src/pages/tax-simulator.page';
import { getTestsByProductCount } from '../src/data/excel-reader';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

// Helper to fetch a URL and return the body as a string
function fetchUrl(url: string): Promise<{ body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk: string) => (data += chunk));
      res.on('end', () =>
        resolve({ body: data, contentType: res.headers['content-type'] || '' }),
      );
    }).on('error', reject);
  });
}

for (const groupId of [1, 2, 3] as const) {
  const groupTests = getTestsByProductCount(groupId);

  test.describe(`Script ${groupId}`, () => {
    // Intercept cross-origin bkstr.com resources blocked by ORB in headless mode
    test.beforeEach(async ({ page }) => {
      await page.route('**/www.bkstr.com/**', async (route) => {
        const url = route.request().url();
        try {
          const { body } = await fetchUrl(url);
          const contentType = url.endsWith('.js')
            ? 'application/javascript'
            : url.endsWith('.css')
              ? 'text/css'
              : 'application/octet-stream';
          await route.fulfill({ body, contentType });
        } catch {
          await route.abort();
        }
      });
    });

    // Capture full-page screenshot after every test
    test.afterEach(async ({ page }, testInfo) => {
      const screenshotDir = testInfo.outputDir;
      fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotPath = path.join(screenshotDir, 'screenshot.png');
      await page.screenshot({ fullPage: true, path: screenshotPath });
      await testInfo.attach('screenshot', { path: screenshotPath, contentType: 'image/png' });
    });

    for (const data of groupTests) {
      test(`${data.TestCaseName} | Store: ${data.StoreModel} | Product1: ${data.ProductItem1} | ${data.RequestType}`, async ({
        page,
      }) => {
        const taxSimulator = new TaxSimulatorPage(page);
        await taxSimulator.executeTestCase(data);
      });
    }
  });
}
