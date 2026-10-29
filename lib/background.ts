import type { BackgroundOptions, PrintBackground } from './types';

export const DEFAULT_BACKGROUND: PrintBackground = { dataUrl: null, fit: 'cover', x: 0, y: 0, showText: true };
export function sanitizeBackground(value: unknown): PrintBackground {
  const candidate = value && typeof value === 'object' ? value as Partial<PrintBackground> : {};
  const position = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0;
  return {
    dataUrl: typeof candidate.dataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(candidate.dataUrl) ? candidate.dataUrl : null,
    fit: candidate.fit === 'contain' || candidate.fit === 'stretch' ? candidate.fit : 'cover',
    x: position(candidate.x), y: position(candidate.y), showText: candidate.showText !== false,
  };
}
export function backgroundOptions(value: unknown): BackgroundOptions {
  const { fit, x, y, showText } = sanitizeBackground(value);
  return { fit, x, y, showText };
}

// Reuse decoded artwork while adjusting position, without retaining old uploads indefinitely.
const images = new Map<string, Promise<HTMLImageElement>>();
async function loadArtwork(dataUrl: string) {
  let image = images.get(dataUrl);
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img);
      img.onerror = () => { images.delete(dataUrl); reject(new Error('Could not open the background. Replace it with a JPG, PNG, or WebP image.')); };
      img.src = dataUrl;
    });
    images.set(dataUrl, image);
    if (images.size > 2) images.delete(images.keys().next().value!);
  }
  return image;
}
export async function drawBackground(ctx: CanvasRenderingContext2D, background: PrintBackground, width: number, height: number) {
  if (!background.dataUrl) return;
  const img = await loadArtwork(background.dataUrl);
  if (background.fit === 'stretch') { ctx.drawImage(img, 0, 0, width, height); return; }
  const scale = background.fit === 'contain' ? Math.min(width / img.naturalWidth, height / img.naturalHeight) : Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  const x = (width - w) / 2 + background.x * Math.abs(width - w) / 2;
  const y = (height - h) / 2 + background.y * Math.abs(height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}
