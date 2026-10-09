/** Output: iOS share sheet first, download fallback. */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not encode the strip.'));
      resolve(new File([blob], filename, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}

export async function shareStrip(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<'shared' | 'downloaded'> {
  const file = await canvasToFile(canvas, filename);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Photo booth strip' });
    return 'shared';
  }
  downloadFile(file);
  return 'downloaded';
}

export async function downloadStrip(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const file = await canvasToFile(canvas, filename);
  downloadFile(file);
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const Share = { shareStrip, downloadStrip };
