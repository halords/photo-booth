'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
let samples: Promise<HTMLImageElement[]> | undefined;
function loadSamples() {
  samples ||= Promise.all(['portrait-1.jpg', 'friends.jpg', 'portrait-3.jpg', 'portrait-2.jpg'].map(name => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Sample photos could not be opened.')); img.src = '/photos/' + name;
  }))).catch(error => { samples = undefined; throw error; });
  return samples;
}
export default function SetupPrintPreview() {
  const { settings } = useBooth(), canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { void (async () => {
      const photos = settings.layout === 'custom4r' ? [] : await loadSamples();
      if (cancelled) return;
      const rendered = await Compose.render({ ...settings, photos: Array.from({ length: settings.layout === 'custom4r' ? 0 : Compose.shotsFor(settings.layout) }, (_, i) => photos[i % photos.length]), stripNo: 1, width: 480 });
      if (!cancelled && canvas.current) { canvas.current.width = rendered.width; canvas.current.height = rendered.height; canvas.current.getContext('2d')!.drawImage(rendered, 0, 0); setError(''); }
    })().catch(e => { if (!cancelled) setError(e.message); }); }, 45);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [settings]);
  return <><canvas ref={canvas} aria-label="Preview of your photo booth print" />{error && <p role="status">{error}</p>}</>;
}
