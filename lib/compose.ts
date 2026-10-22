'use client';

import type { CustomLayout, FilterId, LayoutId, Shot, TemplateId } from './types';
import { applyFilterToCanvas } from './filters';

export type PhotoImage = ImageBitmap | HTMLImageElement | HTMLCanvasElement;
export interface RenderOpts {
  photos: PhotoImage[]; layout: LayoutId; template: TemplateId; eventName: string;
  caption: string; filter: FilterId; stripNo: number; ts?: number;
  width?: number; frameColor?: string; showDate?: boolean; edits?: (Shot['edit'])[];
  customLayout?: CustomLayout;
}
export const LAYOUTS: Record<LayoutId, { shots: number; cols: number; rows: number }> = {
  strip2: { shots: 2, cols: 1, rows: 2 }, strip3: { shots: 3, cols: 1, rows: 3 },
  strip4: { shots: 4, cols: 1, rows: 4 }, strip6: { shots: 6, cols: 1, rows: 6 },
  grid2x2: { shots: 4, cols: 2, rows: 2 }, grid3x3: { shots: 9, cols: 3, rows: 3 },
  single: { shots: 1, cols: 1, rows: 1 }, collage: { shots: 4, cols: 2, rows: 2 },
  custom4r: { shots: 3, cols: 1, rows: 3 },
};
export const TEMPLATES: Record<TemplateId, { name: string; sub: string; color: string; ink: string }> = {
  'polaroid-white': { name: 'Classic', sub: 'A little timeless', color: '#ffffff', ink: '#292722' },
  editorial: { name: 'Editorial', sub: 'Type with personality', color: '#f5eee4', ink: '#292722' },
  film: { name: 'Film', sub: 'Straight from the darkroom', color: '#232323', ink: '#e7c884' },
  kraft: { name: 'Kraft', sub: 'Warm paper tones', color: '#d0b695', ink: '#44372a' },
  polaroid: { name: 'Instant', sub: 'A nostalgic favorite', color: '#f3eee5', ink: '#413a34' },
  modern: { name: 'Studio', sub: 'Bold, clean, modern', color: '#292722', ink: '#f3eee5' },
  vintage: { name: 'Vintage', sub: 'Made for the memories', color: '#f1e2cd', ink: '#785d44' },
  neon: { name: 'After hours', sub: 'A touch of pink', color: '#302438', ink: '#f7a9dc' },
};
function size(img: PhotoImage): [number, number] {
  return img instanceof HTMLImageElement ? [img.naturalWidth, img.naturalHeight] : [img.width, img.height];
}
function drawPhoto(ctx: CanvasRenderingContext2D, img: PhotoImage, x: number, y: number, w: number, h: number, edit: Shot['edit']) {
  const [iw, ih] = size(img);
  const rotation = ((edit?.rotation || 0) % 360 + 360) % 360;
  const swapped = rotation === 90 || rotation === 270;
  const rw = swapped ? ih : iw, rh = swapped ? iw : ih;
  const scale = Math.max(w / rw, h / rh) * (edit?.zoom || 1);
  const overflowX = Math.max(0, rw * scale - w) / 2;
  const overflowY = Math.max(0, rh * scale - h) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x + w / 2 + (edit?.x || 0) * overflowX, y + h / 2 + (edit?.y || 0) * overflowY);
  if (edit?.mirror) ctx.scale(-1, 1);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(img, -iw * scale / 2, -ih * scale / 2, iw * scale, ih * scale);
  ctx.restore();
}
function fittedText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, fontSize: number, family: string, weight = '500') {
  let n = fontSize; ctx.font = weight + ' ' + n + 'px ' + family;
  while (ctx.measureText(value).width > width && n > fontSize * 0.5) { n -= 1; ctx.font = weight + ' ' + n + 'px ' + family; }
  ctx.fillText(value, x, y, width);
}
export async function render(o: RenderOpts): Promise<HTMLCanvasElement> {
  if (o.layout === 'custom4r' && o.customLayout) return render4R(o);
  const spec = LAYOUTS[o.layout] || LAYOUTS.strip4, theme = TEMPLATES[o.template] || TEMPLATES['polaroid-white'];
  const W = o.width || (spec.cols === 1 ? 1200 : 1800);
  const pad = W * (o.template === 'film' ? 0.085 : 0.065), gap = W * (o.layout === 'collage' ? 0.012 : 0.032);
  const cellW = (W - 2 * pad - gap * (spec.cols - 1)) / spec.cols;
  const cellH = cellW * (o.layout === 'single' ? 1.2 : spec.cols === 1 ? 0.75 : 1);
  const top = o.template === 'editorial' || o.template === 'modern' ? W * 0.19 : pad;
  const photosH = spec.rows * cellH + (spec.rows - 1) * gap, footer = W * (spec.cols === 1 ? 0.29 : 0.2);
  const H = Math.ceil(top + photosH + footer);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not create the photo strip.');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const bg = o.frameColor || theme.color; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const hex = bg.replace('#', '');
  const luma = hex.length === 6 ? parseInt(hex.slice(0, 2), 16) * 0.299 + parseInt(hex.slice(2, 4), 16) * 0.587 + parseInt(hex.slice(4, 6), 16) * 0.114 : 255;
  const ink = o.frameColor ? luma < 135 ? '#f8f3eb' : '#292722' : theme.ink;
  if (o.template === 'vintage') { ctx.strokeStyle = ink; ctx.lineWidth = W * 0.002; ctx.strokeRect(pad * 0.35, pad * 0.35, W - pad * 0.7, H - pad * 0.7); }
  if (o.template === 'film') {
    ctx.fillStyle = '#f8f3eb';
    for (let y = pad; y < H - pad; y += W * 0.09) { ctx.fillRect(W * 0.026, y, W * 0.025, W * 0.042); ctx.fillRect(W * 0.949, y, W * 0.025, W * 0.042); }
  }
  ctx.fillStyle = ink; ctx.textAlign = 'left';
  if (top > pad) {
    fittedText(ctx, 'POCKET / PHOTO BOOTH', pad, W * 0.066, W - 2 * pad, W * 0.021, 'Arial, sans-serif', '600');
    fittedText(ctx, o.eventName || 'The good times.', pad, W * 0.13, W - 2 * pad, W * 0.043, 'Georgia, serif');
  }
  for (let i = 0; i < spec.shots; i++) {
    const x = pad + (i % spec.cols) * (cellW + gap), y = top + Math.floor(i / spec.cols) * (cellH + gap);
    if (o.photos[i]) { drawPhoto(ctx, o.photos[i], x, y, cellW, cellH, o.edits?.[i]); applyFilterToCanvas(ctx, x, y, cellW, cellH, o.filter); }
    else { ctx.fillStyle = '#ddd6cc'; ctx.fillRect(x, y, cellW, cellH); }
    if (o.template === 'film') { ctx.fillStyle = ink; ctx.font = '500 ' + W * 0.016 + 'px monospace'; ctx.fillText(String(i + 1).padStart(2, '0') + ' >', x, y + cellH + gap * 0.62); }
  }
  ctx.fillStyle = ink; ctx.textAlign = 'center'; const base = top + photosH;
  fittedText(ctx, o.caption || o.eventName || 'a little moment, forever.', W / 2, base + footer * 0.4, W - pad * 2, W * (spec.cols === 1 ? 0.048 : 0.035), 'Georgia, serif', 'italic');
  ctx.globalAlpha = 0.65;
  const stamp = o.showDate === false ? 'POCKET PHOTO BOOTH' : new Date(o.ts || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  fittedText(ctx, stamp + '  /  NO. ' + String(o.stripNo).padStart(3, '0'), W / 2, base + footer * 0.71, W - pad * 2, W * 0.017, 'Arial, sans-serif');
  return canvas;
}

async function render4R(o: RenderOpts) {
  const layout = o.customLayout!, portrait = layout.orientation === 'portrait', theme = TEMPLATES[o.template];
  const W = o.width || (portrait ? 1200 : 1800), H = Math.round(W * (portrait ? 1.5 : 2 / 3));
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const bg = o.frameColor || (layout.decoration === 'birthday' ? '#f5e9e1' : theme.color);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (layout.backgroundDataUrl) {
    const background = new Image(); await new Promise<void>((resolve, reject) => { background.onload = () => resolve(); background.onerror = () => reject(new Error('Could not open the event background.')); background.src = layout.backgroundDataUrl!; });
    drawPhoto(ctx, background, 0, 0, W, H, undefined);
  } else if (layout.decoration !== 'minimal') {
    const colors = ['#b7c3b0', '#d39b84', '#d8bc76', '#9ea9c3'];
    for (let i = 0; i < 45; i++) {
      const x = ((i * 37 + 11) % 100) / 100 * W, y = ((i * 29 + 7) % 100) / 100 * H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i * .6); ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = .6;
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, W * .004, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(0, 0, W * .007, W * .016); ctx.restore();
    }
  }
  const hex = bg.replace('#', ''), luma = parseInt(hex.slice(0, 2), 16) * .299 + parseInt(hex.slice(2, 4), 16) * .587 + parseInt(hex.slice(4, 6), 16) * .114;
  const ink = luma < 135 ? '#f8f3eb' : '#40382f'; ctx.textAlign = 'center';
  if (layout.backgroundDataUrl) { ctx.fillStyle = '#ffffffcf'; ctx.fillRect(W * .05, H * .025, W * .9, H * .115); }
  ctx.fillStyle = layout.backgroundDataUrl ? '#40382f' : ink;
  fittedText(ctx, o.eventName || (layout.decoration === 'birthday' ? 'Happy Birthday!' : 'A day to remember.'), W / 2, H * .09, W * .86, W * .062, 'Georgia, serif');
  fittedText(ctx, 'A LITTLE MOMENT, FOREVER.', W / 2, H * .125, W * .82, W * .015, 'Arial, sans-serif');
  for (let i = 0; i < layout.slots.length; i++) {
    const s = layout.slots[i], w = W * s.width / 100, h = H * s.height / 100;
    const photo = document.createElement('canvas'); photo.width = Math.max(1, Math.round(w)); photo.height = Math.max(1, Math.round(h));
    const pctx = photo.getContext('2d')!;
    if (o.photos[i]) { drawPhoto(pctx, o.photos[i], 0, 0, w, h, o.edits?.[i]); applyFilterToCanvas(pctx, 0, 0, w, h, o.filter); }
    else { pctx.fillStyle = '#d9dfd0'; pctx.fillRect(0, 0, w, h); pctx.textAlign = 'center'; pctx.fillStyle = '#65775b'; pctx.font = Math.min(w, h) * .16 + 'px Arial'; pctx.fillText('PHOTO ' + (i + 1), w / 2, h / 2); }
    ctx.save(); ctx.translate(W * s.x / 100 + w / 2, H * s.y / 100 + h / 2); ctx.rotate(s.rotation * Math.PI / 180);
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#00000018'; ctx.shadowBlur = W * .012; ctx.shadowOffsetY = W * .004;
    const border = W * .007; ctx.fillRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2); ctx.shadowColor = 'transparent';
    ctx.drawImage(photo, -w / 2, -h / 2, w, h); ctx.restore();
  }
  ctx.textAlign = 'center';
  if (layout.backgroundDataUrl) { ctx.fillStyle = '#ffffffcf'; ctx.fillRect(W * .05, H * .89, W * .9, H * .09); }
  ctx.fillStyle = layout.backgroundDataUrl ? '#40382f' : ink;
  fittedText(ctx, o.caption || 'Thank you for celebrating with us.', W / 2, H * .925, W * .86, W * .026, 'Georgia, serif', 'italic');
  const date = o.showDate === false ? 'POCKET PHOTO BOOTH' : new Date(o.ts || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  fittedText(ctx, date + ' / NO. ' + String(o.stripNo).padStart(3, '0'), W / 2, H * .96, W * .86, W * .012, 'Arial, sans-serif');
  return canvas;
}
export async function loadPhoto(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {} }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('This photo could not be opened. Try a JPG or PNG.')); img.src = url; });
    return img;
  } finally { URL.revokeObjectURL(url); }
}
export const shotsFor = (layout: LayoutId) => (LAYOUTS[layout] || LAYOUTS.strip4).shots;
const swatches = new Map<TemplateId, string>();
export async function renderSwatch(template: TemplateId) {
  if (swatches.has(template)) return swatches.get(template)!;
  const photo = document.createElement('canvas'); photo.width = 120; photo.height = 90;
  const ctx = photo.getContext('2d')!; ctx.fillStyle = '#a7b1a0'; ctx.fillRect(0, 0, 120, 90);
  ctx.fillStyle = '#e0c6af'; ctx.beginPath(); ctx.arc(60, 34, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#777562'; ctx.beginPath(); ctx.ellipse(60, 90, 37, 37, 0, 0, Math.PI * 2); ctx.fill();
  const cv = await render({ photos: [photo, photo, photo], layout: 'strip3', template, eventName: 'Good times', caption: '', filter: 'natural', stripNo: 1, width: 140, ts: 1770000000000 });
  const url = cv.toDataURL('image/jpeg', 0.8); swatches.set(template, url); return url;
}
export const Compose = { loadPhoto, render, shotsFor, renderSwatch, LAYOUTS, TEMPLATES };
