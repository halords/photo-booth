'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { previewFiles } from '@/lib/zip-preview';
import { downloadFile } from '@/lib/share';

interface Preview { file: File; url: string }
export default function SharedSessionGallery({ id, size, name }: { id: string; size: number; name: string }) {
  const [photos, setPhotos] = useState<Preview[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null), urls = useRef<string[]>([]), archive = useRef<File | null>(null);
  const downloadUrl = '/api/shares/' + id + '/download';
  const load = useCallback(async () => {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/shares/' + id + '/download', { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('This link has expired or is unavailable. Ask your friend for a new link.');
      const blob = await response.blob();
      if (blob.size !== size) throw new Error('The session download was interrupted. Please try again.');
      const files = await previewFiles(blob);
      if (request.signal.aborted) return;
      urls.current.forEach(url => URL.revokeObjectURL(url));
      const items = files.map(file => ({ file, url: URL.createObjectURL(file) })); urls.current = items.map(item => item.url);
      archive.current = new File([blob], name, { type: 'application/zip' }); setPhotos(items);
    } catch (error) {
      if (!request.signal.aborted) setError(error instanceof TypeError ? 'The gallery could not load. Try downloading the ZIP, or ask the booth owner to check their bucket CORS settings.' : error instanceof Error ? error.message : 'Could not load these photos.');
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, [id, size, name]);
  useEffect(() => {
    // Large sessions remain opt-in on mobile connections.
    if (size <= 30 * 1024 * 1024) void load();
    return () => { controller.current?.abort(); urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current = []; };
  }, [load, size]);
  const layout = photos.find(item => item.file.name === 'final-layout.png'), gif = photos.find(item => item.file.type === 'image/gif');
  const shots = photos.filter(item => item.file.name.startsWith('shot-'));
  return <div className="shared-gallery">
    <div className="shared-gallery-actions"><a className="btn btn-primary" href={downloadUrl} download onClick={event => { if (archive.current) { event.preventDefault(); downloadFile(archive.current); } }}>Download session ZIP</a>
      {!photos.length && <button className="btn btn-secondary" disabled={loading} onClick={() => void load()}>{loading ? 'Loading your photos…' : 'Preview photos'}</button>}
    </div>
    {!photos.length && <p className="control-hint">{(size / 1024 / 1024).toFixed(1)} MB · Previewing loads this session in your browser. No manual unzipping needed.</p>}
    {loading && <p role="status">Opening the layout, original photos, and GIF…</p>}{error && <p className="session-error" role="alert">{error}</p>}
    {layout && <section className="shared-layout"><h2>Your photo booth print</h2><img src={layout.url} alt="Shared photo booth layout" /><button className="btn btn-secondary" onClick={() => downloadFile(layout.file)}>Download print layout</button></section>}
    {gif && <section className="shared-animation"><h2>One moment after another</h2><img src={gif.url} alt="Animated GIF of the shared photo booth session" loading="lazy" /><button className="btn btn-secondary" onClick={() => downloadFile(gif.file)}>Download GIF</button></section>}
    {!!shots.length && <section><h2>Every original shot</h2><div className="shared-photo-grid">{shots.map((item, index) => <article key={item.file.name}>
      <a href={item.url} target="_blank" rel="noreferrer" aria-label={'Open full-size photo ' + (index + 1)}><img src={item.url} alt={'Shared photo ' + (index + 1)} loading="lazy" /></a>
      <button className="text-button" onClick={() => downloadFile(item.file)}>Download photo {index + 1}</button>
      {/heic|heif/.test(item.file.type) && <small>HEIC preview depends on your browser. Download to open in your Photos app.</small>}
    </article>)}</div></section>}
  </div>;
}
