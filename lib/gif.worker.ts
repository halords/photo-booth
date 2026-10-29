import { GIFEncoder, quantize, applyPalette } from 'gifenc';

let encoder: ReturnType<typeof GIFEncoder> | undefined;
self.onmessage = (event: MessageEvent<{ rgba?: Uint8ClampedArray; width?: number; height?: number; finish?: boolean }>) => {
  try {
    if (event.data.finish) {
      if (!encoder) throw new Error('No animation frames.');
      encoder.finish(); const bytes = encoder.bytes();
      self.postMessage({ bytes }); encoder = undefined;
    } else {
      const { rgba, width, height } = event.data;
      if (!rgba || !width || !height) throw new Error('Missing animation frame.');
      encoder ||= GIFEncoder();
      const palette = quantize(rgba, 256), index = applyPalette(rgba, palette);
      encoder.writeFrame(index, width, height, { palette, delay: 650, repeat: 0 });
      self.postMessage({ ready: true });
    }
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Could not create GIF.' }); }
};
