'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { TemplatePicker, FilterPicker, CaptionControls } from './StyleControls';
import ShotImage from './ShotImage';
import Icon from './Icon';
import Steps from './Steps';
import CustomLayoutEditor from './CustomLayoutEditor';
import BackgroundControls from './BackgroundControls';

export default function ReviewView() {
  const { settings, shots, busy, go, getStripCanvas, finalize, editShot, moveShot, importPhotos } = useBooth();
  const canvas = useRef<HTMLCanvasElement>(null), input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('frame'), [selected, setSelected] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const current = shots[selected], edit = current?.edit || { zoom: 1, x: 0, y: 0, rotation: 0, mirror: false };
  useEffect(() => {
    let cancelled = false; setLoading(true);
    const timer = setTimeout(() => { void getStripCanvas(true).then(rendered => {
      if (cancelled || !canvas.current) return;
      canvas.current.width = rendered.width; canvas.current.height = rendered.height; canvas.current.getContext('2d')!.drawImage(rendered, 0, 0);
      setError(''); setLoading(false);
    }).catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } }); }, 70);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [settings, shots, getStripCanvas]);
  const choose = () => { if (input.current) { input.current.value = ''; input.current.click(); } };
  return <section className="page workflow-page"><Steps current={2} /><div className="page-intro"><div><span className="eyebrow">THE FINISHING TOUCHES</span><h1>A little edit. <em>A lot of personality.</em></h1><p>Your moments are captured. Now give them a look you love.</p></div><span className="pill subtle"><Icon name="check" size={14} /> All photos ready</span></div>
    <div className="workspace-grid review-workspace"><div className="editor-panel panel"><div className="tab-nav" role="tablist" aria-label="Photo editing">{[['frame', 'Frame'], ['filter', 'Filter'], ['photos', 'Photos'], ['details', 'Details']].map(([id, label]) => <button key={id} role="tab" id={'edit-tab-' + id} aria-controls={'edit-panel-' + id} aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className="settings-content" role="tabpanel" id={'edit-panel-' + tab} aria-labelledby={'edit-tab-' + tab}>
        {tab === 'frame' && <>{settings.layout === 'custom4r' ? <CustomLayoutEditor allowStructure={false} /> : <><div className="control-section"><h3>Frame your favorite moments.</h3><p className="control-hint">Try a few. You'll know when it feels right.</p><TemplatePicker /></div><BackgroundControls /></>}<CaptionControls /></>}
        {tab === 'filter' && <div className="control-section"><h3>Find your kind of light.</h3><p className="control-hint">One look across your strip. Originals stay untouched.</p><FilterPicker /></div>}
        {tab === 'details' && <div className="control-section"><h3>A few words to remember it by.</h3><CaptionControls /></div>}
        {tab === 'photos' && <div className="control-section"><h3>Every frame, just right.</h3><p className="control-hint">Choose a photo to crop or rotate. Use the arrows to change its place.</p><div className="edit-photos">{shots.map((shot, i) => <button key={i} className={i === selected ? 'selected' : ''} aria-pressed={i === selected} aria-label={'Edit photo ' + (i + 1)} onClick={() => setSelected(i)}>{shot && <ShotImage file={shot.file} />}<span>{i + 1}</span></button>)}</div>
          <div className="photo-edit-toolbar"><button className="btn btn-secondary small" disabled={selected === 0} onClick={() => { moveShot(selected, -1); setSelected(selected - 1); }} aria-label="Move photo earlier"><Icon name="back" size={16} /></button><button className="btn btn-secondary small" disabled={selected === shots.length - 1} onClick={() => { moveShot(selected, 1); setSelected(selected + 1); }} aria-label="Move photo later"><Icon name="arrow" size={16} /></button>
            <button className="btn btn-secondary small" onClick={() => editShot(selected, { rotation: (edit.rotation + 90) % 360 })}><Icon name="refresh" size={16} />Rotate</button><button className="btn btn-secondary small" aria-pressed={edit.mirror} onClick={() => editShot(selected, { mirror: !edit.mirror })}><Icon name="mirror" size={16} />Flip</button></div>
          <div className="range-controls">{[['zoom', 'Zoom', 1, 2.5, 0.05], ['x', 'Horizontal position', -1, 1, 0.05], ['y', 'Vertical position', -1, 1, 0.05]].map(([key, label, min, max, step]) => <label key={key}><span>{label}<small>{key === 'zoom' ? edit.zoom.toFixed(2) + '×' : ''}</small></span><input type="range" min={min} max={max} step={step} value={edit[key as 'zoom' | 'x' | 'y']} onChange={e => editShot(selected, { [key]: Number(e.target.value) })} /></label>)}</div>
          <div className="button-row"><button className="text-button" onClick={() => editShot(selected, { zoom: 1, x: 0, y: 0, rotation: 0, mirror: false })}>Reset crop</button><button className="text-button" disabled={busy} onClick={choose}><Icon name="upload" size={16} /> Replace photo</button></div>
        </div>}
      </div></div>
      <aside className="review-preview panel"><div className="panel-heading"><span className="eyebrow">LIVE PREVIEW</span><span className="pill subtle">{loading ? 'Updating…' : 'Looking good'}</span></div><div className="preview-stage"><canvas ref={canvas} aria-label="Preview of your edited photo strip" className={loading ? 'updating' : ''} />{error && <p role="alert">{error}</p>}</div><p className="preview-footnote">High-resolution export. Made to keep.</p><button className="btn btn-primary full-width" disabled={loading || !!error || busy} onClick={() => void finalize()}><Icon name="check" size={18} />{busy ? 'Saving your memory…' : 'Save my photo strip'}<Icon name="arrow" size={17} /></button></aside>
    </div><button className="text-button back-link" disabled={busy} onClick={() => go('capture')}><Icon name="back" size={16} /> Back to your photos</button>
    <input data-testid="replace-photo" ref={input} className="visually-hidden" tabIndex={-1} type="file" accept="image/*,.heic,.heif" onChange={e => { void importPhotos(Array.from(e.target.files || []), selected); e.target.value = ''; }} />
  </section>;
}
