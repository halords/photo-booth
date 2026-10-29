'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
import { backgroundOptions, sanitizeBackground } from '@/lib/background';
import type { PrintBackground } from '@/lib/types';
import Icon from './Icon';

export default function BackgroundControls() {
  const { settings, updateSettings, notify } = useBooth();
  const is4R = settings.layout === 'custom4r';
  const background = is4R ? sanitizeBackground({ ...settings.customLayout.backgroundOptions, dataUrl: settings.customLayout.backgroundDataUrl }) : settings.stripBackground;
  const input = useRef<HTMLInputElement>(null), request = useRef(0), latest = useRef(settings);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  latest.current = settings;
  useEffect(() => { setLoading(false); setError(''); return () => { request.current++; }; }, [is4R]);
  const change = (patch: Partial<PrintBackground>) => {
    const current = latest.current;
    if (is4R) {
      const next = sanitizeBackground({ ...current.customLayout.backgroundOptions, dataUrl: current.customLayout.backgroundDataUrl, ...patch });
      updateSettings({ customLayout: { ...current.customLayout, backgroundDataUrl: next.dataUrl, backgroundOptions: backgroundOptions(next) } });
    } else updateSettings({ stripBackground: { ...current.stripBackground, ...patch } });
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const id = ++request.current; setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 40 * 1024 * 1024) {
      setLoading(false); setError('Choose a JPG, PNG, or WebP image smaller than 40 MB.'); return;
    }
    setLoading(true);
    try {
      const img = await Compose.loadPhoto(file);
      try {
        if (id !== request.current) return;
        const w = 'naturalWidth' in img ? img.naturalWidth : img.width, h = 'naturalHeight' in img ? img.naturalHeight : img.height;
        if (!w || !h) throw new Error('Empty image');
        const scale = Math.min(1, 3200 / Math.max(w, h)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        // WebP preserves transparent areas and keeps local preferences compact; PNG is the browser fallback.
        notify('Background added. Your photos will appear above the design.');
        change({ dataUrl: cv.toDataURL('image/webp', .94), x: 0, y: 0 });
      } finally { if ('close' in img) img.close(); }
    } catch { if (id === request.current) setError('Could not open that image. Try another JPG, PNG, or WebP.'); }
    finally { if (id === request.current) setLoading(false); }
  };
  return <div className="background-controls">
    <h3>Your own background</h3>
    <p className="control-hint">Upload your event artwork or brand design. It sits behind the photos.</p>
    <div className="background-upload-row">
      {background.dataUrl && <img className="background-thumbnail" src={background.dataUrl} alt="Your uploaded background design" />}
      <div className="background-upload-actions">
        <button className="btn btn-secondary small" disabled={loading} onClick={() => input.current?.click()}><Icon name="upload" size={16} />{loading ? 'Opening background…' : background.dataUrl ? 'Replace background' : 'Upload background'}</button>
        {background.dataUrl && <button className="text-button danger" onClick={() => { request.current++; setLoading(false); setError(''); change({ dataUrl: null }); }}>Remove background</button>}
        <small>JPG, PNG, or WebP · up to 40 MB</small>
      </div>
    </div>
    <input ref={input} className="visually-hidden" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp" data-testid={is4R ? 'event-background' : 'strip-background'} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    {error && <p role="alert" className="background-error">{error}</p>}
    {background.dataUrl && <>
      <label className="field"><span>Background fit</span><select aria-label="Background fit" value={background.fit} onChange={e => change({ fit: e.target.value as PrintBackground['fit'] })}>
        <option value="cover">Fill frame · crop edges</option><option value="contain">Fit entire design</option><option value="stretch">Stretch to frame</option>
      </select><small>Fit keeps the whole design visible. Frame color fills any uncovered area.</small></label>
      {background.fit !== 'stretch' && <div className="range-controls background-position">{[['x', 'Horizontal'], ['y', 'Vertical']].map(([key, label]) => <label key={key}><span>{label} position</span><input type="range" aria-label={'Background ' + label.toLowerCase() + ' position'} min="-1" max="1" step="0.05" value={background[key as 'x' | 'y']} onChange={e => change({ [key]: Number(e.target.value) })} /></label>)}<button className="text-button" onClick={() => change({ x: 0, y: 0 })}>Center background</button></div>}
    </>}
    <label className="toggle-row"><span>Show frame text</span><input type="checkbox" checked={background.showText} onChange={e => change({ showText: e.target.checked })} /><span className="switch" aria-hidden="true" /></label>
    <p className="control-hint background-text-hint">Turn off to remove titles, captions, branding, dates, and printed photo numbers.</p>
  </div>;
}
