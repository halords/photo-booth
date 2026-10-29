export type ImageFormat = 'jpg' | 'png';
import { withPrintDensity } from './image-metadata';
export function canvasToFile(canvas: HTMLCanvasElement, filename: string, format: ImageFormat = 'jpg', dpi = 300): Promise<File> {
  const type = format === 'png' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) return reject(new Error('Could not encode the strip.'));
    void withPrintDensity(blob, dpi).then(encoded => resolve(new File([encoded], filename.replace(/\.(jpg|jpeg|png)$/i, '') + '.' + format, { type }))).catch(reject);
  }, type, 0.98));
}
export async function shareStrip(canvas: HTMLCanvasElement, filename: string, dpi = 300): Promise<'shared' | 'downloaded'> {
  const file = await canvasToFile(canvas, filename, 'jpg', dpi);
  if (navigator.share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'A little moment, forever.' }); return 'shared'; }
  downloadFile(file); return 'downloaded';
}
export async function downloadStrip(canvas: HTMLCanvasElement, filename: string, format: ImageFormat = 'jpg', dpi = 300) { downloadFile(await canvasToFile(canvas, filename, format, dpi)); }
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const Share = { shareStrip, downloadStrip };
