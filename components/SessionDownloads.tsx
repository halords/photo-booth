'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { createSharedLink, saveFolder, sessionZip, type SharedLink } from '@/lib/session-bundle';
import { downloadFile } from '@/lib/share';
import ShotImage from './ShotImage';
import Icon from './Icon';

export default function SessionDownloads() {
  const { result, notify } = useBooth();
  const [working, setWorking] = useState(''), [error, setError] = useState(''), [link, setLink] = useState<SharedLink | null>(null);
  const [gifUrl, setGifUrl] = useState('');
  const archive = useRef<File | null>(null), active = useRef(false);
  const files = result?.files, assets = result?.assets;
  useEffect(() => {
    const gif = files?.find(file => file.type === 'image/gif'); if (!gif) return;
    const url = URL.createObjectURL(gif); setGifUrl(url); return () => URL.revokeObjectURL(url);
  }, [files]);
  if (!result || !files?.length) return null;
  const getZip = async () => archive.current ||= await sessionZip(files, result.name);
  const run = async (label: string, action: () => Promise<void>) => {
    if (active.current) return;
    active.current = true; setWorking(label); setError('');
    try { await action(); } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setError(error instanceof Error ? error.message : 'Please try downloading the session again.');
    } finally { active.current = false; setWorking(''); }
  };
  const saveShot = async (file: File) => {
    if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ files: [file], title: 'A photo booth moment' });
    else downloadFile(file);
  };
  return <div className="session-downloads">
    <h3>Your complete session</h3><p>One folder with the print layout, {assets?.filter(asset => asset.kind === 'shot').length} original photos, and your GIF.</p>
    <button className="btn btn-primary full-width" disabled={!!working} onClick={() => void run('Preparing download…', async () => { downloadFile(await getZip()); })}><Icon name="download" size={18} />Download session ZIP</button>
    <button className="btn btn-secondary full-width" disabled={!!working} onClick={() => void run('Saving folder…', async () => { await saveFolder(files, result.name); notify('Session ready to save on your device.'); })}>Save folder to device</button>
    <small>Choose a folder in supported browsers. On phones, a ZIP download keeps all files together.</small>
    {gifUrl && <div className="session-gif"><img src={gifUrl} alt="Animated GIF of your photo booth session" /><button className="text-button" onClick={() => downloadFile(files.find(file => file.type === 'image/gif')!)}>Download GIF</button><small>800 × 800 · looping animation</small></div>}
    <div className="session-sharing"><h3>One link for your friends</h3><p>Create a link to upload this folder to temporary storage for up to 24 hours. Anyone with the link can download it.</p>
      <button className="btn btn-secondary full-width" disabled={!!working} onClick={() => void run('Creating your link…', async () => { setLink(await createSharedLink(await getZip())); })}><Icon name="share" size={17} />{link ? 'Create a fresh link' : 'Create 24-hour link'}</button>
      {link && <><label className="field"><span>Session link</span><input readOnly value={link.url} onFocus={e => e.target.select()} /></label><div className="button-row">
        <button className="text-button" onClick={() => void run('Copying link…', async () => { await navigator.clipboard.writeText(link.url); notify('Link copied.'); })}>Copy link</button>
        {!!navigator.share && <button className="text-button" onClick={() => void run('Sharing link…', () => navigator.share({ url: link.url, title: 'Our photo booth session' }))}>Share link</button>}
        <a className="text-button" href={link.url} target="_blank" rel="noreferrer">Open link</a>
      </div><small>Expires {new Date(link.expiresAt).toLocaleString()}, or sooner if the server cache is cleared.</small></>}
    </div>
    {!!working && <p role="status" aria-live="polite">{working}</p>}{error && <p className="session-error" role="alert">{error}</p>}
    <details className="individual-shots"><summary>Individual shots · original resolution</summary><p>These are your original files. Frame crops, filters, and selfie mirroring appear in the layout and GIF.</p>
      <div className="individual-shot-grid">{assets?.filter(asset => asset.kind === 'shot').map((asset, index) => {
        const file = files.find(file => file.name === asset.name)!;
        return <article key={asset.name}><ShotImage file={file} alt={'Original shot ' + (index + 1)} /><strong>Photo {index + 1}</strong><small>{asset.width?.toLocaleString()} × {asset.height?.toLocaleString()} px</small>
          <button className="text-button" onClick={() => downloadFile(file)}>Download photo {index + 1}</button><button className="text-button" disabled={!!working} onClick={() => void run('Saving photo…', () => saveShot(file))}>Save photo {index + 1} to device</button>
        </article>;
      })}</div>
    </details>
  </div>;
}
