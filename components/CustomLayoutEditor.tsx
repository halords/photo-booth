'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
import { constrainSlot, create4RLayout, sanitize4R } from '@/lib/layouts';
import type { PhotoPlaceholder } from '@/lib/types';
import { isSeasonal } from '@/lib/seasonal';
import Icon from './Icon';
import BackgroundControls from './BackgroundControls';

export default function CustomLayoutEditor({ allowStructure = true }: { allowStructure?: boolean }) {
  const { settings, shots, updateSettings, notify } = useBooth(), layout = settings.customLayout;
  const [selected, setSelected] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null), layoutInput = useRef<HTMLInputElement>(null);
  const latest = useRef(layout); latest.current = layout;
  const slot = layout.slots[Math.min(selected, layout.slots.length - 1)];
  const drag = useRef<{ id: number; x: number; y: number; slot: PhotoPlaceholder; index: number; resize: boolean; bounds: DOMRect } | null>(null);
  const change = (patch: Partial<typeof layout>) => updateSettings({ customLayout: { ...latest.current, ...patch } });
  const editSlot = (index: number, patch: Partial<PhotoPlaceholder>) => {
    const current = latest.current;
    change({ slots: current.slots.map((s, i) => i === index ? constrainSlot({ ...s, ...patch }, current.orientation) : s) });
  };
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { void Compose.render({ layout: 'custom4r', customLayout: layout, photos: allowStructure ? [] : shots.map(s => s!.img),
      edits: allowStructure ? [] : shots.map(s => s?.edit), template: settings.template, eventName: settings.eventName, caption: settings.caption, filter: settings.filter,
      frameColor: settings.frameColor, showDate: settings.showDate, stripNo: 1, width: 480,
    }).then(rendered => { if (!cancelled && canvas.current) { canvas.current.width = rendered.width; canvas.current.height = rendered.height; canvas.current.getContext('2d')!.drawImage(rendered, 0, 0); } }).catch(e => { if (!cancelled) notify(e.message); }); }, 45);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [layout, shots, settings.template, settings.eventName, settings.caption, settings.filter, settings.frameColor, settings.showDate, notify, allowStructure]);
  const count = layout.slots.length;
  const exportLayout = () => {
    const blob = new Blob([JSON.stringify({ version: 1, type: 'pocket-4r', layout, eventName: settings.eventName, caption: settings.caption, frameColor: settings.frameColor, showDate: settings.showDate, template: settings.template }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'pocket-event-layout.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); notify('Event layout downloaded. Load it again for another occasion.');
  };
  const importLayout = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error();
      const data = JSON.parse(await file.text());
      if (data.type !== 'pocket-4r' || data.version !== 1 || !Array.isArray(data.layout?.slots) || !data.layout.slots.length) throw new Error();
      updateSettings({ customLayout: sanitize4R(data.layout), eventName: typeof data.eventName === 'string' ? data.eventName.slice(0, 48) : '', caption: typeof data.caption === 'string' ? data.caption.slice(0, 60) : '',
        frameColor: /^#[0-9a-f]{6}$/i.test(data.frameColor) ? data.frameColor : '', showDate: data.showDate !== false, template: Object.hasOwn(Compose.TEMPLATES, data.template) ? data.template : 'polaroid-white' });
      setSelected(0); notify('Event layout loaded. Ready for new memories.');
    } catch { notify('Choose a valid Pocket event layout JSON file.'); }
  };
  return <div className="custom-layout-editor">
    <div className="custom-layout-heading"><div><h3>Design your 4R keepsake</h3><p className="control-hint">4 × 6 inches · 300 DPI · {count} photo{count > 1 ? 's' : ''}</p></div><span className="pill subtle">Event ready</span></div>
    <div className="custom-layout-options"><label className="field"><span>Print orientation</span><select aria-label="4R orientation" value={layout.orientation} onChange={e => {
      const preset = create4RLayout(e.target.value as 'portrait' | 'landscape', count, layout.decoration);
      change({ ...preset, backgroundDataUrl: layout.backgroundDataUrl, backgroundOptions: layout.backgroundOptions });
    }}><option value="portrait">Portrait · 4 × 6 in</option><option value="landscape">Landscape · 6 × 4 in</option></select></label>
    <label className="field"><span>Occasion style</span><select aria-label="Occasion style" value={layout.decoration} onChange={e => {
      const decoration = e.target.value as typeof layout.decoration;
      updateSettings({ customLayout: { ...latest.current, decoration }, frameColor: '',
        template: isSeasonal(decoration) ? decoration : isSeasonal(settings.template) ? 'polaroid-white' : settings.template });
    }}><option value="birthday">Birthday confetti</option><option value="celebration">Celebration</option><option value="minimal">Minimal</option><option value="halloween">PGLU Halloween Special</option><option value="christmas">Christmas</option></select></label></div>
    {layout.backgroundDataUrl && <p className="control-hint">Your uploaded artwork replaces the occasion background. Remove it to see the theme decorations.</p>}
    <div className="layout-designer-stage" ref={stage} style={{ aspectRatio: layout.orientation === 'portrait' ? '2 / 3' : '3 / 2' }}>
      <canvas ref={canvas} aria-label="4R event layout preview" />
      <div className="placeholder-layer">{layout.slots.map((s, i) => <div role="button" tabIndex={0} key={s.id} aria-label={'Photo placeholder ' + (i + 1) + '. Drag to move or use arrow keys.'} aria-pressed={selected === i}
        className={'photo-placeholder ' + (selected === i ? 'selected' : '')} style={{ left: s.x + '%', top: s.y + '%', width: s.width + '%', height: s.height + '%', transform: `rotate(${s.rotation}deg)` }}
        onFocus={() => setSelected(i)} onKeyDown={e => { const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; if (moves[e.key]) { e.preventDefault(); const [x, y] = moves[e.key], step = e.shiftKey ? 5 : 1; editSlot(i, { x: s.x + x * step, y: s.y + y * step }); } }}
        onPointerDown={e => { if (e.button !== 0 || !stage.current) return; e.preventDefault(); e.currentTarget.focus(); setSelected(i); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, slot: s, index: i, resize: (e.target as HTMLElement).dataset.resize === 'true', bounds: stage.current.getBoundingClientRect() }; }}
        onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId || d.index !== i) return;
          const dx = (e.clientX - d.x) / d.bounds.width * 100, dy = (e.clientY - d.y) / d.bounds.height * 100;
          if (d.resize) {
            const angle = d.slot.rotation * Math.PI / 180, px = e.clientX - d.x, py = e.clientY - d.y;
            editSlot(i, { width: d.slot.width + (px * Math.cos(angle) + py * Math.sin(angle)) / d.bounds.width * 100, height: d.slot.height + (-px * Math.sin(angle) + py * Math.cos(angle)) / d.bounds.height * 100 });
          }
          else editSlot(i, { x: d.slot.x + dx, y: d.slot.y + dy });
        }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <span className="placeholder-badge">{String(i + 1).padStart(2, '0')}</span><span className="placeholder-resize" data-resize="true" title="Drag to resize" />
      </div>)}</div>
    </div>
    <p className="designer-tip"><Icon name="image" size={14} />Drag frames to move. Drag a corner to resize. Capture fills 01, 02, 03…</p>
    <div className="placeholder-toolbar"><label className="field"><span>Edit placeholder</span><select aria-label="Selected placeholder" value={Math.min(selected, count - 1)} onChange={e => setSelected(Number(e.target.value))}>{layout.slots.map((s, i) => <option key={s.id} value={i}>Photo {i + 1}</option>)}</select></label>
      {allowStructure && <div className="button-row"><button className="btn btn-secondary small" disabled={count >= 6} onClick={() => { change({ slots: [...layout.slots, { id: crypto.randomUUID(), x: 15, y: 30, width: 60, height: 25, rotation: 0 }] }); setSelected(count); }}>+ Add frame</button><button className="icon-button" aria-label="Remove selected placeholder" disabled={count <= 1} onClick={() => { change({ slots: layout.slots.filter((_, i) => i !== selected) }); setSelected(Math.max(0, selected - 1)); }}><Icon name="trash" size={17} /></button></div>}
    </div>
    <div className="placeholder-fields">{[['x', 'Left', 0, 98], ['y', 'Top', 0, 98], ['width', 'Width', 12, 96], ['height', 'Height', 10, 96], ['rotation', 'Angle', -45, 45]].map(([key, label, min, max]) => <label key={key}><span>{label} <small>{key === 'rotation' ? '°' : '%'}</small></span><input aria-label={'Placeholder ' + label} type="number" min={min} max={max} step="1" value={Math.round(slot[key as keyof PhotoPlaceholder] as number)} onChange={e => editSlot(Math.min(selected, count - 1), { [key]: Number(e.target.value) })} /></label>)}</div>
    <div className="designer-actions"><button className="text-button" onClick={() => change({ slots: create4RLayout(layout.orientation, count).slots })}><Icon name="refresh" size={15} /> Reset arrangement</button></div>
    <BackgroundControls />
    <div className="designer-actions"><button className="text-button" onClick={exportLayout}><Icon name="download" size={15} />Save layout file</button>{allowStructure && <button className="text-button" onClick={() => layoutInput.current?.click()}><Icon name="upload" size={15} />Load layout file</button>}</div>
    <input ref={layoutInput} data-testid="layout-upload" className="visually-hidden" tabIndex={-1} type="file" accept="application/json,.json" onChange={e => { void importLayout(e.target.files?.[0]); e.target.value = ''; }} />
    <p className="control-hint">Add an event name and message in Personal touches. Overlapping frames layer in capture order.</p>
  </div>;
}
