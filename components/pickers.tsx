'use client';
import type { ReactNode } from 'react';
export function FieldLabel({ children }: { children: ReactNode }) { return <div className="field-label">{children}</div>; }
export function Segmented({ label, value, onChange, options }: { label?: string; value: string | number; onChange: (value: string | number) => void; options: { value: string | number; label: string }[] }) {
  return <div className="segmented" role="group" aria-label={label}>{options.map(opt => <button type="button" key={String(opt.value)} className={value === opt.value ? 'selected' : ''} aria-pressed={value === opt.value} onClick={() => onChange(opt.value)}>{opt.label}</button>)}</div>;
}
