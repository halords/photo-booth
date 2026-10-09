'use client';

import { useEffect, useRef } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
import { FieldLabel, Segmented } from './pickers';

export default function ReviewView() {
  const { settings, updateSettings, getStripCanvas, finalize, go } = useBooth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = getStripCanvas();
    const holder = canvasRef.current;
    if (!holder) return;
    holder.width = cv.width;
    holder.height = cv.height;
    holder.getContext('2d')!.drawImage(cv, 0, 0);
  });

  return (
    <section className="view">
      <p className="kicker">03 — Compose</p>
      <h2>Review the strip</h2>
      <div className="preview-frame">
        <canvas ref={canvasRef} />
      </div>

      <FieldLabel>Template</FieldLabel>
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
        Caption
        <input
          type="text"
          maxLength={60}
          autoComplete="off"
          value={settings.caption}
          onChange={(e) => updateSettings({ caption: e.target.value })}
        />
      </label>

      <div className="row">
        <button className="btn btn-primary" type="button" onClick={() => void finalize()}>
          Save strip
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => go('capture')}>
          Retake shots
        </button>
      </div>
    </section>
  );
}
