import { LAYOUTS } from './compose';
import type { Settings, LayoutId, StripMode } from './types';

export const isStrip = (layout: LayoutId) => /^strip[2346]$/.test(layout);
export const isSplit = (layout: LayoutId, mode?: StripMode) => isStrip(layout) && (mode === 'same' || mode === 'different');
export function requiredPhotos(s: Pick<Settings, 'layout' | 'customLayout' | 'stripMode'>) {
  const count = s.layout === 'custom4r' ? s.customLayout.slots.length : LAYOUTS[s.layout].shots;
  return count * (isStrip(s.layout) && s.stripMode === 'different' ? 2 : 1);
}
export function printWidth(s: Settings) {
  const width = s.layout === 'custom4r' ? (s.customLayout.orientation === 'portrait' ? 1200 : 1800)
    : isSplit(s.layout, s.stripMode) || LAYOUTS[s.layout].cols === 1 ? 1200 : 1800;
  return width * s.printDPI / 300;
}
