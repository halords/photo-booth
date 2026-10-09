import type { Lens } from './types';

/**
 * Pro Camera — in-app viewfinder via getUserMedia. Frames are grabbed
 * programmatically, so countdown auto-fire needs no per-shot tap gesture.
 * Unavailable in installed iOS PWAs — callers must fall back to native mode.
 */
let stream: MediaStream | null = null;
let videoEl: HTMLVideoElement | null = null;

export function supported(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}

export async function start(
  facingMode: Lens,
  videoElement: HTMLVideoElement
): Promise<void> {
  stop();
  videoEl = videoElement;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.classList.toggle('mirrored', facingMode === 'user');
  await videoEl.play();
}

export function stop(): void {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (videoEl) {
    videoEl.srcObject = null;
    videoEl = null;
  }
}

/** Grab the current frame as a square canvas (center crop). */
export function capture(mirrored: boolean): HTMLCanvasElement {
  if (!videoEl || !videoEl.videoWidth) throw new Error('Camera not ready.');
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const s = Math.min(vw, vh);
  const sx = (vw - s) / 2;
  const sy = (vh - s) / 2;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d')!;
  if (mirrored) {
    ctx.translate(s, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, sx, sy, s, s, 0, 0, s, s);
  return cv;
}

export function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not encode frame.'));
      resolve(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

export const ProCamera = { supported, start, stop, capture, canvasToFile };
