const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { unzipSync } = require('fflate');
const base = process.env.BOOTH_URL || 'http://localhost:3091';
const out = path.resolve('.artifacts/sessions'); fs.mkdirSync(out, { recursive: true });
let browser, page;
async function nav(name) { await page.locator('.primary-nav').getByRole('button', { name }).click(); }
async function ready() { await page.waitForFunction(() => { const cv = document.querySelector('.review-preview canvas'); return cv?.width === 480 && !cv.classList.contains('updating'); }); }
async function finish() { await ready(); await page.getByRole('button', { name: 'Save my photo strip' }).click(); await page.locator('.print-strip').waitFor({ timeout: 90000 }); }
async function download(label, name) { const pending = page.waitForEvent('download'); await page.getByRole('button', { name: label, exact: true }).click(); const file = await pending; const dest = path.join(out, name || file.suggestedFilename()); await file.saveAs(dest); return fs.readFileSync(dest); }
async function pixel(x, y) { return page.locator('.print-strip').evaluate((img, [x, y]) => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return Array.from(ctx.getImageData(x, y, 1, 1).data); }, [x, y]); }
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  const source = await page.evaluate(() => {
    return ['#ee2222', '#2222ee', '#22aa22', '#cc22cc'].map(color => { const c = document.createElement('canvas'); c.width = 3200; c.height = 2400; const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1]; });
  });
  const images = source.map((data, i) => ({ name: `original-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }));
  await nav('Photo booth'); await page.getByRole('button', { name: /Double take/ }).click();
  await page.getByRole('button', { name: 'Two · different photos', exact: true }).click();
  await page.getByRole('button', { name: '600 DPI · fine print', exact: true }).click();
  await page.getByRole('button', { name: /Upload photos/ }).click();
  await page.getByRole('button', { name: 'Choose my photos', exact: true }).click();
  assert.equal(await page.locator('.shot-slot').count(), 4);
  await page.getByTestId('photo-upload').setInputFiles(images);
  await page.waitForFunction(() => document.querySelectorAll('.shot-slot.filled').length === 4);
  assert.deepEqual(await download('Download original photo 1', 'capture-original.png'), images[0].buffer, 'Capture download is byte-for-byte original');
  await page.getByRole('button', { name: /Make it yours/ }).click(); await finish();
  assert.deepEqual(await page.locator('.print-strip').evaluate(img => [img.naturalWidth, img.naturalHeight]), [2400, 3600]);
  assert.deepEqual((await pixel(600, 700)).slice(0, 3), [238, 34, 34]);
  assert.deepEqual((await pixel(1800, 700)).slice(0, 3), [34, 170, 34], 'Second strip uses a different sequence');
  const archive = await download('Download session ZIP', 'different-strips.zip');
  const entries = unzipSync(archive), names = Object.keys(entries), folder = names[0].split('/')[0];
  assert.equal(names.length, 6); assert(names.every(name => name.startsWith(folder + '/')));
  for (let i = 0; i < 4; i++) assert.deepEqual(Buffer.from(entries[`${folder}/shot-0${i + 1}.png`]), images[i].buffer);
  const png = Buffer.from(entries[folder + '/final-layout.png']);
  assert.equal(png.readUInt32BE(16), 2400); assert.equal(png.readUInt32BE(20), 3600);
  assert.equal(png.readUInt32BE(png.indexOf('pHYs') + 4), 23622, '600 DPI PNG metadata');
  const gif = Buffer.from(entries[folder + '/moments.gif']); fs.writeFileSync(path.join(out, 'moments.gif'), gif);
  assert.equal(gif.subarray(0, 6).toString(), 'GIF89a'); assert.equal(gif.readUInt16LE(6), 800); assert.equal(gif.readUInt16LE(8), 800); assert.equal(gif.at(-1), 0x3b);
  assert(gif.includes(Buffer.from('NETSCAPE2.0')), 'GIF loops');
  const jpg = await download('Download JPG', '600-dpi.jpg'); assert.equal(jpg.readUInt16BE(14), 600);
  await page.locator('.individual-shots summary').click();
  assert.deepEqual(await download('Download photo 1', 'result-original.png'), images[0].buffer);
  // Device-folder save keeps all originals alongside both generated assets.
  await page.evaluate(() => { window.__saved = []; window.showDirectoryPicker = async () => ({ getDirectoryHandle: async () => ({ getFileHandle: async name => ({ createWritable: async () => ({ write: async file => window.__saved.push([name, file.size]), close: async () => {} }) }) }) }); });
  await page.getByRole('button', { name: 'Save folder to device', exact: true }).click();
  await page.waitForFunction(() => window.__saved?.length === 6);
  assert.equal(await page.evaluate(() => window.__saved.find(([name]) => name === 'shot-01.png')[1]), images[0].buffer.length);
  await page.getByRole('button', { name: 'Create 24-hour link', exact: true }).click();
  const link = page.getByRole('textbox', { name: 'Session link' }); await link.waitFor({ timeout: 60000 });
  const url = await link.inputValue(); assert(url.startsWith(base + '/share/'));
  const id = url.split('/').at(-1);
  const friend = await browser.newContext(), friendPage = await friend.newPage(); await friendPage.goto(url);
  await friendPage.getByRole('heading', { name: 'Good times, shared.' }).waitFor();
  await friendPage.getByAltText('Shared photo booth layout').waitFor();
  assert.equal(await friendPage.locator('.shared-photo-grid img').count(), 4);
  assert(await friendPage.getByAltText('Animated GIF of the shared photo booth session').isVisible());
  const previewDownload = friendPage.waitForEvent('download'); await friendPage.getByRole('button', { name: 'Download photo 1', exact: true }).click();
  const previewFile = path.join(out, 'friend-original.png'); await (await previewDownload).saveAs(previewFile);
  assert.deepEqual(fs.readFileSync(previewFile), images[0].buffer, 'Shared preview downloads the untouched original');
  await friendPage.setViewportSize({ width: 390, height: 844 });
  assert(await friendPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Shared gallery fits mobile');
  await friendPage.screenshot({ path: path.join(out, 'shared-gallery-mobile.png'), fullPage: true });
  const shared = await friend.request.get(base + '/api/shares/' + id + '/download');
  assert.equal(shared.status(), 200); assert.match(shared.headers()['cache-control'], /no-store/); assert.deepEqual(await shared.body(), archive);
  await friend.close();
  // New galleries use cache only; reload retains original files and GIF.
  assert.deepEqual(await page.evaluate(() => indexedDB.databases()), []);
  await page.reload(); await nav('My gallery'); await page.locator('.gallery-open').first().click(); await page.locator('.print-strip').waitFor();
  await page.locator('.individual-shots summary').click(); assert.deepEqual(await download('Download photo 1', 'reopened-original.png'), images[0].buffer);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile result does not overflow');
  await page.screenshot({ path: path.join(out, 'result-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await nav('Photo booth');
  await page.getByRole('button', { name: 'Two · same photos', exact: true }).click(); await page.getByRole('button', { name: '300 DPI · standard print', exact: true }).click();
  await page.getByRole('button', { name: 'Choose my photos', exact: true }).click(); assert.equal(await page.locator('.shot-slot').count(), 2);
  await page.getByTestId('photo-upload').setInputFiles(images.slice(0, 2)); await page.getByRole('button', { name: /Make it yours/ }).click(); await finish();
  assert.deepEqual(await page.locator('.print-strip').evaluate(img => [img.naturalWidth, img.naturalHeight]), [1200, 1800]);
  assert.deepEqual(await pixel(300, 350), await pixel(900, 350), 'Matching strips repeat the same photos');
  await page.screenshot({ path: path.join(out, 'same-strips.png'), fullPage: true });
  const api = context.request;
  assert.equal((await api.post(base + '/api/shares', { headers: { 'Content-Type': 'application/zip' }, data: Buffer.from('invalid') })).status(), 400);
  assert.equal((await api.post(base + '/api/shares', { headers: { 'Origin': 'https://unrelated.invalid', 'Content-Type': 'application/json' }, data: JSON.stringify({ name: 'test.zip', size: 100 }) })).status(), 403);
  assert.equal((await api.post(base + '/api/shares', { data: { name: 'large.zip', size: 251 * 1024 * 1024 } })).status(), 413);
  assert.equal((await api.get(base + '/api/shares/' + '0'.repeat(48))).status(), 404);
  // Expire only this test-created local object and prove the file is removed.
  if (process.env.BOOTH_SHARE_DIR) {
    const dir = path.resolve(process.env.BOOTH_SHARE_DIR, id); assert.equal(path.dirname(dir), path.resolve(process.env.BOOTH_SHARE_DIR));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'info.json'))); meta.expiresAt = Date.now() - 1000; fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(meta));
    assert.equal((await api.get(base + '/api/shares/' + id + '/download')).status(), 404); assert(!fs.existsSync(dir));
  }
  const cameraContext = await browser.newContext();
  await cameraContext.addInitScript(data => {
    window.ImageCapture = class {
      async takePhoto(...args) { window.__stillArgs = args; const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0)); return new Blob([bytes], { type: 'image/png' }); }
    };
  }, source[0]);
  const cameraPage = await cameraContext.newPage(); await cameraPage.goto(base);
  await cameraPage.locator('.primary-nav').getByRole('button', { name: 'Photo booth' }).click();
  await cameraPage.getByRole('button', { name: /Double take/ }).click(); await cameraPage.getByRole('button', { name: 'No timer', exact: true }).click();
  await cameraPage.getByRole('button', { name: 'Enter the booth', exact: true }).click(); await cameraPage.waitForFunction(() => !document.querySelector('.shutter').disabled);
  await cameraPage.getByRole('button', { name: 'Start capture sequence', exact: true }).click(); await cameraPage.waitForFunction(() => document.querySelectorAll('.shot-slot.filled').length === 2);
  assert.deepEqual(await cameraPage.evaluate(() => window.__stillArgs), [], 'Still capture does not override the camera default resolution');
  const stillDownload = cameraPage.waitForEvent('download'); await cameraPage.getByRole('button', { name: 'Download original photo 1', exact: true }).click();
  const stillFile = path.join(out, 'still-original.png'); await (await stillDownload).saveAs(stillFile); assert.deepEqual(fs.readFileSync(stillFile), images[0].buffer);
  await cameraContext.close();
  assert.deepEqual(errors, []); console.log('PASS: original bytes/resolution, 300/600 DPI, both strip modes, GIF, folder/ZIP saves, cache reopen, independent shared download, expiry, limits, mobile.');
})().catch(async error => { console.error(error); if (page) { await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); console.error(await page.locator('main').innerText()); } process.exitCode = 1; }).finally(async () => { await browser?.close(); });
