'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CameraDevice, Lens, Settings, Shot, StripRecord, ViewName } from './types';
import { takePhoto } from './capture';
import { ProCamera } from './procamera';
import { Compose } from './compose';
import { Share, type ImageFormat } from './share';
import { allStrips, deleteStrip, putStrip, sessionFiles } from './store';
import { DEFAULT_4R, sanitize4R } from './layouts';
import { isSeasonal, SEASONAL_THEMES } from './seasonal';
import { DEFAULT_BACKGROUND, sanitizeBackground } from './background';
import { isSplit, printWidth, requiredPhotos } from './session-settings';
import { buildSession } from './session-bundle';

interface ProStatus { running: boolean; count: number | null; status: string; cameraReady: boolean; error: string | null; flash: boolean }
interface Result { dataUrl: string; name: string; id: string; saved: boolean; width: number; height: number; editable: boolean; printOrientation?: 'portrait' | 'landscape'; files?: File[]; assets?: StripRecord['assets']; dpi: number }
interface BoothValue {
  view: ViewName; settings: Settings; shots: (Shot | null)[]; stripNo: number; gallery: StripRecord[];
  galleryLoading: boolean; toastMsg: string | null; pro: ProStatus; result: Result | null; busy: boolean;
  cameras: CameraDevice[]; selectedCamera: CameraDevice | null;
  updateSettings: (patch: Partial<Settings>) => void; go: (view: ViewName) => void; notify: (msg: string) => void;
  refreshGallery: () => Promise<void>; startSession: () => void; shootNative: (input: HTMLInputElement, index: number) => Promise<void>;
  importPhotos: (files: File[], index?: number) => Promise<void>; useDemo: () => Promise<void>;
  startPro: (video: HTMLVideoElement, lens?: Lens) => Promise<void>; flipLens: (video: HTMLVideoElement) => void;
  cancelPro: () => void; stopSequence: () => void; captureSequence: (single?: boolean) => Promise<void>;
  getStripCanvas: (preview?: boolean) => Promise<HTMLCanvasElement>; finalize: () => Promise<void>;
  openRecord: (rec: StripRecord) => void; share: () => Promise<void>; download: (format?: ImageFormat) => Promise<void>;
  removeRecord: (id: string) => Promise<void>; toggleFavorite: (id: string) => Promise<void>;
  detectCameras: () => Promise<void>; selectCamera: (camera: CameraDevice | null) => void;
  retakeShot: (index: number) => void; moveShot: (index: number, direction: -1 | 1) => void;
  editShot: (index: number, patch: Partial<NonNullable<Shot['edit']>>) => void;
}
const Context = createContext<BoothValue | null>(null);
export function useBooth() { const value = useContext(Context); if (!value) throw new Error('Missing BoothProvider'); return value; }
const defaults: Settings = {
  stripMode: 'single',
  customLayout: DEFAULT_4R,
  stripBackground: DEFAULT_BACKGROUND,
  eventName: '', layout: 'strip4', mode: 'pro', camera: 'user', cameraSource: 'webcam', countdown: 3,
  filter: 'natural', template: 'polaroid-white', caption: '', stripSize: 'standard', printDPI: 300,
  soundEnabled: true, flashEnabled: true, countdownSound: true, mirrorMode: true, quality: 'high',
  showGrid: false, greenScreenEnabled: false, greenScreenColor: '#00ff00', backgroundImage: null,
  frameColor: '', showDate: true,
};
const emptyPro: ProStatus = { running: false, count: null, status: 'Starting camera…', cameraReady: false, error: null, flash: false };
const defaultEdit = { zoom: 1, x: 0, y: 0, rotation: 0, mirror: false };
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pocket';
const sleep = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms));
function closeShot(shot: Shot | null) { if (shot?.img && 'close' in shot.img) shot.img.close(); }
async function makeShot(file: File): Promise<Shot> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpg|jpeg|png|webp|avif)$/i.test(file.name)) throw new Error('Choose an image file, such as JPG, PNG, or HEIC.');
  if (file.size > 40 * 1024 * 1024) throw new Error('Choose a photo smaller than 40 MB.');
  const img = await Compose.loadPhoto(file);
  return { file, img, timestamp: Date.now(), cameraSource: 'webcam', edit: { ...defaultEdit } };
}
export function BoothProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewName>('home'), [settings, setSettings] = useState<Settings>(defaults);
  const [shots, setShots] = useState<(Shot | null)[]>([]), [stripNo, setStripNo] = useState(1);
  const [gallery, setGallery] = useState<StripRecord[]>([]), [galleryLoading, setGalleryLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null), [pro, setPro] = useState<ProStatus>(emptyPro);
  const [result, setResult] = useState<Result | null>(null), [busy, setBusy] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]), [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);
  const settingsRef = useRef(settings), shotsRef = useRef(shots), cameraRef = useRef(selectedCamera);
  const sequence = useRef(0), session = useRef(0), running = useRef(false), busyRef = useRef(false);
  const cameraRequest = useRef(0);
  const backgroundStorageWarning = useRef(false);
  const nativePending = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null), flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultCanvas = useRef<HTMLCanvasElement | null>(null), audio = useRef<AudioContext | null>(null);
  const videoFallbackNotice = useRef(false);
  const sessionTime = useRef(Date.now());
  const viewRef = useRef(view); viewRef.current = view;
  useEffect(() => () => { if (result?.dataUrl.startsWith('blob:')) URL.revokeObjectURL(result.dataUrl); }, [result?.dataUrl]);
  settingsRef.current = settings; cameraRef.current = selectedCamera;
  const replaceShots = useCallback((next: (Shot | null)[]) => { shotsRef.current = next; setShots(next); }, []);
  const notify = useCallback((message: string) => {
    setToastMsg(message); if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 4500);
  }, []);
  const stopSequence = useCallback(() => {
    sequence.current++; running.current = false;
    setPro(p => ({ ...p, running: false, count: null, flash: false, status: p.cameraReady ? 'Ready when you are' : p.status }));
  }, []);
  const cancelPro = useCallback(() => { cameraRequest.current++; stopSequence(); ProCamera.stop(); setPro(p => ({ ...p, cameraReady: false, status: 'Camera paused' })); }, [stopSequence]);
  const go = useCallback((next: ViewName) => {
    stopSequence(); if (next !== 'capture') ProCamera.stop();
    if (next !== viewRef.current) session.current++;
    viewRef.current = next;
    setView(next); window.scrollTo({ top: 0, behavior: 'instant' });
  }, [stopSequence]);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch }; settingsRef.current = next; setSettings(next);
    try { localStorage.setItem('booth.settings', JSON.stringify(next)); }
    catch {
      // Large artwork stays available for this session even if preferences quota is small.
      try { localStorage.setItem('booth.settings', JSON.stringify({ ...next, stripBackground: { ...next.stripBackground, dataUrl: null }, customLayout: { ...next.customLayout, backgroundDataUrl: null } })); } catch {}
      if (!backgroundStorageWarning.current && (next.stripBackground.dataUrl || next.customLayout.backgroundDataUrl)) {
        backgroundStorageWarning.current = true;
        notify('Background artwork is available for this session only because device storage is full.');
      }
    }
  }, [notify]);
  const refreshGallery = useCallback(async () => {
    try { setGallery(await allStrips()); } catch { notify('Device storage is unavailable. You can still download your strips.'); }
    finally { setGalleryLoading(false); }
  }, [notify]);
  const detectCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter(d => d.kind === 'videoinput').map((d, index) => ({
        id: d.deviceId, label: d.label || 'Camera ' + (index + 1), source: 'webcam', type: 'webcam', connected: true,
        capabilities: { maxResolution: { width: 1920, height: 1080 }, minResolution: { width: 640, height: 480 }, supportsHD: true, supports4K: false, supportsRAW: false, supportsFlash: false, supportsManual: false },
      })));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('booth.settings') || '{}');
      const next = { ...defaults, ...saved };
      if (!Compose.LAYOUTS[next.layout as keyof typeof Compose.LAYOUTS]) next.layout = defaults.layout;
      if (!Compose.TEMPLATES[next.template as keyof typeof Compose.TEMPLATES]) next.template = defaults.template;
      if (!['native', 'pro', 'upload'].includes(next.mode)) next.mode = 'pro';
      if (!['single', 'same', 'different'].includes(next.stripMode)) next.stripMode = 'single';
      if (![300, 600].includes(next.printDPI)) next.printDPI = 300;
      next.customLayout = sanitize4R(saved.customLayout);
      next.stripBackground = sanitizeBackground(saved.stripBackground);
      for (const key of ['eventName', 'caption', 'frameColor'] as const) if (typeof next[key] !== 'string') next[key] = defaults[key];
      next.eventName = next.eventName.slice(0, 48); next.caption = next.caption.slice(0, 60);
      if (!/^#[0-9a-f]{6}$/i.test(next.frameColor)) next.frameColor = '';
      if (![0, 3, 5, 10].includes(next.countdown)) next.countdown = 3;
      if (!['natural', 'noir', 'sepia', 'warm', 'vivid', 'cool', 'fade', 'dramatic', 'vintage-film', 'crossprocess', 'teal-orange'].includes(next.filter)) next.filter = 'natural';
      if (!['user', 'environment'].includes(next.camera)) next.camera = 'user';
      for (const key of ['soundEnabled', 'flashEnabled', 'countdownSound', 'mirrorMode', 'showGrid', 'showDate'] as const) if (typeof next[key] !== 'boolean') next[key] = defaults[key];
      settingsRef.current = next; setSettings(next);
      const number = Number(localStorage.getItem('booth.stripNo')); if (Number.isFinite(number) && number > 0) setStripNo(Math.floor(number));
    } catch {}
    if (new URLSearchParams(window.location.search).get('action') === 'setup') setView('setup');
    void refreshGallery(); void detectCameras();
    const devices = navigator.mediaDevices;
    devices?.addEventListener('devicechange', detectCameras);
    const onHide = () => { if (document.hidden) cancelPro(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      devices?.removeEventListener('devicechange', detectCameras); document.removeEventListener('visibilitychange', onHide);
      ProCamera.stop(); sequence.current++; session.current++; shotsRef.current.forEach(closeShot);
      if (toastTimer.current) clearTimeout(toastTimer.current); if (flashTimer.current) clearTimeout(flashTimer.current);
      void audio.current?.close(); audio.current = null;
    };
  }, [refreshGallery, detectCameras, cancelPro]);
  const selectCamera = useCallback((camera: CameraDevice | null) => { setSelectedCamera(camera); cameraRef.current = camera; }, []);
  const startSession = useCallback(() => {
    session.current++; cancelPro(); shotsRef.current.forEach(closeShot);
    replaceShots(new Array(requiredPhotos(settingsRef.current)).fill(null)); sessionTime.current = Date.now();
    videoFallbackNotice.current = false;
    setResult(null); resultCanvas.current = null; setPro(emptyPro); go('capture');
  }, [cancelPro, replaceShots, go]);
  const importPhotos = useCallback(async (files: File[], index?: number) => {
    if (busyRef.current || running.current) return;
    const slots = index === undefined ? shotsRef.current.map((shot, i) => shot ? -1 : i).filter(i => i >= 0) : [index];
    if (!slots.length) { notify('Your strip is full. Replace a photo to try another.'); return; }
    const chosen = files.slice(0, slots.length), request = session.current;
    if (!chosen.length) return; busyRef.current = true; setBusy(true);
    try {
      const additions: { index: number; shot: Shot }[] = [];
      for (let i = 0; i < chosen.length; i++) {
        try {
          const shot = await makeShot(chosen[i]);
          if (request !== session.current) { closeShot(shot); break; }
          additions.push({ index: slots[i], shot });
        } catch (error) { notify(error instanceof Error ? error.message : 'Could not open photo.'); }
      }
      if (request === session.current) {
        const next = [...shotsRef.current];
        for (const { index: slot, shot } of additions) { closeShot(next[slot]); next[slot] = shot; }
        replaceShots(next); if (additions.length) notify(additions.length + (additions.length === 1 ? ' photo added.' : ' photos added.'));
      } else additions.forEach(({ shot }) => closeShot(shot));
    } finally { busyRef.current = false; setBusy(false); }
  }, [notify, replaceShots]);
  const shootNative = useCallback(async (input: HTMLInputElement, index: number) => {
    if (busyRef.current || nativePending.current) return;
    nativePending.current = true; setBusy(true); const request = session.current;
    try { const file = await takePhoto(input, settingsRef.current.camera); if (request === session.current) await importPhotos([file], index); }
    catch (error) { if (error instanceof Error && error.message !== 'cancelled') notify(error.message); }
    finally { nativePending.current = false; setBusy(false); }
  }, [importPhotos, notify]);
  const useDemo = useCallback(async () => {
    if (busyRef.current) return;
    updateSettings({ mode: 'upload' }); startSession();
    const request = session.current;
    try {
      const paths = ['portrait-1.jpg', 'friends.jpg', 'portrait-3.jpg', 'portrait-2.jpg'];
      const files: File[] = [];
      for (let i = 0; i < requiredPhotos(settingsRef.current); i++) {
        const s = settingsRef.current, sampleIndex = i + (s.stripMode === 'different' && isSplit(s.layout, s.stripMode) && i >= Compose.shotsFor(s.layout) ? 1 : 0);
        const response = await fetch('/photos/' + paths[sampleIndex % paths.length]);
        if (!response.ok) throw new Error('Sample photos could not be opened.');
        files.push(new File([await response.blob()], 'sample-' + i + '.jpg', { type: 'image/jpeg' }));
        if (request !== session.current) return;
      }
      await importPhotos(files); if (request === session.current && shotsRef.current.every(Boolean)) go('review');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not load sample photos.'); }
  }, [updateSettings, startSession, importPhotos, go, notify]);
  const startPro = useCallback(async (video: HTMLVideoElement, lens?: Lens) => {
    const request = ++cameraRequest.current;
    if (!ProCamera.supported()) { setPro({ ...emptyPro, error: 'Live camera needs HTTPS and a browser with camera support. You can upload photos instead.' }); return; }
    setPro({ ...emptyPro }); stopSequence();
    try {
      const s = settingsRef.current;
      await ProCamera.start(lens || s.camera, video, cameraRef.current?.id || undefined, s.mirrorMode);
      if (request !== cameraRequest.current) return;
      setPro(p => ({ ...p, cameraReady: true, status: 'Ready when you are', error: null })); void detectCameras();
    } catch (error) {
      if (request !== cameraRequest.current) return;
      if (error instanceof Error && error.name === 'AbortError') return;
      const name = error instanceof Error ? error.name : '';
      const message = name === 'NotAllowedError' ? 'Camera access is blocked. Allow the camera in your browser settings, or upload photos.'
        : name === 'NotFoundError' ? 'No camera found. Connect a webcam or use photos from your device.'
        : 'Could not start this camera. Try another camera or upload photos.';
      setPro(p => ({ ...p, error: message, cameraReady: false, status: 'Camera unavailable' }));
    }
  }, [stopSequence, detectCameras]);
  const flipLens = useCallback((video: HTMLVideoElement) => {
    const next = settingsRef.current.camera === 'user' ? 'environment' : 'user';
    selectCamera(null); updateSettings({ camera: next }); void startPro(video, next);
  }, [selectCamera, updateSettings, startPro]);
  const beep = useCallback((shutter = false) => {
    if (!settingsRef.current.soundEnabled) return;
    try {
      audio.current ||= new AudioContext(); const ctx = audio.current; void ctx.resume();
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.frequency.value = shutter ? 1200 : 660; gain.gain.setValueAtTime(0.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.11);
    } catch {}
  }, []);
  const captureSequence = useCallback(async (single = false) => {
    if (running.current || busyRef.current) return;
    const missing = shotsRef.current.map((shot, i) => shot ? -1 : i).filter(i => i >= 0); if (!missing.length) return;
    running.current = true; const request = ++sequence.current, sessionId = session.current;
    const targets = single ? missing.slice(0, 1) : missing; beep();
    setPro(p => ({ ...p, running: true, error: null }));
    try {
      for (const index of targets) {
        for (let count = settingsRef.current.countdown; count > 0; count--) {
          if (request !== sequence.current) return;
          setPro(p => ({ ...p, count, status: 'Photo ' + (index + 1) + ' · ' + (count === 1 ? 'Smile!' : 'Get ready') }));
          if (settingsRef.current.countdownSound) beep();
          await sleep(1000);
        }
        if (request !== sequence.current) return;
        setPro(p => ({ ...p, count: null, status: 'Looking good!', flash: settingsRef.current.flashEnabled }));
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setPro(p => ({ ...p, flash: false })), 160);
        const captured = await ProCamera.captureFile('pocket-shot-' + (index + 1) + '.jpg');
        const shot = await makeShot(captured.file);
        shot.cameraSource = cameraRef.current?.source || 'webcam';
        shot.edit = { ...defaultEdit, mirror: settingsRef.current.camera === 'user' && settingsRef.current.mirrorMode };
        if (!captured.still && !videoFallbackNotice.current) {
          videoFallbackNotice.current = true;
          notify('This camera provides video frames. For full camera originals, use Phone camera or upload DSLR photos.');
        }
        if (request !== sequence.current || sessionId !== session.current) { closeShot(shot); return; }
        const next = [...shotsRef.current]; closeShot(next[index]); next[index] = shot; replaceShots(next); beep(true);
        if (index !== targets[targets.length - 1]) await sleep(900);
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'Capture failed. Please try again.'); }
    finally {
      if (request === sequence.current) {
        running.current = false;
        setPro(p => ({ ...p, running: false, count: null, flash: false, status: shotsRef.current.every(Boolean) ? 'All photos captured. Make it yours!' : 'Ready when you are' }));
      }
    }
  }, [replaceShots, notify, beep]);
  const retakeShot = useCallback((index: number) => {
    stopSequence(); const next = [...shotsRef.current]; closeShot(next[index]); next[index] = null; replaceShots(next);
  }, [stopSequence, replaceShots]);
  const editShot = useCallback((index: number, patch: Partial<NonNullable<Shot['edit']>>) => {
    const next = [...shotsRef.current], shot = next[index]; if (!shot) return;
    next[index] = { ...shot, edit: { ...defaultEdit, ...shot.edit, ...patch } }; replaceShots(next);
  }, [replaceShots]);
  const moveShot = useCallback((index: number, direction: -1 | 1) => {
    const next = [...shotsRef.current], other = index + direction; if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]]; replaceShots(next);
  }, [replaceShots]);
  const getStripCanvas = useCallback(async (preview = false) => {
    const current = shotsRef.current, s = settingsRef.current;
    if (current.length !== requiredPhotos(s) || current.some(shot => !shot)) throw new Error('Add all photos before making your strip.');
    return Compose.render({ photos: current.map(shot => shot!.img), edits: current.map(shot => shot!.edit), layout: s.layout,
      template: s.template, eventName: s.eventName, caption: s.caption, filter: s.filter, stripNo, ts: sessionTime.current,
      frameColor: s.frameColor, showDate: s.showDate, customLayout: s.customLayout, stripBackground: s.stripBackground, stripMode: s.stripMode, width: preview ? 480 : printWidth(s) });
  }, [stripNo]);
  const finalize = useCallback(async () => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    const request = session.current;
    try {
      const canvas = await getStripCanvas(), s = settingsRef.current;
      if (request !== session.current) return;
      const bundle = await buildSession(canvas, shotsRef.current as Shot[], s.filter, s.printDPI);
      if (request !== session.current) return;
      const occasion = s.layout === 'custom4r' ? s.customLayout.decoration : s.template;
      const eventName = s.eventName || (isSeasonal(occasion) ? occasion === 'halloween' ? SEASONAL_THEMES.halloween.sub : SEASONAL_THEMES.christmas.title : 'Photo booth session');
      const thumb = document.createElement('canvas');
      thumb.width = 240; thumb.height = Math.round(canvas.height * 240 / canvas.width); thumb.getContext('2d')!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
      const thumbnailUrl = thumb.toDataURL('image/jpeg', 0.85);
      const record: StripRecord = { id: crypto.randomUUID(), ts: sessionTime.current, dataUrl: thumbnailUrl, thumbnailUrl,
        assets: bundle.assets, dpi: s.printDPI, stripMode: s.stripMode,
        eventName, layout: s.layout, template: s.template, photos: [], caption: s.caption, filter: s.filter, width: canvas.width, height: canvas.height, favorite: false, printOrientation: s.layout === 'custom4r' ? s.customLayout.orientation : isSplit(s.layout, s.stripMode) ? 'portrait' : undefined };
      let saved = true;
      try { await putStrip(record, bundle.files); } catch { saved = false; notify('Browser cache is full or unavailable. Download this session folder to keep it.'); }
      void refreshGallery(); if (request !== session.current) return;
      resultCanvas.current = canvas;
      setResult({ dataUrl: URL.createObjectURL(bundle.files[0]), files: bundle.files, assets: bundle.assets, dpi: s.printDPI, name: slug(s.eventName || (isSeasonal(occasion) ? eventName : '')) + '-strip-' + String(stripNo).padStart(3, '0') + '.jpg', id: record.id, saved, width: canvas.width, height: canvas.height, editable: true, printOrientation: record.printOrientation });
      setStripNo(stripNo + 1); try { localStorage.setItem('booth.stripNo', String(stripNo + 1)); } catch {}
      go('result'); void refreshGallery();
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not create your strip.'); }
    finally { busyRef.current = false; setBusy(false); }
  }, [getStripCanvas, stripNo, notify, go, refreshGallery]);
  const openRecord = useCallback((record: StripRecord) => {
    const request = ++session.current;
    void (async () => {
      let url: string | undefined;
      try {
        const files = record.assets?.length ? await sessionFiles(record) : undefined;
        url = files ? URL.createObjectURL(files[0]) : record.dataUrl;
        const img = new Image(); img.src = url; await img.decode();
        if (request !== session.current) { if (url.startsWith('blob:')) URL.revokeObjectURL(url); return; }
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; cv.getContext('2d')!.drawImage(img, 0, 0);
        resultCanvas.current = cv; setResult({ dataUrl: url, files, assets: record.assets, dpi: record.dpi || 300, name: slug(record.eventName) + '-' + record.id.slice(0, 8) + '.jpg', id: record.id, saved: true, width: cv.width, height: cv.height, editable: false, printOrientation: record.printOrientation }); go('result');
      } catch (error) { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); notify(error instanceof Error ? error.message : 'Could not open this session.'); }
    })();
  }, [go, notify]);
  const share = useCallback(async () => {
    if (!resultCanvas.current || !result) return;
    try { const status = await Share.shareStrip(resultCanvas.current, result.name, result.dpi); notify(status === 'shared' ? 'Shared! Pass the memories around.' : 'Your strip was downloaded.'); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) notify('Sharing is unavailable. Try downloading your strip.'); }
  }, [result, notify]);
  const download = useCallback(async (format: ImageFormat = 'jpg') => {
    if (!resultCanvas.current || !result) return;
    try { await Share.downloadStrip(resultCanvas.current, result.name, format, result.dpi); notify('Your ' + format.toUpperCase() + ' is ready.'); } catch { notify('Could not download. Please try again.'); }
  }, [result, notify]);
  const removeRecord = useCallback(async (id: string) => {
    try { await deleteStrip(id); await refreshGallery(); notify('Strip deleted from this device.'); } catch { notify('Could not delete this strip.'); }
  }, [refreshGallery, notify]);
  const toggleFavorite = useCallback(async (id: string) => {
    const record = gallery.find(r => r.id === id); if (!record) return;
    try { await putStrip({ ...record, favorite: !record.favorite }); await refreshGallery(); } catch { notify('Could not update favorites.'); }
  }, [gallery, refreshGallery, notify]);
  return <Context.Provider value={{ view, settings, shots, stripNo, gallery, galleryLoading, toastMsg, pro, result, busy, cameras, selectedCamera,
    updateSettings, go, notify, refreshGallery, startSession, shootNative, importPhotos, useDemo, startPro, flipLens, cancelPro, stopSequence,
    captureSequence, getStripCanvas, finalize, openRecord, share, download, removeRecord, toggleFavorite, detectCameras, selectCamera, retakeShot, moveShot, editShot }}>{children}</Context.Provider>;
}
