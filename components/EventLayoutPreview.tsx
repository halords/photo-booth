'use client';
import { useEffect, useRef } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';
export default function EventLayoutPreview() {
  const { settings } = useBooth(), canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void Compose.render({ layout: 'custom4r', customLayout: settings.customLayout, photos: [], template: settings.template,
      eventName: settings.eventName, caption: settings.caption, filter: settings.filter, frameColor: settings.frameColor, showDate: settings.showDate, stripNo: 1, width: 480,
    }).then(rendered => { if (!cancelled && canvas.current) { canvas.current.width = rendered.width; canvas.current.height = rendered.height; canvas.current.getContext('2d')!.drawImage(rendered, 0, 0); } }).catch(() => {});
    return () => { cancelled = true; };
  }, [settings]);
  return <canvas ref={canvas} aria-label="Preview of your custom 4R print" />;
}
