/* Canvas strip composer — layouts × templates, pixel filters.
 * Templates: editorial (bone), film (sprocket-hole film strip), kraft.
 * Everything is drawn; output is a clean JPEG. */
const Compose = (() => {
  'use strict';

  const W = 640;
  const PAD = 44, GUTTER = 26;
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = 'Inter, system-ui, sans-serif';

  const LAYOUTS = {
    strip4: { shots: 4, cols: 1, rows: 4 },
    strip3: { shots: 3, cols: 1, rows: 3 },
    grid:   { shots: 4, cols: 2, rows: 2 },
    single: { shots: 1, cols: 1, rows: 1 },
  };

  const TEMPLATES = {
    editorial: { name: 'Editorial', sub: 'Bone paper' },
    film:      { name: 'Film',      sub: 'Sprocket strip' },
    kraft:     { name: 'Kraft',     sub: 'Stamped card' },
  };

  /* ---------- shared helpers ---------- */

  async function loadPhoto(file) {
    if ('createImageBitmap' in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) { /* fall through */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function drawCover(ctx, img, x, y, w, h) {
    const iw = img.width || img.naturalWidth;
    const ih = img.height || img.naturalHeight;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function applyFilter(ctx, x, y, w, h, filter) {
    if (!filter || filter === 'natural') return;
    const rx = Math.round(x), ry = Math.round(y), rw = Math.round(w), rh = Math.round(h);
    const id = ctx.getImageData(rx, ry, rw, rh);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (filter === 'noir') {
        const v = 0.299 * r + 0.587 * g + 0.114 * b;
        const c = Math.max(0, Math.min(255, (v - 128) * 1.14 + 128));
        d[i] = d[i + 1] = d[i + 2] = c;
      } else if (filter === 'sepia') {
        d[i]     = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
        d[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
        d[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
      } else if (filter === 'warm') {
        d[i]     = Math.min(255, r * 1.07 + 7);
        d[i + 1] = Math.min(255, g * 1.015);
        d[i + 2] = Math.min(255, b * 0.93);
      }
    }
    ctx.putImageData(id, rx, ry);
  }

  function tracked(ctx, text, x, y, px) {
    try { ctx.letterSpacing = px + 'px'; } catch (e) {}
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dateStr(ts) {
    const d = new Date(ts);
    const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()}`;
  }

  function cells(layout) {
    const spec = LAYOUTS[layout] || LAYOUTS.strip4;
    const inner = W - PAD * 2;
    const cellW = spec.cols === 2 ? (inner - GUTTER) / 2 : inner;
    const cellH = layout === 'single' ? inner * 1.2 : cellW;
    return { ...spec, cellW, cellH, inner };
  }

  function drawPhotos(ctx, photos, layout, filter, frame) {
    const { cols, rows, cellW, cellH } = cells(layout);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= photos.length) break;
        const x = PAD + c * (cellW + GUTTER);
        const y = frame.top + r * (cellH + GUTTER);
        frame.border(ctx, x, y, cellW, cellH);
        drawCover(ctx, photos[i], x, y, cellW, cellH);
        applyFilter(ctx, x, y, cellW, cellH, filter);
        if (frame.annotate) frame.annotate(ctx, x, y, cellW, cellH, i);
      }
    }
  }

  /* ---------- template: editorial ---------- */

  function renderEditorial(o) {
    const INK = '#1c1a17', BONE = '#f7f3ea', ACCENT = '#d9381e', MUTED = '#8a847a';
    const { rows, cellH } = cells(o.layout);
    const headerH = 118, footerH = 128;
    const gridH = rows * cellH + (rows - 1) * GUTTER;
    const H = Math.round(PAD + headerH + gridH + footerH + PAD);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = BONE; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    let y = PAD + 34;
    ctx.fillStyle = MUTED; ctx.font = `700 15px ${SANS}`;
    tracked(ctx, `Nº ${String(o.stripNo).padStart(3, '0')} — POCKET PHOTO BOOTH`, PAD, y, 3);
    y += 46;
    ctx.fillStyle = INK; ctx.font = `600 40px ${SERIF}`;
    ctx.fillText(o.eventName || 'Untitled session', PAD, y, W - PAD * 2);
    y += 22;
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

    drawPhotos(ctx, o.photos, o.layout, o.filter, {
      top: PAD + headerH,
      border(x0, y0, w, h) {
        ctx.fillStyle = INK;
        ctx.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
      },
    });

    y = PAD + headerH + gridH + 52;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(PAD, y - 14, 14, 14);
    ctx.fillStyle = MUTED; ctx.font = `700 15px ${SANS}`;
    tracked(ctx, dateStr(o.ts), PAD + 26, y, 3);
    y += 40;
    ctx.fillStyle = INK; ctx.font = `italic 400 30px ${SERIF}`;
    ctx.fillText(o.caption || '—', PAD, y, W - PAD * 2);
    return cv;
  }

  /* ---------- template: film (sprocket-hole strip) ---------- */

  function sprocketBand(ctx, y, h, paper) {
    const holeW = 30, holeH = 22, gap = 22;
    const n = Math.floor((W - PAD) / (holeW + gap));
    const totalW = n * holeW + (n - 1) * gap;
    let sx = (W - totalW) / 2;
    const sy = y + (h - holeH) / 2;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = '#000';
      roundRect(ctx, sx - 2, sy - 2, holeW + 4, holeH + 4, 7); ctx.fill();
      ctx.fillStyle = paper;
      roundRect(ctx, sx, sy, holeW, holeH, 5); ctx.fill();
      sx += holeW + gap;
    }
  }

  function renderFilm(o) {
    const PAPER = '#efe8d8', BASE = '#16130f';
    const { rows, cellH } = cells(o.layout);
    const bandH = 56, labelH = 46, footH = 96;
    const gridH = rows * cellH + (rows - 1) * GUTTER;
    const top = 24 + bandH + labelH;
    const H = Math.round(top + gridH + footH + bandH + 24);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = BASE; ctx.fillRect(0, 0, W, H);
    sprocketBand(ctx, 24, bandH, PAPER);

    // stock label row
    let y = 24 + bandH + 30;
    ctx.fillStyle = PAPER; ctx.font = `700 15px ${SANS}`;
    tracked(ctx, 'BOOTH ◂ 400TX', PAD, y, 3);
    ctx.textAlign = 'right';
    tracked(ctx, `Nº ${String(o.stripNo).padStart(3, '0')}`, W - PAD, y, 3);
    ctx.textAlign = 'left';

    drawPhotos(ctx, o.photos, o.layout, o.filter, {
      top,
      border(x0, y0, w, h) {
        ctx.strokeStyle = PAPER; ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 1, y0 - 1, w + 2, h + 2);
      },
      annotate(x0, y0, w, h, i) {
        ctx.fillStyle = PAPER; ctx.font = `700 14px ${SANS}`;
        const label = `${String(i + 1).padStart(2, '0')}A`;
        // small tab on the left edge
        const tw = ctx.measureText(label).width + 16;
        ctx.fillStyle = BASE;
        ctx.fillRect(x0, y0 + 10, tw, 24);
        ctx.fillStyle = PAPER;
        ctx.fillText(label, x0 + 8, y0 + 28);
      },
    });

    // footer between photos and bottom sprockets
    y = top + gridH + 52;
    ctx.fillStyle = PAPER; ctx.font = `italic 400 28px ${SERIF}`;
    ctx.fillText(o.caption || dateStr(o.ts), PAD, y, W - PAD * 2);
    ctx.font = `700 14px ${SANS}`;
    ctx.fillStyle = 'rgba(239,232,216,0.55)';
    tracked(ctx, `${dateStr(o.ts)}  ·  ${o.eventName || 'UNTITLED SESSION'}`.toUpperCase(), PAD, y + 30, 2);

    sprocketBand(ctx, H - 24 - bandH, bandH, PAPER);
    return cv;
  }

  /* ---------- template: kraft ---------- */

  function renderKraft(o) {
    const INK = '#2b2119', PAPER = '#c9a26b', DEEP = '#b78f57';
    const { rows, cellH } = cells(o.layout);
    const headerH = 138, footerH = 118;
    const gridH = rows * cellH + (rows - 1) * GUTTER;
    const H = Math.round(PAD + headerH + gridH + footerH + PAD);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    // subtle vignette
    const vg = ctx.createRadialGradient(W/2, H/2, H/4, W/2, H/2, H/1.1);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(60,40,20,0.25)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // stamped double border
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.setLineDash([10, 7]); ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.setLineDash([]);

    let y = PAD + 40;
    ctx.fillStyle = INK; ctx.font = `700 15px ${SANS}`;
    tracked(ctx, `POCKET PHOTO BOOTH — Nº ${String(o.stripNo).padStart(3, '0')}`, PAD + 6, y, 3);
    y += 52;
    ctx.font = `800 36px ${SANS}`;
    tracked(ctx, (o.eventName || 'UNTITLED SESSION').toUpperCase(), PAD + 6, y, 1);

    drawPhotos(ctx, o.photos, o.layout, o.filter, {
      top: PAD + headerH,
      border(x0, y0, w, h) {
        ctx.fillStyle = DEEP;
        ctx.fillRect(x0 - 5, y0 - 5, w + 10, h + 10);
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 5, y0 - 5, w + 10, h + 10);
      },
    });

    y = PAD + headerH + gridH + 56;
    ctx.fillStyle = INK; ctx.font = `italic 700 28px ${SERIF}`;
    ctx.fillText(o.caption || '—', PAD + 6, y, W - PAD * 2 - 12);
    ctx.font = `700 14px ${SANS}`;
    tracked(ctx, dateStr(o.ts), PAD + 6, y + 34, 3);
    return cv;
  }

  /* ---------- entry ---------- */

  const RENDERERS = { editorial: renderEditorial, film: renderFilm, kraft: renderKraft };

  function render(o) {
    const fn = RENDERERS[o.template] || renderEditorial;
    return fn({ ...o, ts: o.ts || Date.now() });
  }

  function shotsFor(layout) {
    return (LAYOUTS[layout] || LAYOUTS.strip4).shots;
  }

  return { loadPhoto, render, shotsFor, LAYOUTS, TEMPLATES };
})();
