/** Add 300 DPI print density without re-encoding the canvas pixels. */
export async function withPrintDensity(blob: Blob, dpi = 300): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === 'image/jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;
    if (bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.slice(6, 11)) === 'JFIF\0') {
      bytes[13] = 1; bytes[14] = dpi >> 8; bytes[15] = dpi & 255; bytes[16] = dpi >> 8; bytes[17] = dpi & 255;
      return new Blob([bytes], { type: blob.type });
    }
    const jfif = new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,dpi >> 8,dpi & 255,dpi >> 8,dpi & 255,0,0]);
    return new Blob([bytes.slice(0,2),jfif,bytes.slice(2)], { type: blob.type });
  }
  if (blob.type !== 'image/png' || bytes[0] !== 137) return blob;
  const chunk = new Uint8Array(21), view = new DataView(chunk.buffer);
  view.setUint32(0, 9); chunk.set([112,72,89,115],4);
  const ppm = Math.round(dpi / .0254); view.setUint32(8, ppm); view.setUint32(12, ppm); chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.slice(4,17)) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  view.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: BlobPart[] = [bytes.slice(0,33), chunk];
  for (let offset = 33; offset < bytes.length;) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0) + 12;
    if (String.fromCharCode(...bytes.slice(offset + 4, offset + 8)) !== 'pHYs') parts.push(bytes.slice(offset, offset + length));
    offset += length;
  }
  return new Blob(parts, { type: blob.type });
}
