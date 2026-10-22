import type { CustomLayout, PhotoPlaceholder, StripOrientation } from './types';

export function create4RLayout(orientation: StripOrientation = 'portrait', count = 3, decoration: CustomLayout['decoration'] = 'birthday'): CustomLayout {
  const cols = count === 1 ? 1 : orientation === 'landscape' ? Math.min(count, 3) : count > 3 ? 2 : 1;
  const rows = Math.ceil(count / cols), gap = 3;
  const width = (86 - gap * (cols - 1)) / cols, height = (68 - gap * (rows - 1)) / rows;
  return { orientation, decoration, backgroundDataUrl: null, slots: Array.from({ length: count }, (_, i) => ({
    id: 'slot-' + (i + 1), x: 7 + (i % cols) * (width + gap), y: 17 + Math.floor(i / cols) * (height + gap), width, height, rotation: 0,
  })) };
}
export const DEFAULT_4R = create4RLayout();
export function constrainSlot(slot: PhotoPlaceholder, orientation: StripOrientation): PhotoPlaceholder {
  const ratio = orientation === 'portrait' ? 2 / 3 : 3 / 2;
  const rotation = Math.max(-45, Math.min(45, Number(slot.rotation) || 0));
  let width = Math.max(12, Math.min(96, Number(slot.width) || 40)), height = Math.max(10, Math.min(96, Number(slot.height) || 25));
  const angle = Math.abs(rotation) * Math.PI / 180;
  const extentX = Math.cos(angle) * width + Math.sin(angle) * height / ratio;
  const extentY = Math.sin(angle) * width * ratio + Math.cos(angle) * height;
  const scale = Math.min(1, 96 / extentX, 96 / extentY); width *= scale; height *= scale;
  const halfX = (Math.cos(angle) * width + Math.sin(angle) * height / ratio) / 2;
  const halfY = (Math.sin(angle) * width * ratio + Math.cos(angle) * height) / 2;
  const centerX = Math.max(2 + halfX, Math.min(98 - halfX, (Number(slot.x) || 0) + width / 2));
  const centerY = Math.max(2 + halfY, Math.min(98 - halfY, (Number(slot.y) || 0) + height / 2));
  return { ...slot, rotation, width, height, x: centerX - width / 2, y: centerY - height / 2 };
}
export function sanitize4R(value: unknown): CustomLayout {
  if (!value || typeof value !== 'object') return create4RLayout();
  const candidate = value as Partial<CustomLayout>, orientation = candidate.orientation === 'landscape' ? 'landscape' : 'portrait';
  const slots = Array.isArray(candidate.slots) ? candidate.slots.slice(0, 6).filter(s => s && typeof s === 'object').map((s, i) => constrainSlot({
    id: 'slot-' + (i + 1), x: s.x, y: s.y, width: s.width, height: s.height, rotation: s.rotation,
  }, orientation)) : [];
  return { orientation, slots: slots.length ? slots : create4RLayout(orientation).slots,
    decoration: candidate.decoration === 'minimal' || candidate.decoration === 'celebration' ? candidate.decoration : 'birthday',
    backgroundDataUrl: typeof candidate.backgroundDataUrl === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(candidate.backgroundDataUrl) ? candidate.backgroundDataUrl : null,
  };
}
