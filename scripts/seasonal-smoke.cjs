const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BOOTH_URL || 'http://localhost:3091';
const out = path.resolve('.artifacts/seasonal');
fs.mkdirSync(out, { recursive: true });
let browser, page;
const errors = [];
const settings = () => page.evaluate(() => JSON.parse(localStorage.getItem('booth.settings')));
const nav = label => page.locator('.primary-nav').getByRole('button', { name: label }).click();
async function readyReview() {
  await page.waitForFunction(() => {
    const cv = document.querySelector('.review-preview canvas');
    return cv?.width === 480 && !cv.classList.contains('updating');
  });
}
async function changeCanvas(selector, action) {
  await page.waitForFunction(s => document.querySelector(s)?.width === 480, selector);
  const before = await page.locator(selector).evaluate(cv => cv.toDataURL());
  await action();
  await page.waitForFunction(({ selector, before }) => document.querySelector(selector)?.toDataURL() !== before, { selector, before });
}
async function savePrint(name, dimensions) {
  await readyReview();
  await page.getByRole('button', { name: 'Save my photo strip', exact: true }).click();
  await page.locator('.print-strip').waitFor();
  await page.waitForFunction(() => document.querySelector('.print-strip')?.naturalWidth > 0);
  const dims = await page.locator('.print-strip').evaluate(img => [img.naturalWidth, img.naturalHeight]);
  if (dimensions) assert.deepEqual(dims, dimensions);
  await page.locator('.download-options select').selectOption('png');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const item = await pending;
  assert(item.suggestedFilename().startsWith(name.startsWith('halloween') ? 'pglu-halloween-special' : 'merry-christmas'));
  const dest = path.join(out, name + '.png'); await item.saveAs(dest);
  const data = fs.readFileSync(dest);
  assert.deepEqual([data.readUInt32BE(16), data.readUInt32BE(20)], dims);
  const density = data.indexOf('pHYs'); assert(density > 0); assert.equal(data.readUInt32BE(density + 4), 11811);
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.getByRole('heading', { name: /Life happens/ }).waitFor();
  for (const theme of ['halloween', 'christmas']) {
    const label = theme === 'halloween' ? 'Halloween' : 'Christmas';
    await nav('Photo booth');
    await page.getByRole('button', { name: 'The trio', exact: false }).click();
    await page.getByRole('tab', { name: 'Frame & filter', exact: true }).click();
    await changeCanvas('.setup-preview canvas', () => page.getByRole('button', { name: label, exact: true }).click());
    const stored = await settings(); assert.equal(stored.template, theme); assert.equal(stored.customLayout.decoration, theme);
    assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: label, exact: true }).locator('img').waitFor();
    await page.screenshot({ path: path.join(out, theme + '-setup.png'), fullPage: true });
    await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click();
    await savePrint(theme + '-strip');
    await nav('My gallery');
    await page.getByRole('button', { name: 'Open ' + (theme === 'halloween' ? 'PGLU Halloween Special' : 'Merry Christmas'), exact: true }).first().waitFor();
    await page.reload(); await nav('Photo booth');
    await page.getByRole('button', { name: 'Custom 4R', exact: false }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Occasion style' }).inputValue(), theme, 'Seasonal occasion survives reload');
    for (const orientation of ['portrait', 'landscape']) {
      await page.getByRole('combobox', { name: '4R orientation' }).selectOption(orientation);
      const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save layout file', exact: true }).click();
      const layoutFile = path.join(out, theme + '-' + orientation + '.json'); await (await pending).saveAs(layoutFile);
      const preset = JSON.parse(fs.readFileSync(layoutFile)); assert.equal(preset.layout.decoration, theme); assert.equal(preset.template, theme);
      await page.getByRole('combobox', { name: 'Occasion style' }).selectOption('minimal');
      await page.getByTestId('layout-upload').setInputFiles(layoutFile);
      await page.waitForFunction(theme => JSON.parse(localStorage.getItem('booth.settings')).customLayout.decoration === theme, theme);
      assert.equal(await page.getByRole('combobox', { name: 'Occasion style' }).inputValue(), theme);
      await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click();
      await savePrint(theme + '-4r-' + orientation, orientation === 'portrait' ? [1200, 1800] : [1800, 1200]);
      await nav('Photo booth');
    }
  }
  // Switching occasion in the review editor updates the print, not only the stored value.
  await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click(); await readyReview();
  await changeCanvas('.review-preview canvas', () => page.getByRole('combobox', { name: 'Occasion style' }).selectOption('halloween'));
  await readyReview(); assert.equal((await settings()).template, 'halloween');
  await page.getByRole('tab', { name: 'Details', exact: true }).click();
  await changeCanvas('.review-preview canvas', () => page.getByPlaceholder('Saturday with my people').fill('PGLU Costume Night'));
  await changeCanvas('.review-preview canvas', () => page.getByPlaceholder('a little moment, forever.').fill('Boo crew, together!'));
  await page.getByRole('tab', { name: 'Frame', exact: true }).click();
  await page.getByTestId('event-background').setInputFiles(path.resolve('public/photos/friends.jpg'));
  await page.getByRole('button', { name: 'Remove background', exact: true }).waitFor();
  await readyReview();
  assert.equal((await settings()).customLayout.decoration, 'halloween');
  await changeCanvas('.review-preview canvas', () => page.getByRole('button', { name: 'Remove background', exact: true }).click());
  await nav('Photo booth'); await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Frame & filter', exact: true }).click();
  await page.getByRole('button', { name: 'Halloween', exact: true }).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No mobile overflow');
  await page.screenshot({ path: path.join(out, 'halloween-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  assert.equal((await settings()).customLayout.decoration, 'minimal', 'A standard template clears the seasonal occasion');
  assert.deepEqual(errors, [], 'No runtime errors');
  console.log('PASS: seasonal strips, PGLU branding/gallery names, portrait/landscape 4R, 300 DPI exports, saved preferences, layout round trips, review changes, custom text/backgrounds, mobile layout.');
})().catch(async error => { console.error(error); if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
