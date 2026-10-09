/* Booth — session state machine: home → setup → capture → review → result.
 * Capture has two modes:
 *   native — per-shot tap opens the iPhone Camera app (file input)
 *   pro    — in-app viewfinder (getUserMedia) with auto-fire countdown
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const VIEWS = ['home', 'setup', 'capture', 'review', 'result'];

  const S = {
    settings: {
      eventName: localStorage.getItem('booth.eventName') || '',
      layout: 'strip4',
      mode: 'native',       // 'native' | 'pro'
      camera: 'user',       // 'user' | 'environment'
      countdown: 3,         // seconds, pro mode only
      filter: 'natural',
      template: 'editorial',
      caption: '',
    },
    shots: [],
    stripCanvas: null,
    stripNo: 1,
    cancelled: false,
    cdTimer: null,
  };

  /* ---------- view router ---------- */

  function show(name) {
    VIEWS.forEach((v) => { $('view-' + v).hidden = v !== name; });
    window.scrollTo(0, 0);
  }

  let toastT = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 2800);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- pickers ---------- */

  function wirePicker(container, attr, cb) {
    if (!container) return;
    container.querySelectorAll('[data-' + attr + ']').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-' + attr + ']').forEach((b) => {
          b.classList.remove('selected');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
        cb(btn.dataset[attr]);
      });
    });
  }

  function syncPicker(container, attr, value) {
    if (!container) return;
    container.querySelectorAll('[data-' + attr + ']').forEach((b) => {
      const on = String(b.dataset[attr]) === String(value);
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  /* ---------- home / gallery ---------- */

  async function renderGallery() {
    const items = await Store.all().catch(() => []);
    const g = $('gallery');
    g.innerHTML = '';
    $('gallery-empty').hidden = items.length > 0;
    $('gallery-count').textContent = items.length ? `${items.length} STRIP${items.length > 1 ? 'S' : ''}` : '';
    items.forEach((it) => {
      const d = document.createElement('div');
      d.className = 'g-item';
      const img = document.createElement('img');
      img.src = it.dataUrl;
      img.alt = it.eventName || 'Photo booth strip';
      const meta = document.createElement('div');
      meta.className = 'g-meta';
      const span = document.createElement('span');
      span.textContent = it.eventName || 'Untitled';
      const del = document.createElement('button');
      del.className = 'g-del';
      del.textContent = 'Delete';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Store.del(it.id);
        renderGallery();
      });
      meta.append(span, del);
      d.append(img, meta);
      img.addEventListener('click', () => {
        const full = new Image();
        full.onload = () => {
          const cv = document.createElement('canvas');
          cv.width = full.naturalWidth;
          cv.height = full.naturalHeight;
          cv.getContext('2d').drawImage(full, 0, 0);
          S.stripCanvas = cv;
          S.resultDataUrl = it.dataUrl;
          S.resultName = slug(it.eventName) + '.jpg';
          $('result-img').src = it.dataUrl;
          show('result');
        };
        full.src = it.dataUrl;
      });
      g.appendChild(d);
    });
  }

  function slug(name) {
    return ((name || 'booth').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'booth');
  }

  /* ---------- native capture ---------- */

  function shotCount() {
    return Compose.shotsFor(S.settings.layout);
  }

  function renderNativeCapture() {
    const n = shotCount();
    $('cap-title').textContent = `Shot ${Math.min(S.shots.filter(Boolean).length + 1, n)} of ${n}`;
    const dots = $('shot-dots');
    dots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (S.shots[i] ? ' done' : i === S.shots.filter(Boolean).length ? ' now' : '');
      d.textContent = i + 1;
      dots.appendChild(d);
    }
    const th = $('shot-thumbs');
    th.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const t = document.createElement('div');
      t.className = 'thumb' + (S.shots[i] ? '' : ' empty');
      if (S.shots[i]) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(S.shots[i].file);
        const num = document.createElement('span');
        num.className = 'n';
        num.textContent = i + 1;
        const rt = document.createElement('button');
        rt.className = 'retake';
        rt.textContent = 'Retake';
        rt.addEventListener('click', (e) => { e.stopPropagation(); shootNative(i); });
        t.append(img, num, rt);
      } else {
        t.textContent = i + 1;
      }
      th.appendChild(t);
    }
    const complete = S.shots.length === n && S.shots.every(Boolean);
    $('btn-to-review').disabled = !complete;
    $('btn-shutter').style.display = S.shots.filter(Boolean).length >= n ? 'none' : '';
  }

  async function shootNative(index) {
    try {
      const file = await Capture.takePhoto(S.settings.camera);
      const img = await Compose.loadPhoto(file);
      S.shots[index] = { file, img };
      renderNativeCapture();
    } catch (err) {
      if (err && err.message !== 'cancelled') toast(err.message || 'Camera failed.');
    }
  }

  /* ---------- pro capture ---------- */

  function beep(freq, dur) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      S._ac = S._ac || new AC();
      const o = S._ac.createOscillator();
      const g = S._ac.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.18, S._ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, S._ac.currentTime + dur);
      o.connect(g); g.connect(S._ac.destination);
      o.start(); o.stop(S._ac.currentTime + dur);
    } catch (e) { /* audio unavailable — countdown still works */ }
  }

  function vfHud() {
    const done = S.shots.filter(Boolean).length;
    const n = shotCount();
    $('vf-shot').textContent = `Shot ${Math.min(done + 1, n)} of ${n}`;
    $('vf-status').textContent = S.cancelled ? 'Cancelled' : 'Get ready…';
    const th = $('pro-thumbs');
    th.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const t = document.createElement('div');
      t.className = 'thumb' + (S.shots[i] ? '' : ' empty');
      if (S.shots[i]) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(S.shots[i].file);
        t.appendChild(img);
      } else {
        t.textContent = i + 1;
      }
      th.appendChild(t);
    }
  }

  function countdown(sec) {
    return new Promise((resolve) => {
      const el = $('vf-count');
      if (!sec || sec <= 0) return resolve();
      let left = sec;
      el.textContent = left;
      el.hidden = false;
      beep(520, 0.12);
      S.cdTimer = setInterval(() => {
        if (S.cancelled) { clearInterval(S.cdTimer); el.hidden = true; return resolve(); }
        left -= 1;
        if (left <= 0) {
          clearInterval(S.cdTimer);
          el.hidden = true;
          beep(880, 0.22);
          return resolve();
        }
        el.textContent = left;
        beep(520, 0.12);
      }, 1000);
    });
  }

  function flash() {
    const f = $('vf-flash');
    f.hidden = false;
    setTimeout(() => { f.hidden = true; }, 140);
  }

  async function runProSession() {
    const n = shotCount();
    S.cancelled = false;
    vfHud();
    for (let i = 0; i < n; i++) {
      if (S.cancelled) break;
      await countdown(S.settings.countdown);
      if (S.cancelled) break;
      try {
        flash();
        const frame = ProCamera.capture(S.settings.camera === 'user');
        const file = await ProCamera.canvasToFile(frame, `shot-${i + 1}.jpg`);
        const img = await Compose.loadPhoto(file);
        S.shots[i] = { file, img };
      } catch (err) {
        toast('Capture failed — try again.');
        break;
      }
      vfHud();
      await wait(650);
    }
    ProCamera.stop();
    if (S.cancelled) {
      // keep partial shots; fall back to native UI to finish manually
      S.settings.mode = 'native';
      syncPicker(document.querySelector('#view-setup [data-mode]')?.parentElement, 'mode', 'native');
      enterCapture();
      toast('Switched to native camera — finish the remaining shots.');
      return;
    }
    renderReview();
    show('review');
  }

  async function enterProCapture() {
    $('native-wrap').hidden = true;
    $('pro-wrap').hidden = false;
    $('cap-title').textContent = 'Pro camera';
    if (!ProCamera.supported()) {
      fallbackToNative('Pro camera is not available in this browser.');
      return;
    }
    try {
      await ProCamera.start(S.settings.camera, $('vf-video'));
    } catch (err) {
      fallbackToNative('Could not open the camera. Check permission, or use native mode.');
      return;
    }
    runProSession();
  }

  function fallbackToNative(msg) {
    ProCamera.stop();
    S.settings.mode = 'native';
    toast(msg);
    enterCapture();
  }

  function enterCapture() {
    const pro = S.settings.mode === 'pro';
    $('native-wrap').hidden = pro;
    $('pro-wrap').hidden = !pro;
    if (pro) {
      enterProCapture();
    } else {
      $('cap-title').textContent = `Shot 1 of ${shotCount()}`;
      renderNativeCapture();
    }
    show('capture');
  }

  /* ---------- review ---------- */

  function renderReview() {
    $('rev-caption').value = S.settings.caption;
    syncPicker($('rev-filters'), 'filter', S.settings.filter);
    syncPicker($('rev-templates'), 'template', S.settings.template);
    drawPreview();
  }

  function drawPreview() {
    const photos = S.shots.map((s) => s.img);
    const cv = Compose.render({
      photos,
      layout: S.settings.layout,
      template: S.settings.template,
      eventName: S.settings.eventName,
      caption: S.settings.caption,
      filter: S.settings.filter,
      stripNo: S.stripNo,
      ts: Date.now(),
    });
    const holder = $('preview');
    holder.width = cv.width;
    holder.height = cv.height;
    holder.getContext('2d').drawImage(cv, 0, 0);
    S.stripCanvas = cv;
  }

  /* ---------- result ---------- */

  function fileName() {
    return `${slug(S.settings.eventName)}-strip-${String(S.stripNo).padStart(3, '0')}.jpg`;
  }

  /* ---------- wiring ---------- */

  function init() {
    wirePicker(document.querySelector('.layout-grid'), 'layout', (v) => { S.settings.layout = v; });
    wirePicker(document.querySelector('#view-setup [data-mode]').parentElement, 'mode', (v) => { S.settings.mode = v; });
    wirePicker(document.querySelector('#view-setup [data-camera]').parentElement, 'camera', (v) => { S.settings.camera = v; });
    wirePicker(document.querySelector('#view-setup [data-countdown]').parentElement, 'countdown', (v) => { S.settings.countdown = parseInt(v, 10) || 0; });
    wirePicker(document.querySelector('#view-setup .filters'), 'filter', (v) => { S.settings.filter = v; });
    wirePicker(document.querySelector('#view-setup .template-grid'), 'template', (v) => { S.settings.template = v; });
    wirePicker($('rev-filters'), 'filter', (v) => { S.settings.filter = v; drawPreview(); });
    wirePicker($('rev-templates'), 'template', (v) => { S.settings.template = v; drawPreview(); });

    $('set-event').value = S.settings.eventName;

    $('btn-new').addEventListener('click', () => show('setup'));
    $('btn-setup-back').addEventListener('click', () => show('home'));
    $('btn-cap-back').addEventListener('click', () => { ProCamera.stop(); S.cancelled = true; show('setup'); });

    $('btn-start').addEventListener('click', () => {
      S.settings.eventName = $('set-event').value.trim();
      S.settings.caption = $('set-caption').value.trim();
      localStorage.setItem('booth.eventName', S.settings.eventName);
      S.shots = new Array(shotCount()).fill(null);
      S.cancelled = false;
      enterCapture();
    });

    $('btn-shutter').addEventListener('click', () => {
      const next = S.shots.findIndex((s) => !s);
      if (next >= 0) shootNative(next);
    });

    $('btn-to-review').addEventListener('click', () => {
      renderReview();
      show('review');
    });

    $('vf-flip').addEventListener('click', async () => {
      S.settings.camera = S.settings.camera === 'user' ? 'environment' : 'user';
      S.cancelled = true;
      clearInterval(S.cdTimer);
      $('vf-count').hidden = true;
      ProCamera.stop();
      await wait(300);
      S.cancelled = false;
      try {
        await ProCamera.start(S.settings.camera, $('vf-video'));
      } catch (e) {
        fallbackToNative('Could not flip the camera.');
        return;
      }
      runProSession();
    });

    $('vf-cancel').addEventListener('click', () => {
      S.cancelled = true;
      clearInterval(S.cdTimer);
      $('vf-count').hidden = true;
      ProCamera.stop();
      show('setup');
    });

    $('btn-retake').addEventListener('click', () => {
      S.cancelled = false;
      enterCapture();
    });

    $('rev-caption').addEventListener('input', (e) => {
      S.settings.caption = e.target.value;
      drawPreview();
    });

    $('btn-finalize').addEventListener('click', async () => {
      const name = fileName();
      const dataUrl = S.stripCanvas.toDataURL('image/jpeg', 0.92);
      await Store.put({
        id: 'strip-' + Date.now(),
        ts: Date.now(),
        dataUrl,
        eventName: S.settings.eventName,
        layout: S.settings.layout,
      }).catch(() => toast('Saved, but the gallery is full on this device.'));
      S.resultDataUrl = dataUrl;
      S.resultName = name;
      $('result-img').src = dataUrl;
      S.stripNo += 1;
      show('result');
      renderGallery();
    });

    $('btn-share').addEventListener('click', async () => {
      try {
        const res = await Share.share(S.stripCanvas, S.resultName || 'booth-strip.jpg');
        toast(res === 'shared' ? 'Sent to the share sheet.' : 'Downloaded.');
      } catch (err) {
        if (err && err.name !== 'AbortError') toast('Sharing failed — try Download.');
      }
    });

    $('btn-download').addEventListener('click', async () => {
      await Share.download(S.stripCanvas, S.resultName || 'booth-strip.jpg');
      toast('Downloaded.');
    });

    $('btn-again').addEventListener('click', () => show('setup'));

    renderGallery();
    show('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
