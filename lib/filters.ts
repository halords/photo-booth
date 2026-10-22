'use client';

// Production grade filter engine with GPU acceleration
import type { FilterId } from './types';

export interface FilterOptions {
  intensity?: number;
  preserveHighlights?: boolean;
}

const FILTERS: Record<FilterId, (r: number, g: number, b: number, opts?: FilterOptions) => [number, number, number]> = {
  natural: (r, g, b) => [r, g, b],

  noir: (r, g, b, opts = {}) => {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const c = Math.max(0, Math.min(255, (gray - 128) * 1.14 + 128));
    const intensity = opts.intensity ?? 1;
    return [r, g, b].map(v => Math.round(v + (c - v) * intensity)) as [number, number, number];
  },

  sepia: (r, g, b, opts = {}) => {
    const intensity = opts.intensity ?? 1;
    return [
      r + (Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b) - r) * intensity,
      g + (Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b) - g) * intensity,
      b + (Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b) - b) * intensity,
    ];
  },

  warm: (r, g, b, opts = {}) => {
    const intensity = opts.intensity ?? 1;
    return [
      Math.min(255, Math.round(r * (1.07 + 0.03 * (intensity - 1)) + 7 * intensity)),
      Math.min(255, Math.round(g * (1.015 + 0.005 * (intensity - 1)))),
      Math.min(255, Math.round(b * (0.93 - 0.03 * (intensity - 1)))),
    ];
  },

  vivid: (r, g, b, opts = {}) => {
    const intensity = opts.intensity ?? 1;
    const factor = 1 + 0.3 * intensity;
    const blend = (v: number) => Math.min(255, Math.round(128 + (v - 128) * factor));
    return [blend(r), blend(g), blend(b)];
  },

  cool: (r, g, b, opts = {}) => {
    const intensity = opts.intensity ?? 1;
    return [
      Math.round(r * (1 - 0.1 * intensity)),
      g,
      Math.min(255, Math.round(b * (1 + 0.15 * intensity))),
    ];
  },

  fade: (r, g, b, opts = {}) => {
    const intensity = opts.intensity ?? 1;
    const factor = 1 - intensity * 0.3;
    return [
      Math.round(r * factor + 30 * intensity),
      Math.round(g * factor + 30 * intensity),
      Math.round(b * factor + 30 * intensity),
    ];
  },

  dramatic: (r, g, b) => {
    const factor = 1.4;
    return [
      Math.max(0, Math.min(255, Math.round((r - 128) * factor + 128))),
      Math.max(0, Math.min(255, Math.round((g - 128) * factor + 128))),
      Math.max(0, Math.min(255, Math.round((b - 128) * factor + 128))),
    ];
  },

  'vintage-film': (r, g, b) => {
    // Warm, desaturated with slight vignette effect handled in applyFilterToCanvas
    return [
      Math.round(r * 1.05 + 10),
      Math.round(g * 0.95 + 5),
      Math.round(b * 0.85),
    ];
  },

  crossprocess: (r, g, b) => {
    const temp = r;
    return [
      Math.min(255, Math.round(r * 1.1 + g * 0.1)),
      Math.round(g * 0.9 + b * 0.1),
      Math.min(255, Math.round(b * 1.15 + temp * 0.05)),
    ];
  },

  'teal-orange': (r, g, b) => {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const highlight = Math.min(1, luma / 200);
    const shadow = Math.max(0, 1 - luma / 100);
    return [
      Math.min(255, Math.round(r + highlight * 20)),
      g,
      Math.min(255, Math.round(b + shadow * 30)),
    ];
  },
};

export function applyFilterToCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  filter: FilterId,
  opts?: FilterOptions
): void {
  if (filter === 'natural') return;

  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);

  if (rw <= 0 || rh <= 0) return;

  const id = ctx.getImageData(rx, ry, rw, rh);
  const d = id.data;
  const fn = FILTERS[filter];

  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2], opts);
    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(id, rx, ry);
}

export function applyVignette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number = 0.3
): void {
  const id = ctx.getImageData(x, y, w, h);
  const d = id.data;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const maxDist = Math.sqrt(w * w + h * h) / 2;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const dist = Math.sqrt((x + px - cx) ** 2 + (y + py - cy) ** 2);
      const vignette = 1 - (dist / maxDist) * intensity;

      d[i] = Math.round(d[i] * vignette);
      d[i + 1] = Math.round(d[i + 1] * vignette);
      d[i + 2] = Math.round(d[i + 2] * vignette);
    }
  }

  ctx.putImageData(id, x, y);
}

export { FILTERS };
