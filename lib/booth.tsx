'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  Lens,
  Settings,
  Shot,
  StripRecord,
  ViewName,
} from './types';
import { takePhoto } from './capture';
import { ProCamera } from './procamera';
import { Compose } from './compose';
import { Share } from './share';
import { allStrips, deleteStrip, putStrip } from './store';

export interface ProStatus {
  running: boolean;
  label: string;
  count: number | null;
  status: string;
}

interface BoothValue {
  view: ViewName;
  settings: Settings;
  shots: (Shot | null)[];
  stripNo: number;
  gallery: StripRecord[];
  toastMsg: string | null;
  pro: ProStatus;
  result: { dataUrl: string; name: string } | null;
  updateSettings: (patch: Partial<Settings>) => void;
  go: (v: ViewName) => void;
  notify: (msg: string) => void;
  refreshGallery: () => Promise<void>;
  startSession: () => void;
  shootNative: (input: HTMLInputElement, index: number) => Promise<void>;
  startPro: (video: HTMLVideoElement) => void;
  flipLens: (video: HTMLVideoElement) => void;
  cancelPro: () => void;
  getStripCanvas: () => HTMLCanvasElement;
  finalize: () => Promise<void>;
  openRecord: (rec: StripRecord) => void;
  share: () => Promise<void>;
  download: () => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
}

const BoothContext = createContext<BoothValue | null>(null);

export function useBooth(): BoothValue {
  const v = useContext(BoothContext);
  if (!v) throw new Error('useBooth must be used inside BoothProvider');
  return v;
}

function slug(name: string): string {
  return (
    (name || 'booth')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'booth'
  );
}

export function BoothProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewName>('home');
  const [settings, setSettings] = useState<Settings>(() => ({
    eventName:
      typeof window !== 'undefined'
        ? localStorage.getItem('booth.eventName') || ''
        : '',
    layout: 'strip4',
    mode: 'native',
    camera: 'user',
    countdown: 3,
    filter: 'natural',
    template: 'editorial',
    caption: '',
  }));
  const [shots, setShots] = useState<(Shot | null)[]>([]);
  const [stripNo, setStripNo] = useState(1);
  const [gallery, setGallery] = useState<StripRecord[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [pro, setPro] = useState<ProStatus>({
    running: false,
    label: '',
    count: null,
    status: '',
  });
  const [result, setResult] = useState<{ dataUrl: string; name: string } | null>(
    null
  );
  const [stripCanvas, setStripCanvas] = useState<HTMLCanvasElement | null>(null);

  const cancelledRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const go = useCallback((v: ViewName) => {
    setView(v);
    window.scrollTo(0, 0);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const refreshGallery = useCallback(async () => {
    try {
      setGallery(await allStrips());
    } catch {
      /* gallery unavailable */
    }
  }, []);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  /* ---------------- session ---------------- */

  const startSession = useCallback(() => {
    const n = Compose.shotsFor(settings.layout);
    setShots(new Array(n).fill(null));
    cancelledRef.current = false;
    try {
      localStorage.setItem('booth.eventName', settings.eventName);
    } catch {
      /* ignore */
    }
    go('capture');
  }, [settings.layout, settings.eventName, go]);

  /* ---------------- native capture ---------------- */

  const shootNative = useCallback(
    async (input: HTMLInputElement, index: number) => {
      try {
        const file = await takePhoto(input, settings.camera);
        const img = await Compose.loadPhoto(file);
        setShots((prev) => {
          const next = [...prev];
          next[index] = { file, img };
          return next;
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Camera failed.';
        if (msg !== 'cancelled') notify(msg);
      }
    },
    [settings.camera, notify]
  );

  /* ---------------- pro capture ---------------- */

  const beep = useCallback((freq: number, dur: number) => {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      audioRef.current = audioRef.current || new AC();
      const ctx = audioRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {
      /* audio unavailable — countdown still works */
    }
  }, []);

  const runCountdown = useCallback(
    (sec: number): Promise<void> =>
      new Promise((resolve) => {
        if (!sec || sec <= 0) return resolve();
        let left = sec;
        setPro((p) => ({ ...p, count: left }));
        beep(520, 0.12);
        const timer = window.setInterval(() => {
          if (cancelledRef.current) {
            window.clearInterval(timer);
            setPro((p) => ({ ...p, count: null }));
            return resolve();
          }
          left -= 1;
          if (left <= 0) {
            window.clearInterval(timer);
            setPro((p) => ({ ...p, count: null }));
            beep(880, 0.22);
            return resolve();
          }
          setPro((p) => ({ ...p, count: left }));
          beep(520, 0.12);
        }, 1000);
      }),
    [beep]
  );

  const runProLoop = useCallback(
    async (video: HTMLVideoElement, camera: Lens) => {
      const n = Compose.shotsFor(settings.layout);
      const countdownSec = settings.countdown;
      cancelledRef.current = false;
      setPro({
        running: true,
        label: `Shot 1 of ${n}`,
        count: null,
        status: 'Get ready…',
      });
      try {
        await ProCamera.start(camera, video);
      } catch {
        ProCamera.stop();
        notify('Could not open the camera. Check permission, or use native mode.');
        setSettings((s) => ({ ...s, mode: 'native' }));
        setPro((p) => ({ ...p, running: false }));
        return;
      }
      for (let i = 0; i < n; i++) {
        if (cancelledRef.current) break;
        setPro((p) => ({
          ...p,
          label: `Shot ${i + 1} of ${n}`,
          status: 'Get ready…',
        }));
        await runCountdown(countdownSec);
        if (cancelledRef.current) break;
        try {
          const frame = ProCamera.capture(camera === 'user');
          const file = await ProCamera.canvasToFile(frame, `shot-${i + 1}.jpg`);
          const img = await Compose.loadPhoto(file);
          setShots((prev) => {
            const next = [...prev];
            next[i] = { file, img };
            return next;
          });
          setPro((p) => ({ ...p, status: 'Got it!' }));
        } catch {
          notify('Capture failed.');
          break;
        }
        await new Promise((r) => setTimeout(r, 650));
        if (cancelledRef.current) break;
      }
      ProCamera.stop();
      setPro((p) => ({ ...p, running: false, count: null }));
      if (cancelledRef.current) {
        setSettings((s) => ({ ...s, mode: 'native' }));
        notify('Switched to native camera — finish the remaining shots.');
        return;
      }
      go('review');
    },
    [settings.layout, settings.countdown, notify, runCountdown, go]
  );

  const startPro = useCallback(
    (video: HTMLVideoElement) => {
      if (!ProCamera.supported()) {
        notify('Pro camera is not available in this browser.');
        setSettings((s) => ({ ...s, mode: 'native' }));
        return;
      }
      void runProLoop(video, settings.camera);
    },
    [settings.camera, runProLoop, notify]
  );

  const flipLens = useCallback(
    (video: HTMLVideoElement) => {
      const next: Lens = settings.camera === 'user' ? 'environment' : 'user';
      cancelledRef.current = true;
      ProCamera.stop();
      setSettings((s) => ({ ...s, camera: next }));
      setShots(new Array(Compose.shotsFor(settings.layout)).fill(null));
      window.setTimeout(() => {
        void runProLoop(video, next);
      }, 300);
    },
    [settings.camera, settings.layout, runProLoop]
  );

  const cancelPro = useCallback(() => {
    cancelledRef.current = true;
    ProCamera.stop();
    setPro((p) => ({ ...p, running: false, count: null, status: 'Cancelled' }));
  }, []);

  /* ---------------- review / result ---------------- */

  const getStripCanvas = useCallback((): HTMLCanvasElement => {
    const photos = shots.map((s) => s!.img);
    return Compose.render({
      photos,
      layout: settings.layout,
      template: settings.template,
      eventName: settings.eventName,
      caption: settings.caption,
      filter: settings.filter,
      stripNo,
      ts: Date.now(),
    });
  }, [shots, settings, stripNo]);

  const finalize = useCallback(async () => {
    const canvas = getStripCanvas();
    const name = `${slug(settings.eventName)}-strip-${String(stripNo).padStart(3, '0')}.jpg`;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    try {
      await putStrip({
        id: 'strip-' + Date.now(),
        ts: Date.now(),
        dataUrl,
        eventName: settings.eventName,
        layout: settings.layout,
      });
    } catch {
      notify('Saved, but the gallery is full on this device.');
    }
    setStripCanvas(canvas);
    setResult({ dataUrl, name });
    setStripNo((n) => n + 1);
    go('result');
    void refreshGallery();
  }, [getStripCanvas, settings.eventName, settings.layout, stripNo, notify, refreshGallery, go]);

  const openRecord = useCallback(
    (rec: StripRecord) => {
      const full = new Image();
      full.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = full.naturalWidth;
        cv.height = full.naturalHeight;
        cv.getContext('2d')!.drawImage(full, 0, 0);
        setStripCanvas(cv);
        setResult({ dataUrl: rec.dataUrl, name: `${slug(rec.eventName)}.jpg` });
        go('result');
      };
      full.src = rec.dataUrl;
    },
    [go]
  );

  const share = useCallback(async () => {
    if (!stripCanvas || !result) return;
    try {
      const res = await Share.shareStrip(stripCanvas, result.name);
      notify(res === 'shared' ? 'Sent to the share sheet.' : 'Downloaded.');
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError')
        notify('Sharing failed — try Download.');
    }
  }, [stripCanvas, result, notify]);

  const download = useCallback(async () => {
    if (!stripCanvas || !result) return;
    await Share.downloadStrip(stripCanvas, result.name);
    notify('Downloaded.');
  }, [stripCanvas, result, notify]);

  const removeRecord = useCallback(
    async (id: string) => {
      await deleteStrip(id);
      await refreshGallery();
    },
    [refreshGallery]
  );

  const value: BoothValue = {
    view,
    settings,
    shots,
    stripNo,
    gallery,
    toastMsg,
    pro,
    result,
    updateSettings,
    go,
    notify,
    refreshGallery,
    startSession,
    shootNative,
    startPro,
    flipLens,
    cancelPro,
    getStripCanvas,
    finalize,
    openRecord,
    share,
    download,
    removeRecord,
  };

  return <BoothContext.Provider value={value}>{children}</BoothContext.Provider>;
}
