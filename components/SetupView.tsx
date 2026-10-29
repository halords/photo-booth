'use client';
import { useState } from 'react';
import { useBooth } from '@/lib/booth';
import { LAYOUTS } from '@/lib/compose';
import { isStrip, requiredPhotos } from '@/lib/session-settings';
import type { LayoutId } from '@/lib/types';
import { Segmented } from './pickers';
import { TemplatePicker, FilterPicker, CaptionControls } from './StyleControls';
import Icon from './Icon';
import Steps from './Steps';
import CustomLayoutEditor from './CustomLayoutEditor';
import SetupPrintPreview from './SetupPrintPreview';
import BackgroundControls from './BackgroundControls';

export const LAYOUT_OPTIONS: { id: LayoutId; name: string; detail: string }[] = [
  { id: 'strip4', name: 'Classic strip', detail: '4 photos' }, { id: 'strip3', name: 'The trio', detail: '3 photos' },
  { id: 'grid2x2', name: 'Four square', detail: '2 × 2 grid' }, { id: 'single', name: 'Solo portrait', detail: '1 photo' },
  { id: 'strip2', name: 'Double take', detail: '2 photos' }, { id: 'strip6', name: 'Six moments', detail: '6 photos' },
  { id: 'grid3x3', name: 'The whole crew', detail: '3 × 3 grid' }, { id: 'collage', name: 'Contact sheet', detail: '4 close frames' },
  { id: 'custom4r', name: 'Custom 4R', detail: '4 × 6 in · editable' },
];
export default function SetupView() {
  const { settings, updateSettings, startSession, go, cameras, selectedCamera, selectCamera, busy, useDemo } = useBooth();
  const [tab, setTab] = useState('layout');
  return <section className="page workflow-page"><Steps current={0} /><div className="page-intro"><div><span className="eyebrow">FIRST, SET THE SCENE</span><h1>A booth that feels <em>like you.</em></h1><p>Pick a layout and a look. You can fine-tune everything after the photos.</p></div></div>
    <div className="workspace-grid"><div className="settings-panel panel">
      <div className="tab-nav" role="tablist" aria-label="Session setup">{[['layout', 'Layout & camera'], ['style', 'Frame & filter'], ['details', 'Personal touches']].map(([id, label]) => <button role="tab" id={'setup-tab-' + id} aria-controls={'setup-panel-' + id} aria-selected={tab === id} className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className="settings-content" role="tabpanel" id={'setup-panel-' + tab} aria-labelledby={'setup-tab-' + tab}>
      {tab === 'layout' && <><div className="control-section"><h3>How many moments?</h3><p className="control-hint">There's a little room for every kind of memory.</p><div className="layout-picker">{LAYOUT_OPTIONS.map(l => <button aria-pressed={settings.layout === l.id} key={l.id} className={'layout-choice ' + (settings.layout === l.id ? 'selected' : '')} onClick={() => updateSettings({ layout: l.id })}><span className="layout-diagram" style={{ gridTemplateColumns: 'repeat(' + LAYOUTS[l.id].cols + ', 1fr)' }}>{Array.from({ length: LAYOUTS[l.id].shots }, (_, i) => <i key={i} />)}</span><strong>{l.name}</strong><small>{l.detail}</small>{settings.layout === l.id && <span className="choice-check"><Icon name="check" size={12} /></span>}</button>)}</div></div>
        {isStrip(settings.layout) && <div className="control-section"><h3>Strip copies</h3><Segmented label="Strip copies" value={settings.stripMode} onChange={value => updateSettings({ stripMode: value as 'single' | 'same' | 'different' })} options={[{ value: 'single', label: 'One strip' }, { value: 'same', label: 'Two · same photos' }, { value: 'different', label: 'Two · different photos' }]} /><p className="control-hint">{settings.stripMode === 'single' ? 'One sequence of photos on a single strip.' : settings.stripMode === 'same' ? 'Two matching 2 × 6 inch strips on one 4 × 6 inch sheet. Keep one, give one.' : 'Two unique 2 × 6 inch strips on one 4 × 6 inch sheet. Capture ' + requiredPhotos(settings) + ' photos: the first half for strip A, the second half for strip B.'}</p></div>}
        <div className="control-section"><h3>Print quality</h3><Segmented label="Print resolution" value={settings.printDPI} onChange={value => updateSettings({ printDPI: Number(value) as 300 | 600 })} options={[{ value: 300, label: '300 DPI · standard print' }, { value: 600, label: '600 DPI · fine print' }]} /><p className="control-hint">Original photos keep their camera resolution. Higher DPI gives the layout more detail when your photos support it.</p></div>
        {settings.layout === 'custom4r' && <CustomLayoutEditor />}
        <div className="control-section"><h3>Bring your photos to life</h3><div className="source-picker">{[['pro', 'camera', 'Live camera', 'A countdown and a few poses.'], ['upload', 'upload', 'Upload photos', 'Use your camera roll favorites.'], ['native', 'image', 'Phone camera', 'Take each photo in your camera app.']].map(([id, icon, name, detail]) => <button key={id} aria-pressed={settings.mode === id} className={'source-choice ' + (settings.mode === id ? 'selected' : '')} onClick={() => updateSettings({ mode: id as 'pro' | 'native' | 'upload' })}><Icon name={icon} size={22} /><span><strong>{name}</strong><small>{detail}</small></span><span className="radio-mark" /></button>)}</div></div>
        {settings.mode === 'pro' && <div className="camera-settings">
          {cameras.length > 0 && <label className="field"><span>Camera</span><select value={selectedCamera?.id || ''} onChange={e => selectCamera(cameras.find(c => c.id === e.target.value) || null)}><option value="">Auto · front camera</option>{cameras.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><small>USB cameras use their best browser-supported resolution. For full DSLR stills, upload the original camera files.</small></label>}
          <div className="control-section compact"><h3>Time to strike a pose</h3><Segmented label="Countdown timer" value={settings.countdown} onChange={v => updateSettings({ countdown: Number(v) })} options={[{ value: 0, label: 'No timer' }, { value: 3, label: '3 sec' }, { value: 5, label: '5 sec' }, { value: 10, label: '10 sec' }]} /></div>
          <div className="toggle-grid">{[['mirrorMode', 'Mirror selfies'], ['soundEnabled', 'Shutter sounds'], ['flashEnabled', 'Screen flash'], ['showGrid', 'Framing guide']].map(([key, label]) => <label className="toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(settings[key as keyof typeof settings])} onChange={e => updateSettings({ [key]: e.target.checked })} /><span className="switch" aria-hidden="true" /></label>)}</div>
        </div>}
      </>}
      {tab === 'style' && <><div className="control-section"><h3>A frame for your memories</h3><p className="control-hint">Everyday favorites, PGLU Halloween Special, and Christmas cheer.</p><TemplatePicker /></div><BackgroundControls /><div className="control-section"><h3>Set the mood</h3><p className="control-hint">Your photos stay original. The look is yours to change.</p><FilterPicker /></div></>}
      {tab === 'details' && <><div className="control-section"><h3>Make it a little more personal</h3><p className="control-hint">A name, a note, a color. The details make it yours.</p><CaptionControls /></div><div className="info-note"><Icon name="shield" /><p>Your session is kept in this browser cache. A sharing link uploads a temporary copy for up to 24 hours; no photo database is used.</p></div></>}
      </div>
    </div><aside className="setup-preview panel"><div className="panel-heading"><span className="eyebrow">YOUR KEEPSAKE</span><span className="pill subtle">Preview</span></div><div className="preview-stage"><SetupPrintPreview /></div><div className="preview-summary"><strong>{LAYOUT_OPTIONS.find(l => l.id === settings.layout)?.name}</strong><span>{requiredPhotos(settings)} photos · {settings.mode === 'upload' ? 'Your own photos' : settings.countdown + 's timer'}{' · ' + settings.printDPI + ' DPI'}</span></div><button className="btn btn-primary full-width" disabled={busy} onClick={startSession}><Icon name={settings.mode === 'upload' ? 'upload' : 'camera'} size={19} />{settings.mode === 'upload' ? 'Choose my photos' : 'Enter the booth'}<Icon name="arrow" size={18} /></button><button className="text-button demo-button" disabled={busy} onClick={() => void useDemo()}>Just exploring? Try sample photos</button></aside></div>
    <button className="text-button back-link" onClick={() => go('home')}><Icon name="back" size={16} /> Back to your studio</button>
  </section>;
}
