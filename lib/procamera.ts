import type { Lens } from './types';
let stream: MediaStream | null = null;
let videoEl: HTMLVideoElement | null = null;
let generation = 0;
export function supported() { return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia; }
export async function start(facingMode: Lens, video: HTMLVideoElement, deviceId?: string, mirror = true) {
  stop(); const request = generation;
  const opened = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facingMode } }),
    width: { ideal: 4096 }, height: { ideal: 3072 },
  } });
  if (request !== generation) { opened.getTracks().forEach(t => t.stop()); throw new DOMException('Camera request cancelled', 'AbortError'); }
  const track = opened.getVideoTracks()[0], caps = track.getCapabilities?.();
  if (caps?.width?.max && caps?.height?.max) {
    try { await track.applyConstraints({ width: { ideal: caps.width.max }, height: { ideal: caps.height.max } }); } catch { /* Keep the negotiated camera resolution. */ }
  }
  if (request !== generation) { opened.getTracks().forEach(t => t.stop()); throw new DOMException('Camera request cancelled', 'AbortError'); }
  stream = opened; videoEl = video; video.srcObject = opened; video.muted = true; video.playsInline = true;
  video.classList.toggle('mirrored', mirror && facingMode === 'user');
  try { await video.play(); } catch (error) { if (request === generation) stop(); throw error; }
  if (request !== generation) throw new DOMException('Camera request cancelled', 'AbortError');
}
export function stop() {
  generation++; stream?.getTracks().forEach(t => t.stop()); stream = null;
  if (videoEl) videoEl.srcObject = null; videoEl = null;
}
export function capture(mirrored: boolean) {
  if (!videoEl?.videoWidth || videoEl.readyState < 2) throw new Error('The camera is still warming up. Try again in a moment.');
  const w = videoEl.videoWidth, h = videoEl.videoHeight;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d')!;
  if (mirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); } ctx.drawImage(videoEl, 0, 0, w, h); return cv;
}
export function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: 'image/jpeg' })) : reject(new Error('Could not encode the photo.')), 'image/jpeg', 0.98));
}
type StillCapture = { takePhoto: () => Promise<Blob> };
type StillConstructor = new (track: MediaStreamTrack) => StillCapture;
export async function captureFile(name: string): Promise<{ file: File; still: boolean }> {
  const request = generation, track = stream?.getVideoTracks()[0];
  if (!track || track.readyState !== 'live') throw new Error('Your camera is paused. Resume it to take a photo.');
  const ImageCaptureAPI = (globalThis as unknown as { ImageCapture?: StillConstructor }).ImageCapture;
  if (ImageCaptureAPI) {
    try {
      // No size override: retain the camera's default still-photo dimensions and encoding.
      const blob = await new ImageCaptureAPI(track).takePhoto();
      if (request !== generation) throw new DOMException('Capture cancelled', 'AbortError');
      if (blob.size && blob.type.startsWith('image/')) {
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        return { file: new File([blob], name.replace(/\.[^.]+$/, '') + '.' + extension, { type: blob.type }), still: true };
      }
    } catch (error) {
      if (request !== generation || (error instanceof Error && error.name === 'AbortError')) throw error;
      // Many USB/capture-card drivers expose video only.
    }
  }
  if (request !== generation) throw new DOMException('Capture cancelled', 'AbortError');
  return { file: await canvasToFile(capture(false), name), still: false };
}
export const ProCamera = { supported, start, stop, capture, canvasToFile, captureFile };
