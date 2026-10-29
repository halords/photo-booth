const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BOOTH_URL || 'http://localhost:3091';
const out = path.resolve('.artifacts/backgrounds'); fs.mkdirSync(out, { recursive: true });
let browser, page;
const errors = [];
const nav = name => page.locator('.primary-nav').getByRole('button', { name }).click();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('booth.settings')));
async function changed(selector, action) {
  await page.waitForFunction(s => document.querySelector(s)?.width === 480, selector);
  const before = await page.locator(selector).evaluate(cv => cv.toDataURL());
  await action();
  await page.waitForFunction(({ selector, before }) => document.querySelector(selector)?.toDataURL() !== before, { selector, before });
}
async function reviewed() { await page.waitForFunction(() => { const cv = document.querySelector('.review-preview canvas'); return cv?.width === 480 && !cv.classList.contains('updating'); }); }
async function save(name, textExpected) {
  await reviewed(); await page.getByRole('button', { name: 'Save my photo strip' }).click(); await page.locator('.print-strip').waitFor();
  await page.locator('.download-options select').selectOption('png');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  await (await pending).saveAs(path.join(out, name + '.png'));
  const exported = await page.evaluate(() => window.__lastExport);
  assert.equal(exported.text.length > 0, textExpected, 'Export contains frame text only when enabled');
  assert.equal(exported.width >= 1200, true);
  if (!textExpected) assert.deepEqual(exported.text, [], 'No titles, captions, dates, branding or frame numbers drawn in export');
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { (this.canvas.__frameText ||= []).push(String(text)); return fillText.call(this, text, ...args); };
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(...args) { window.__lastExport = { text: this.__frameText || [], width: this.width, height: this.height }; return toBlob.apply(this, args); };
  });
  await page.goto(base); await page.getByRole('heading', { name: /Life happens/ }).waitFor();
  const encoded = await page.evaluate(() => {
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 1200; const ctx = cv.getContext('2d');
    ctx.fillStyle = '#294c69'; ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = '#edbb73'; ctx.fillRect(0, 0, 900, 160); ctx.fillRect(0, 1120, 900, 80);
    ctx.fillStyle = '#c9746c'; ctx.fillRect(0, 160, 90, 960); ctx.fillStyle = '#8ab9ad'; ctx.fillRect(810, 160, 90, 960);
    ctx.fillStyle = '#294c69'; ctx.font = 'bold 52px Georgia'; ctx.textAlign = 'center'; ctx.fillText('YOUR EVENT DESIGN', 450, 105);
    ctx.clearRect(260, 1160, 380, 40); // Alpha must survive upload; frame color shows beneath it.
    return cv.toDataURL('image/png').split(',')[1];
  });
  const fixture = { name: 'custom-design.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') };
  fs.writeFileSync(path.join(out, fixture.name), fixture.buffer);
  await nav('Photo booth'); await page.getByRole('button', { name: 'The trio', exact: false }).click();
  await page.getByRole('tab', { name: 'Frame & filter' }).click();
  await page.getByRole('button', { name: 'Halloween', exact: true }).click();
  await page.getByTestId('strip-background').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await page.getByRole('alert').filter({ hasText: 'Choose a JPG' }).waitFor();
  await changed('.setup-preview canvas', () => page.getByTestId('strip-background').setInputFiles(fixture));
  await page.getByRole('button', { name: 'Replace background' }).waitFor();
  const artwork = (await state()).stripBackground.dataUrl; assert(artwork.startsWith('data:image/'));
  await changed('.setup-preview canvas', () => page.getByRole('checkbox', { name: 'Show frame text' }).uncheck());
  await changed('.setup-preview canvas', () => page.getByRole('combobox', { name: 'Background fit' }).selectOption('contain'));
  await changed('.setup-preview canvas', () => page.getByRole('slider', { name: 'Background vertical position' }).fill('1'));
  await changed('.setup-preview canvas', () => page.getByRole('combobox', { name: 'Background fit' }).selectOption('stretch'));
  assert.equal(await page.getByRole('slider', { name: 'Background vertical position' }).count(), 0);
  // The transparent area remains transparent rather than being converted to black.
  assert.equal(await page.evaluate(async data => { const img = new Image(); img.src = data; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0); return ctx.getImageData(450, 1180, 1, 1).data[3]; }, artwork), 0);
  await page.reload(); await nav('Photo booth'); await page.getByRole('tab', { name: 'Frame & filter' }).click();
  assert.equal((await state()).stripBackground.dataUrl, artwork); assert.equal(await page.getByRole('checkbox', { name: 'Show frame text' }).isChecked(), false);
  assert.equal(await page.getByRole('combobox', { name: 'Background fit' }).inputValue(), 'stretch');
  await page.screenshot({ path: path.join(out, 'strip-setup.png'), fullPage: true });
  await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click(); await save('custom-strip-no-text', false);
  await page.getByRole('button', { name: 'Edit', exact: true }).click(); await reviewed();
  await changed('.review-preview canvas', () => page.getByRole('checkbox', { name: 'Show frame text' }).check());
  await save('custom-strip-with-text', true);
  await page.getByRole('button', { name: 'Edit', exact: true }).click(); await reviewed();
  await changed('.review-preview canvas', () => page.getByRole('button', { name: 'Remove background', exact: true }).click());
  await page.getByRole('button', { name: 'Film', exact: true }).click();
  await changed('.review-preview canvas', () => page.getByRole('checkbox', { name: 'Show frame text' }).uncheck());
  await save('film-no-text', false); // Includes the film frame's per-photo numbering.
  await nav('Photo booth'); await page.getByRole('button', { name: 'Custom 4R', exact: false }).click();
  await changed('.setup-preview canvas', () => page.getByTestId('event-background').setInputFiles(fixture));
  await page.getByRole('checkbox', { name: 'Show frame text' }).uncheck();
  await page.getByRole('combobox', { name: 'Background fit' }).selectOption('stretch');
  await page.getByRole('combobox', { name: '4R orientation' }).selectOption('landscape');
  assert.equal(await page.getByRole('checkbox', { name: 'Show frame text' }).isChecked(), false, 'Changing orientation preserves text choice');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save layout file' }).click();
  const preset = path.join(out, 'custom-layout.json'); await (await pending).saveAs(preset);
  await page.getByRole('button', { name: 'Remove background', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show frame text' }).check();
  await page.getByTestId('layout-upload').setInputFiles(preset);
  await page.getByRole('button', { name: 'Remove background', exact: true }).waitFor();
  assert.equal((await state()).customLayout.backgroundOptions.showText, false, 'Layout file preserves text and artwork choices');
  await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click(); await save('custom-4r-landscape-no-text', false);
  await nav('Photo booth'); await page.getByRole('combobox', { name: '4R orientation' }).selectOption('portrait');
  await page.getByRole('button', { name: 'Just exploring? Try sample photos' }).click(); await save('custom-4r-portrait-no-text', false);
  await nav('Photo booth'); await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Frame & filter' }).click();
  await page.getByRole('heading', { name: 'Your own background' }).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, 'background-controls-mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: strip/4R artwork upload, transparency, fit/position, invalid files, reload persistence, orientation/layout round trips, text-free final exports, text restoration, film numbering removal, mobile layout.');
})().catch(async e => { console.error(e); if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
