'use client';

import { zip } from 'fflate';
import { renderShot, size } from './compose';
import { canvasToFile, downloadFile } from './share';
import type { FilterId, SessionAsset, Shot } from './types';

export interface SessionFiles { assets: SessionAsset[]; files: File[] }
export interface SharedLink { url: string; expiresAt: number }

async function makeGif(shots: Shot[], filter: FilterId): Promise<File> {
  const worker = new Worker(new URL('./gif.worker.ts', import.meta.url));
  const send = (message: object, transfer: Transferable[] = []) => new Promise<{ bytes?: Uint8Array }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('GIF generation timed out. Please try again.')), 60000);
    worker.onmessage = event => { clearTimeout(timer); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data); };
    worker.onerror = () => { clearTimeout(timer); reject(new Error('Could not generate the GIF. Please try again.')); };
    worker.postMessage(message, transfer);
  });
  try {
    const frame = document.createElement('canvas'); frame.width = 800; frame.height = 800;
    const ctx = frame.getContext('2d', { willReadFrequently: true })!;
    // Frame-by-frame transfer bounds peak memory even for large DSLR originals.
    for (const shot of shots) {
      const photo = renderShot(shot, filter, 800);
      ctx.fillStyle = '#f7f6f2'; ctx.fillRect(0, 0, 800, 800);
      ctx.drawImage(photo, (800 - photo.width) / 2, (800 - photo.height) / 2);
      const rgba = ctx.getImageData(0, 0, 800, 800).data;
      photo.width = photo.height = 0;
      await send({ rgba, width: 800, height: 800 }, [rgba.buffer]);
    }
    const result = await send({ finish: true });
    if (!result.bytes) throw new Error('GIF generation did not return a file.');
    return new File([new Uint8Array(result.bytes)], 'moments.gif', { type: 'image/gif' });
  } finally { worker.terminate(); }
}

export async function buildSession(canvas: HTMLCanvasElement, shots: Shot[], filter: FilterId, dpi: number): Promise<SessionFiles> {
  const layout = await canvasToFile(canvas, 'final-layout.png', 'png', dpi);
  const files = [layout], assets: SessionAsset[] = [{ name: layout.name, type: layout.type, size: layout.size, kind: 'layout', width: canvas.width, height: canvas.height }];
  for (const [index, shot] of shots.entries()) {
    const [width, height] = size(shot.img);
    const extension = /\.(jpe?g|png|webp|heic|heif|avif)$/i.exec(shot.file.name)?.[1].toLowerCase()
      || ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif' }[shot.file.type]) || 'jpg';
    const file = new File([shot.file], 'shot-' + String(index + 1).padStart(2, '0') + '.' + extension, { type: shot.file.type || 'image/' + extension });
    files.push(file); assets.push({ name: file.name, type: file.type, size: file.size, kind: 'shot', width, height });
  }
  const gif = await makeGif(shots, filter); files.push(gif);
  assets.push({ name: gif.name, type: gif.type, size: gif.size, kind: 'gif', width: 800, height: 800 });
  return { assets, files };
}

export async function sessionZip(files: File[], name: string): Promise<File> {
  const folder = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'photo-booth';
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[folder + '/' + file.name] = new Uint8Array(await file.arrayBuffer());
  const bytes = await new Promise<Uint8Array>((resolve, reject) => zip(entries, { level: 0 }, (error, data) => error ? reject(error) : resolve(data)));
  return new File([new Uint8Array(bytes)], folder + '.zip', { type: 'application/zip' });
}

interface DirectoryHandle { getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryHandle>; getFileHandle(name: string, options: { create: boolean }): Promise<{ createWritable(): Promise<{ write(file: File): Promise<void>; close(): Promise<void> }> }> }
export async function saveFolder(files: File[], name: string): Promise<void> {
  const picker = (window as unknown as { showDirectoryPicker?: (options: { mode: string }) => Promise<DirectoryHandle> }).showDirectoryPicker;
  if (!picker) { downloadFile(await sessionZip(files, name)); return; }
  const parent = await picker({ mode: 'readwrite' });
  const folder = await parent.getDirectoryHandle(name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80), { create: true });
  for (const file of files) {
    const handle = await folder.getFileHandle(file.name, { create: true }), writer = await handle.createWritable();
    try { await writer.write(file); } finally { await writer.close(); }
  }
}

export async function createSharedLink(archive: File): Promise<SharedLink> {
  const prepared = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: archive.name, size: archive.size }) });
  const target = await prepared.json().catch(() => ({}));
  if (!prepared.ok) throw new Error(target.error || 'Could not prepare sharing. Download the session folder instead.');
  if (target.storage === 'r2') {
    let uploaded: Response;
    try { uploaded = await fetch(target.uploadUrl, { method: 'PUT', headers: target.headers, body: archive }); }
    catch { throw new Error('Upload failed. Check your connection or the bucket CORS settings, then try again.'); }
    if (!uploaded.ok) throw new Error('The session upload failed. Please try again.');
    const verified = await fetch('/api/shares/' + target.id, { cache: 'no-store' });
    if (!verified.ok) throw new Error('Could not verify the uploaded folder. Please create a new link.');
    const info = await verified.json();
    return { url: new URL(target.url, location.origin).href, expiresAt: info.expiresAt };
  }
  const response = await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-Booth-Filename': archive.name }, body: archive });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not create a link. Download the session folder to share it.');
  return { url: new URL(payload.url, location.origin).href, expiresAt: payload.expiresAt };
}
