const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BOOTH_URL || 'http://localhost:3091';
const out = path.resolve('.artifacts'); fs.mkdirSync(out, { recursive: true });
const photo = path.resolve('public/photos/portrait-1.jpg');
const friends = path.resolve('public/photos/friends.jpg');
const errors = [];
let browser, activePage;
async function checkCanvas(page) {
  await page.waitForFunction(() => { const cv = document.querySelector('.review-preview canvas'); return cv?.width === 480 && !cv.classList.contains('updating'); });
  assert(await page.locator('.review-preview canvas').evaluate(cv => { const d = cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let min=255,max=0; for(let i=0;i<d.length;i+=100){min=Math.min(min,d[i]);max=Math.max(max,d[i]);} return max-min>60; }), 'Preview has photo pixels');
}
async function overflow(page, label) {
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert(widths.scroll <= widths.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(widths)}`);
}
async function nav(page, label) { await page.locator('.primary-nav').getByRole('button', { name: label }).click(); }
async function download(page, format, name) {
  await page.locator('.download-options select').selectOption(format);
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download ' + format.toUpperCase(), exact: true }).click();
  const item = await pending; assert(item.suggestedFilename().endsWith('.' + format));
  const dest = path.join(out, name + '.' + format); await item.saveAs(dest); return dest;
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
  const page = await context.newPage(); activePage = page; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.getByRole('heading', { name: /Life happens/ }).waitFor();
  await overflow(page, 'Desktop home'); await page.screenshot({ path: path.join(out,'home-desktop.png'), fullPage:true });
  await page.getByRole('button', { name:'A little help' }).click(); assert(await page.locator('dialog').isVisible()); await page.keyboard.press('Escape');
  await page.getByRole('button', { name:'Try with sample photos' }).click(); await checkCanvas(page);
  await page.getByRole('tab', { name:'Filter', exact:true }).click(); await page.getByRole('button', { name:'B&W', exact:true }).click(); await checkCanvas(page);
  await page.getByRole('tab', { name:'Photos', exact:true }).click(); await page.getByRole('button', { name:'Rotate', exact:true }).click();
  await page.getByRole('button', { name:'Move photo later' }).click(); await page.getByRole('button', { name:'Flip', exact:true }).click();
  await page.getByRole('slider', { name:'Zoom' }).fill('1.5'); await checkCanvas(page);
  await page.getByRole('tab', { name:'Details', exact:true }).click(); await page.getByPlaceholder('Saturday with my people').fill('Birthday test');
  await page.getByPlaceholder('a little moment, forever.').fill('A memory worth keeping'); await checkCanvas(page);
  await page.getByRole('button', { name:'Save my photo strip' }).click(); await page.locator('.print-strip').waitFor();
  const jpg = await download(page,'jpg','classic'); assert(fs.readFileSync(jpg).subarray(0,2).equals(Buffer.from([255,216])));
  await page.getByRole('button', { name:'Favorite', exact:true }).click(); await page.getByRole('button',{name:'Favorited',exact:true}).waitFor();
  await nav(page,'My gallery'); await page.getByRole('button',{name:'Open Birthday test'}).waitFor();
  await page.reload(); await nav(page,'My gallery'); await page.getByRole('button',{name:'Open Birthday test'}).waitFor();
  await page.getByRole('textbox',{name:'Search photo strips'}).fill('missing'); assert(await page.getByRole('heading',{name:'No memories found.'}).isVisible());
  await page.getByRole('textbox',{name:'Search photo strips'}).fill('Birthday'); await page.getByRole('button',{name:'Favorites',exact:true}).click();
  await page.getByRole('button',{name:'Open Birthday test'}).click(); await page.locator('.print-strip').waitFor();
  assert.equal(await page.getByRole('button',{name:'Edit',exact:true}).count(),0,'Persisted strip exports without pretending originals survive reload');
  await nav(page,'Photo booth'); await page.getByRole('button',{name:'Custom 4R',exact:false}).click(); await page.locator('.layout-designer-stage canvas').waitFor();
  await page.getByRole('button',{name:'+ Add frame'}).click(); assert.equal(await page.locator('.photo-placeholder').count(),4);
  await page.getByRole('button',{name:'Remove selected placeholder'}).click(); assert.equal(await page.locator('.photo-placeholder').count(),3);
  await page.getByRole('combobox',{name:'Selected placeholder'}).selectOption('0');
  await page.getByRole('spinbutton',{name:'Placeholder Width',exact:true}).fill('68');
  await page.getByRole('spinbutton',{name:'Placeholder Angle',exact:true}).fill('8');
  const before = await page.locator('.photo-placeholder').first().evaluate(el => el.style.left);
  await page.locator('.photo-placeholder').first().focus(); await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('.photo-placeholder').first().evaluate(el => el.style.left),before);
  const box = await page.locator('.photo-placeholder').first().boundingBox();
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5); await page.mouse.down(); await page.mouse.move(box.x+box.width*.5+8,box.y+box.height*.5+8,{steps:3}); await page.mouse.up();
  await page.getByRole('tab',{name:'Personal touches'}).click(); await page.getByPlaceholder('Saturday with my people').fill('Mia turns 18');
  await page.getByPlaceholder('a little moment, forever.').fill('Thanks for celebrating with me!');
  await page.getByRole('tab',{name:'Layout & camera'}).click(); await page.screenshot({path:path.join(out,'4r-designer.png'),fullPage:true});
  const layoutDownload = page.waitForEvent('download'); await page.getByRole('button',{name:'Save layout file',exact:true}).click();
  const layoutFile = path.join(out,'event-layout.json'); await (await layoutDownload).saveAs(layoutFile); assert.equal(JSON.parse(fs.readFileSync(layoutFile)).layout.slots.length,3);
  await page.getByRole('button',{name:'+ Add frame'}).click(); await page.getByTestId('layout-upload').setInputFiles(layoutFile); await page.waitForFunction(()=>document.querySelectorAll('.photo-placeholder').length===3);
  await page.getByRole('button',{name:'Just exploring? Try sample photos'}).click(); await checkCanvas(page);
  await page.screenshot({path:path.join(out,'4r-review.png'),fullPage:true});
  await page.getByRole('button',{name:'Save my photo strip'}).click(); await page.locator('.print-strip').waitFor();
  let dims = await page.locator('.print-strip').evaluate(img => [img.naturalWidth,img.naturalHeight]); assert.deepEqual(dims,[1200,1800]);
  const png = await download(page,'png','birthday-4r'); const data=fs.readFileSync(png); assert.equal(data.readUInt32BE(16),1200); assert.equal(data.readUInt32BE(20),1800);
  const density=data.indexOf('pHYs'); assert(density>0); assert.equal(data.readUInt32BE(density+4),11811,'300 DPI PNG density');
  const jpg4 = fs.readFileSync(await download(page,'jpg','birthday-4r')); assert.equal(jpg4[13],1); assert.equal(jpg4.readUInt16BE(14),300);
  await nav(page,'Photo booth'); await page.getByRole('combobox',{name:'4R orientation'}).selectOption('landscape');
  await page.getByTestId('event-background').setInputFiles(friends); await page.getByRole('button',{name:'Remove background',exact:true}).waitFor();
  await page.getByRole('button',{name:'Just exploring? Try sample photos'}).click(); await checkCanvas(page);
  await page.getByRole('button',{name:'Save my photo strip'}).click(); await page.locator('.print-strip').waitFor();
  dims=await page.locator('.print-strip').evaluate(img=>[img.naturalWidth,img.naturalHeight]);assert.deepEqual(dims,[1800,1200]); await download(page,'png','landscape-4r');
  await nav(page,'Photo booth'); await page.getByRole('button',{name:'Double take',exact:false}).click();
  await page.getByRole('button',{name:'Upload photos',exact:false}).click(); await page.getByRole('button',{name:'Choose my photos',exact:true}).click();
  await page.getByTestId('photo-upload').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});
  await page.getByRole('status').filter({hasText:'Choose an image file'}).waitFor();
  await page.getByTestId('photo-upload').setInputFiles([photo,friends]); await page.getByRole('button',{name:'Make it yours',exact:false}).click(); await checkCanvas(page);
  await page.getByRole('tab',{name:'Photos',exact:true}).click(); await page.getByTestId('replace-photo').setInputFiles(friends); await checkCanvas(page);
  for(const layout of ['Four square','The whole crew','Contact sheet','Six moments','Solo portrait']) {
    await nav(page,'Photo booth');await page.getByRole('button',{name:layout,exact:false}).click(); await page.getByRole('button',{name:'Just exploring? Try sample photos'}).click();await checkCanvas(page);
    await page.getByRole('button',{name:'Film',exact:true}).click();await checkCanvas(page);
  }
  // Fake camera covers a complete timed session, a retake, and cancellation.
  await nav(page,'Photo booth');await page.getByRole('button',{name:'Double take',exact:false}).click();await page.getByRole('button',{name:'Live camera',exact:false}).click();
  await page.getByRole('button',{name:'No timer',exact:true}).click();await page.getByRole('button',{name:'Enter the booth',exact:true}).click();
  await page.getByRole('button',{name:'Start capture sequence',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('.shutter').disabled);
  await page.getByRole('button',{name:'Start capture sequence',exact:true}).click();await page.getByRole('button',{name:'Make it yours',exact:false}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.capture-rail>.btn').disabled); assert.equal(await page.locator('.shot-slot.filled').count(),2);
  await page.getByRole('button',{name:'Replace photo 1',exact:true}).click();await page.getByRole('button',{name:'Start capture sequence',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.capture-rail>.btn').disabled);
  await page.getByRole('button',{name:'Make it yours',exact:false}).click(); await checkCanvas(page);
  await nav(page,'Photo booth');await page.getByRole('button',{name:'3 sec',exact:true}).click();await page.getByRole('button',{name:'Enter the booth',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.shutter').disabled);
  await page.getByRole('button',{name:'Start capture sequence',exact:true}).click();await page.locator('.countdown').waitFor();await page.keyboard.press('Escape');await page.waitForTimeout(3300);assert.equal(await page.locator('.shot-slot.filled').count(),0);
  const track = await page.locator('video').evaluate(video => { window.__boothTrack=video.srcObject.getVideoTracks()[0];return window.__boothTrack.readyState; });assert.equal(track,'live');
  await nav(page,'Overview');assert.equal(await page.evaluate(()=>window.__boothTrack.readyState),'ended');
  await nav(page,'Photo booth');await page.getByRole('button',{name:'Custom 4R',exact:false}).click();await page.getByRole('button',{name:'No timer',exact:true}).click();await page.getByRole('button',{name:'Enter the booth',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.shutter').disabled);
  await page.getByRole('button',{name:'Start capture sequence',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.capture-rail>.btn').disabled);assert.equal(await page.locator('.shot-slot.filled').count(),3);
  await page.getByRole('button',{name:'Make it yours',exact:false}).click();await checkCanvas(page);await page.getByRole('button',{name:'Save my photo strip'}).click();await page.locator('.print-strip').waitFor();assert.deepEqual(await page.locator('.print-strip').evaluate(img=>[img.naturalWidth,img.naturalHeight]),[1800,1200]);
  await nav(page,'Overview');
  await page.setViewportSize({width:390,height:844});await overflow(page,'Mobile home');await page.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true});
  await page.locator('.mobile-nav').getByRole('button',{name:'Booth',exact:true}).click();await page.getByRole('button',{name:'Custom 4R',exact:false}).click();await overflow(page,'Mobile designer');await page.screenshot({path:path.join(out,'4r-mobile.png'),fullPage:true});
  await page.locator('.mobile-nav').getByRole('button',{name:'Gallery',exact:true}).click();await overflow(page,'Mobile gallery');
  await page.getByRole('button',{name:'Delete Birthday test',exact:true}).click();await page.getByRole('button',{name:'Delete',exact:true}).click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.gallery-card h3')).some(el=>el.textContent==='Birthday test'));
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForTimeout(500);
  await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:/Life happens/}).waitFor();await page.locator('.mobile-nav').getByRole('button',{name:'Gallery',exact:true}).click();await page.locator('.gallery-card').first().waitFor();await context.setOffline(false);
  const deniedContext = await browser.newContext();const deniedPage=await deniedContext.newPage();
  await deniedPage.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Blocked for test','NotAllowedError');};});
  await deniedPage.goto(base);await nav(deniedPage,'Photo booth');await deniedPage.getByRole('button',{name:'Enter the booth',exact:true}).click();await deniedPage.getByText('Camera access is blocked.',{exact:false}).waitFor();
  await deniedPage.getByRole('button',{name:'Upload photos',exact:true}).click();assert(await deniedPage.locator('.upload-zone').isVisible());await deniedContext.close();
  await context.close();assert.deepEqual(errors,[],'No runtime errors');console.log('PASS: desktop/mobile UI, editing, custom 4R capture, layout reuse, 300 DPI exports, uploads, gallery persistence/deletion, offline reload, permission fallback, retake, cancellation, stream cleanup.');
})().catch(async error=>{console.error(error);if(activePage){await activePage.screenshot({path:path.join(out,'failure.png'),fullPage:true});console.error(await activePage.locator('main').innerText(),errors);}process.exitCode=1;}).finally(async()=>{await browser?.close();});
