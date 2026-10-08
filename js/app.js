/* Booth — session state machine: home → setup → capture → review → result. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const VIEWS = ['home', 'setup', 'capture', 'review', 'result'];

  const S = {
    settings: {
      eventName: localStorage.getItem('booth.eventName') || '',
      layout: 'strip4',
      camera: 'user',
      filter: 'natural',
      caption: '',
    },
    shots: [],          // { file, img } per shot
    stripCanvas: null,
    stripNo: 1,
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
    toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------- segmented + layout pickers ---------- */
  function wirePicker(container, attr, cb) {
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
          S.resultName = (it.eventName || 'booth').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg';
          $('result-img').src = it.dataUrl;
          show('result');
        };
        full.src = it.dataUrl;
      });
      g.appendChild(d);
    });
  }

  /* ---------- capture ---------- */
  function shotCount() {
    return Compose.shotsFor(S.settings.layout);
  }

  function renderCapture() {
    const n = shotCount();
    $('cap-title').textContent = `Shot ${Math.min(S.shots.length + 1, n)} of ${n}`;
    const dots = $('shot-dots');
    dots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i < S.shots.length ? ' done' : i === S.shots.length ? ' now' : '');
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
        rt.addEventListener('click', (e) => { e.stopPropagation(); retakeShot(i); });
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

  async function shoot(index) {
    try {
      const file = await Capture.takePhoto(S.settings.camera);
      const img = await Compose.loadPhoto(file);
      S.shots[index] = { file, img };
      renderCapture();
    } catch (err) {
      if (err && err.message !== 'cancelled') toast(err.message || 'Camera failed.');
      // cancelled → stay put, nothing lost
    }
  }

  async function retakeShot(i) {
    await shoot(i);
  }

  /* ---------- review ---------- */
  function renderReview() {
    $('rev-caption').value = S.settings.caption;
    syncFilterButtons($('rev-filters'), S.settings.filter);
    drawPreview();
  }

  function syncFilterButtons(container, active) {
    container.querySelectorAll('[data-filter]').forEach((b) => {
      const on = b.dataset.filter === active;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function drawPreview() {
    const photos = S.shots.map((s) => s.img);
    const cv = Compose.render({
      photos,
      layout: S.settings.layout,
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
    const base = (S.settings.eventName || 'booth').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'booth';
    return `${base}-strip-${String(S.stripNo).padStart(3, '0')}.jpg`;
  }

  /* ---------- wiring ---------- */
  function init() {
    // setup pickers
    wirePicker(document.querySelector('.layout-grid'), 'layout', (v) => { S.settings.layout = v; });
    wirePicker(document.querySelector('#view-setup .segmented'), 'camera', (v) => { S.settings.camera = v; });
    wirePicker(document.querySelector('#view-setup .filters'), 'filter', (v) => { S.settings.filter = v; });
    wirePicker($('rev-filters'), 'filter', (v) => { S.settings.filter = v; drawPreview(); });

    $('set-event').value = S.settings.eventName;

    $('btn-new').addEventListener('click', () => { show('setup'); });
    $('btn-setup-back').addEventListener('click', () => show('home'));
    $('btn-cap-back').addEventListener('click', () => show('setup'));

    $('btn-start').addEventListener('click', () => {
      S.settings.eventName = $('set-event').value.trim();
      S.settings.caption = $('set-caption').value.trim();
      localStorage.setItem('booth.eventName', S.settings.eventName);
      S.shots = new Array(shotCount()).fill(null);
      renderCapture();
      show('capture');
    });

    $('btn-shutter').addEventListener('click', () => {
      const next = S.shots.findIndex((s) => !s);
      if (next >= 0) shoot(next);
    });

    $('btn-to-review').addEventListener('click', () => {
      renderReview();
      show('review');
    });

    $('btn-retake').addEventListener('click', () => {
      renderCapture();
      show('capture');
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

    // gallery items opened from home need a canvas for share/download
    $('btn-again').addEventListener('click', () => { show('setup'); });

    renderGallery();
    show('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
