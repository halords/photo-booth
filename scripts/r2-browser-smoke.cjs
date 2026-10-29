const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { loadEnvConfig } = require('@next/env');
const { S3Client, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { unzipSync } = require('fflate');
loadEnvConfig(process.cwd());
const base = process.env.BOOTH_URL || 'http://localhost:3091';
const endpoint = new URL(process.env.R2_ENDPOINT); endpoint.pathname = '/';
const client = new S3Client({ region: 'auto', endpoint: endpoint.toString(), credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
let browser, key;
(async () => {
  const archive = fs.readFileSync(path.resolve('.artifacts/sessions/different-strips.zip'));
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  const context = await browser.newContext(), page = await context.newPage();
  await page.goto(base);
  const signed = await page.evaluate(async size => {
    const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'photobooth-browser-test.zip', size }) });
    if (!response.ok) throw new Error('Upload preparation failed: ' + response.status);
    return response.json();
  }, archive.length);
  assert.equal(signed.storage, 'r2'); assert.match(signed.id, /^[a-f0-9]{48}$/); key = 'sessions/' + signed.id + '.zip';
  const uploaded = await page.evaluate(async ({ signed, data }) => {
    const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
    const response = await fetch(signed.uploadUrl, { method: 'PUT', headers: signed.headers, body: bytes });
    return response.status;
  }, { signed, data: archive.toString('base64') });
  assert.equal(uploaded, 200, 'Real browser upload passes R2 CORS and signature validation');
  const friend = await browser.newContext({ viewport: { width: 390, height: 844 } }), friendPage = await friend.newPage();
  await friendPage.goto(base + signed.url);
  await friendPage.getByAltText('Shared photo booth layout').waitFor({ timeout: 45000 });
  assert.equal(await friendPage.locator('.shared-photo-grid img').count(), 4);
  await friendPage.getByAltText('Animated GIF of the shared photo booth session').waitFor();
  const download = friendPage.waitForEvent('download'); await friendPage.getByRole('button', { name: 'Download photo 1', exact: true }).click();
  const dest = path.resolve('.artifacts/sessions/r2-friend-original.png'); await (await download).saveAs(dest);
  const entries = unzipSync(archive), originalName = Object.keys(entries).find(name => name.endsWith('/shot-01.png'));
  assert.deepEqual(fs.readFileSync(dest), Buffer.from(entries[originalName]));
  assert(await friendPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await friendPage.screenshot({ path: path.resolve('.artifacts/sessions/r2-shared-gallery-mobile.png'), fullPage: true });
  const signedDownload = await friend.request.get(base + '/api/shares/' + signed.id + '/download', { maxRedirects: 0 });
  assert.equal(signedDownload.status(), 302);
  const downloadUrl = new URL(signedDownload.headers().location);
  assert(Number(downloadUrl.searchParams.get('X-Amz-Expires')) <= 300);
  assert.match(signedDownload.headers()['cache-control'], /no-store/);
  await friend.close();
  console.log('PASS: live R2 browser upload, CORS, app sharing URL, preview gallery, GIF, original-photo download, mobile layout, and short-lived signed downloads.');
})().catch(error => { console.error(error.name + ': ' + String(error.message).split(process.env.R2_SECRET_ACCESS_KEY).join('[redacted]').split(process.env.R2_ACCESS_KEY_ID).join('[redacted]')); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (key) {
    await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    try { await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key })); throw new Error('Test cleanup failed.'); }
    catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
    console.log('Browser-test object deleted and verified absent.');
  }
  client.destroy();
});
