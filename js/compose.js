/* Canvas strip composer — layouts, filters, editorial frame.
 * Everything is drawn; no DOM screenshots. Output is a clean JPEG. */
const Compose = (() => {
  'use strict';

  const W = 640;
  const PAD = 44, GUTTER = 26;
  const INK = '#1c1a17', BONE = '#f7f3ea', ACCENT = '#d9381e', MUTED = '#8a847a';
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = 'Inter, system-ui, sans-serif';

  const LAYOUTS = {
    strip4: { shots: 4, cols: 1, rows: 4 },
    strip3: { shots: 3, cols: 1, rows: 4 - 1 },
    grid:   { shots: 4, cols: 2, rows: 2 },
    single: { shots: 1, cols: 1, rows: 1 },
  };

  /* Load with EXIF orientation applied (iOS photos need this). */
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

  /* Pixel filters — manual for reliability (ctx.filter is spotty on iOS). */
  function applyFilter(ctx, x, y, w, h, filter) {
    if (!filter || filter === 'natural') return;
    const id = ctx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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
    ctx.putImageData(id, Math.round(x), Math.round(y));
  }

  function tracked(ctx, text, x, y, px, weight) {
    try { ctx.letterSpacing = px + 'px'; } catch (e) {}
    ctx.fillText(text, x, y);
    try { ctx.letterSpacing = '0px'; } catch (e) {}
  }

  function dateStr(ts) {
    const d = new Date(ts);
    const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* photos: array of ImageBitmap/Image, length must match layout.shots */
  function render({ photos, layout, eventName, caption, filter, stripNo, ts }) {
    const spec = LAYOUTS[layout] || LAYOUTS.strip4;
    const inner = W - PAD * 2;
    const cellW = layout === 'grid' ? (inner - GUTTER) / 2 : inner;
    const cellH = layout === 'single' ? inner * 1.2 : cellW;

    const headerH = 118, footerH = 128;
    const gridH = spec.rows * cellH + (spec.rows - 1) * GUTTER;
    const H = Math.round(PAD + headerH + gridH + footerH + PAD);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // paper
    ctx.fillStyle = BONE;
    ctx.fillRect(0, 0, W, H);
    // hairline frame
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // header
    let y = PAD + 34;
    ctx.fillStyle = MUTED;
    ctx.font = `700 15px ${SANS}`;
    ctx.textBaseline = 'alphabetic';
    tracked(ctx, `Nº ${String(stripNo).padStart(3, '0')} — POCKET PHOTO BOOTH`, PAD, y, 3);
    y += 46;
    ctx.fillStyle = INK;
    ctx.font = `600 40px ${SERIF}`;
    ctx.fillText(eventName || 'Untitled session', PAD, y, inner);
    y += 22;
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

    // photos
    y = PAD + headerH;
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        const i = r * spec.cols + c;
        if (i >= photos.length) break;
        const x = PAD + c * (cellW + GUTTER);
        const py = y + r * (cellH + GUTTER);
        // thin photo border
        ctx.fillStyle = INK;
        ctx.fillRect(x - 1, py - 1, cellW + 2, cellH + 2);
        drawCover(ctx, photos[i], x, py, cellW, cellH);
        applyFilter(ctx, x, py, cellW, cellH, filter);
      }
    }

    // footer
    y = PAD + headerH + gridH + 52;
    ctx.fillStyle = ACCENT;
    ctx.fillRect(PAD, y - 14, 14, 14);
    ctx.fillStyle = MUTED;
    ctx.font = `700 15px ${SANS}`;
    tracked(ctx, dateStr(ts || Date.now()), PAD + 26, y, 3);
    y += 40;
    ctx.fillStyle = INK;
    ctx.font = `italic 400 30px ${SERIF}`;
    ctx.fillText(caption || '—', PAD, y, inner);

    return cv;
  }

  function shotsFor(layout) {
    return (LAYOUTS[layout] || LAYOUTS.strip4).shots;
  }

  return { loadPhoto, render, shotsFor, LAYOUTS };
})();
