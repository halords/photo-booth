/** Read the uncompressed ZIPs made by sessionZip using Blob slices, without
 * inflating or copying every full-resolution photo into JavaScript memory. */
export async function previewFiles(archive: Blob): Promise<File[]> {
  if (archive.size < 22 || archive.size > 250 * 1024 * 1024) throw new Error('This session cannot be previewed. Download the ZIP instead.');
  const tail = new DataView(await archive.slice(Math.max(0, archive.size - 65557)).arrayBuffer());
  let end = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50 && i + 22 + tail.getUint16(i + 20, true) === tail.byteLength) { end = i; break; }
  }
  if (end < 0) throw new Error('This session folder is incomplete. Please try downloading it again.');
  const count = tail.getUint16(end + 10, true), length = tail.getUint32(end + 12, true), start = tail.getUint32(end + 16, true);
  if (tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true) || count > 32 || !count || length > 128000 || start + length > archive.size - 22) throw new Error('Unsupported session folder.');
  const directory = new DataView(await archive.slice(start, start + length).arrayBuffer()), decoder = new TextDecoder(), files: File[] = [];
  let offset = 0;
  const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', avif: 'image/avif' };
  for (let entry = 0; entry < count; entry++) {
    if (offset + 46 > length || directory.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid session index.');
    const flags = directory.getUint16(offset + 8, true), method = directory.getUint16(offset + 10, true);
    const compressed = directory.getUint32(offset + 20, true), size = directory.getUint32(offset + 24, true);
    const nameSize = directory.getUint16(offset + 28, true), extra = directory.getUint16(offset + 30, true), comment = directory.getUint16(offset + 32, true);
    const local = directory.getUint32(offset + 42, true), next = offset + 46 + nameSize + extra + comment;
    if (next > length || flags & 1 || method !== 0 || size !== compressed || local + 30 > start) throw new Error('This ZIP needs to be downloaded to open it.');
    const name = decoder.decode(new Uint8Array(directory.buffer, offset + 46, nameSize)).split('/').at(-1) || '';
    offset = next;
    if (!/^(final-layout\.png|moments\.gif|shot-\d{2}\.(png|jpe?g|webp|heic|heif|avif))$/.test(name)) continue;
    const header = new DataView(await archive.slice(local, local + 30).arrayBuffer());
    if (header.getUint32(0, true) !== 0x04034b50) throw new Error('Invalid photo entry.');
    const dataStart = local + 30 + header.getUint16(26, true) + header.getUint16(28, true);
    if (dataStart + size > start) throw new Error('Incomplete photo entry.');
    const type = types[name.split('.').at(-1)!];
    files.push(new File([archive.slice(dataStart, dataStart + size, type)], name, { type }));
  }
  if (!files.some(file => file.name === 'final-layout.png')) throw new Error('No photo layout was found in this folder.');
  return files;
}
