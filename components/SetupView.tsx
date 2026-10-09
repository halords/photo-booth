'use client';

import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
import { FieldLabel, Segmented } from './pickers';
import type { LayoutId } from '@/lib/types';

const LAYOUT_META: { id: LayoutId; name: string; sub: string; diagram: string }[] = [
  { id: 'strip4', name: 'Strip ×4', sub: 'The classic', diagram: 'd-strip4' },
  { id: 'strip3', name: 'Strip ×3', sub: 'Short & sweet', diagram: 'd-strip3' },
  { id: 'grid', name: 'Grid 2×2', sub: 'Four square', diagram: 'd-grid' },
  { id: 'single', name: 'Single', sub: 'One portrait', diagram: 'd-single' },
];

function Diagram({ kind }: { kind: string }) {
  const cells = kind === 'd-grid' ? 4 : kind === 'd-single' ? 1 : kind === 'd-strip3' ? 3 : 4;
  return (
    <span className={`diagram ${kind}`} aria-hidden="true">
      {Array.from({ length: cells }).map((_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

export default function SetupView() {
  const { settings, updateSettings, go, startSession } = useBooth();

  return (
    <section className="view">
      <p className="kicker">01 — Setup</p>
      <h2>Set up the session</h2>

      <label className="field">
        Event name
        <input
          type="text"
          maxLength={48}
          placeholder="Maya's birthday"
          autoComplete="off"
          value={settings.eventName}
          onChange={(e) => updateSettings({ eventName: e.target.value })}
        />
      </label>

      <FieldLabel>Layout</FieldLabel>
      <div className="layout-grid" role="radiogroup" aria-label="Layout">
        {LAYOUT_META.map((l) => (
          <button
            key={l.id}
            type="button"
            className="layout-opt"
            role="radio"
            aria-checked={settings.layout === l.id}
            onClick={() => updateSettings({ layout: l.id })}
          >
            <Diagram kind={l.diagram} />
            <span className="opt-name">{l.name}</span>
            <span className="opt-sub">{l.sub}</span>
          </button>
        ))}
      </div>

      <FieldLabel>Capture mode</FieldLabel>
      <Segmented
        label="Capture mode"
        value={settings.mode}
        onChange={(mode) => updateSettings({ mode })}
        options={[
          { value: 'native', label: 'Native app' },
          { value: 'pro', label: 'Pro camera' },
        ]}
      />
      <p className="hint tight">
        Native opens your iPhone&apos;s Camera app per shot. Pro is an in-app
        viewfinder with auto-fire countdown.
      </p>

      <FieldLabel>Lens</FieldLabel>
      <Segmented
        label="Lens"
        value={settings.camera}
        onChange={(camera) => updateSettings({ camera })}
        options={[
          { value: 'user', label: 'Front' },
          { value: 'environment', label: 'Rear' },
        ]}
      />

      <FieldLabel>
        Countdown <span className="opt-tag">pro camera</span>
      </FieldLabel>
      <Segmented
        label="Countdown"
        value={settings.countdown}
        onChange={(countdown) => updateSettings({ countdown })}
        options={[
          { value: 0, label: 'Off' },
          { value: 3, label: '3s' },
          { value: 5, label: '5s' },
          { value: 10, label: '10s' },
        ]}
      />

      <FieldLabel>Strip template</FieldLabel>
      <div className="template-grid" role="radiogroup" aria-label="Strip template">
        {(Object.keys(Compose.TEMPLATES) as (keyof typeof Compose.TEMPLATES)[]).map(
          (id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.template === id}
              className={`template-opt${settings.template === id ? ' selected' : ''}`}
              onClick={() => updateSettings({ template: id })}
            >
              <span className={`swatch sw-${id}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="opt-name">{Compose.TEMPLATES[id].name}</span>
              <span className="opt-sub">{Compose.TEMPLATES[id].sub}</span>
            </button>
          )
        )}
      </div>

      <FieldLabel>Filter</FieldLabel>
      <Segmented
        label="Filter"
        value={settings.filter}
        onChange={(filter) => updateSettings({ filter })}
        options={[
          { value: 'natural', label: 'Natural' },
          { value: 'noir', label: 'Noir' },
          { value: 'sepia', label: 'Sepia' },
          { value: 'warm', label: 'Warm' },
        ]}
      />

      <label className="field">
        Caption <span className="opt-tag">optional</span>
        <input
          type="text"
          maxLength={60}
          placeholder="Best night ever"
          autoComplete="off"
          value={settings.caption}
          onChange={(e) => updateSettings({ caption: e.target.value })}
        />
      </label>

      <button className="btn btn-primary" onClick={startSession} type="button">
        Start session
      </button>
      <button className="btn btn-ghost" onClick={() => go('home')} type="button">
        Back
      </button>
    </section>
  );
}
