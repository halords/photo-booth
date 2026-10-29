'use client';
import { useBooth } from '@/lib/booth';
import { TEMPLATES } from '@/lib/compose';
import type { FilterId, TemplateId } from '@/lib/types';
import { isSeasonal } from '@/lib/seasonal';
import TemplateSwatch from './TemplateSwatch';

export const FILTER_OPTIONS: { id: FilterId; name: string; css: string }[] = [
  { id: 'natural', name: 'Original', css: 'none' }, { id: 'warm', name: 'Golden', css: 'sepia(.25) saturate(1.15)' },
  { id: 'noir', name: 'B&W', css: 'grayscale(1) contrast(1.14)' }, { id: 'vintage-film', name: 'Vintage', css: 'sepia(.35) saturate(.8)' },
  { id: 'fade', name: 'Soft', css: 'contrast(.8) brightness(1.1)' }, { id: 'vivid', name: 'Vivid', css: 'saturate(1.4) contrast(1.2)' },
  { id: 'cool', name: 'Cool', css: 'saturate(.85) hue-rotate(15deg)' }, { id: 'sepia', name: 'Sepia', css: 'sepia(1)' },
  { id: 'dramatic', name: 'Drama', css: 'contrast(1.4)' }, { id: 'crossprocess', name: 'Cross', css: 'hue-rotate(20deg) saturate(1.2)' },
  { id: 'teal-orange', name: 'Cinema', css: 'saturate(1.2) sepia(.2)' },
];
export function TemplatePicker() {
  const { settings, updateSettings } = useBooth();
  return <div className="template-picker">{(Object.entries(TEMPLATES) as [TemplateId, typeof TEMPLATES[TemplateId]][]).map(([id, t]) =>
    <button key={id} title={t.sub} className={'template-choice ' + (settings.template === id ? 'selected' : '')} aria-pressed={settings.template === id} onClick={() => updateSettings({ template: id, frameColor: '',
      customLayout: { ...settings.customLayout, decoration: isSeasonal(id) ? id : isSeasonal(settings.customLayout.decoration) ? 'minimal' : settings.customLayout.decoration },
    })}>
      <TemplateSwatch template={id} /><span>{t.name}</span>
    </button>)}</div>;
}
export function FilterPicker() {
  const { settings, updateSettings } = useBooth();
  return <div className="filter-picker">{FILTER_OPTIONS.map(f =>
    <button className={'filter-choice ' + (settings.filter === f.id ? 'selected' : '')} key={f.id} aria-pressed={settings.filter === f.id} onClick={() => updateSettings({ filter: f.id })}>
      <img src="/photos/portrait-1.jpg" alt="" loading="lazy" style={{ filter: f.css }} /><span>{f.name}</span>
    </button>)}</div>;
}
export function CaptionControls() {
  const { settings, updateSettings } = useBooth();
  return <div className="caption-controls">
    <label className="field"><span>Session name <small>Optional</small></span><input maxLength={48} value={settings.eventName} placeholder="Saturday with my people" onChange={e => updateSettings({ eventName: e.target.value })} /></label>
    <label className="field"><span>Write a little something <small>{settings.caption.length}/60</small></span><input maxLength={60} value={settings.caption} placeholder="a little moment, forever." onChange={e => updateSettings({ caption: e.target.value })} /></label>
    <div className="color-field"><span>Frame color</span><div className="color-options">{['', '#ffffff', '#f1e2cd', '#e7b4a9', '#b7c3b0', '#292722'].map((color, i) =>
      <button key={i} aria-label={color ? 'Frame color ' + color : 'Template default color'} title={color || 'Template default'} aria-pressed={settings.frameColor === color} className={settings.frameColor === color ? 'selected' : ''} style={{ background: color || TEMPLATES[settings.template].color }} onClick={() => updateSettings({ frameColor: color })}>{!color && <span>A</span>}</button>)}
      <label className="custom-color" title="Custom color"><input aria-label="Custom frame color" type="color" value={settings.frameColor || TEMPLATES[settings.template].color} onChange={e => updateSettings({ frameColor: e.target.value })} /></label>
    </div></div>
    <label className="toggle-row"><span>Include the date</span><input type="checkbox" checked={settings.showDate} onChange={e => updateSettings({ showDate: e.target.checked })} /><span className="switch" aria-hidden="true" /></label>
  </div>;
}
