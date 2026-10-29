'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import { isStrip, requiredPhotos } from '@/lib/session-settings';
import { downloadFile } from '@/lib/share';
import Icon from './Icon';
import ShotImage from './ShotImage';
import Steps from './Steps';

export default function CaptureView() {
  const { settings, shots, pro, busy, startPro, cancelPro, captureSequence, stopSequence, flipLens, importPhotos, shootNative, go, retakeShot, updateSettings } = useBooth();
  const video = useRef<HTMLVideoElement>(null), input = useRef<HTMLInputElement>(null), native = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false), [single, setSingle] = useState(false), [target, setTarget] = useState<number | undefined>();
  const total = requiredPhotos(settings), done = shots.filter(Boolean).length, complete = done === total;
  const live = settings.mode === 'pro', missing = shots.findIndex(s => !s);
  const sequenceRef = useRef(captureSequence); sequenceRef.current = captureSequence;
  useEffect(() => {
    if (live && video.current) void startPro(video.current);
    return () => cancelPro();
  }, [live, startPro, cancelPro]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { stopSequence(); return; }
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes((event.target as HTMLElement).tagName)) return;
      if (event.code === 'Space' && live && pro.cameraReady && !complete) { event.preventDefault(); void sequenceRef.current(single); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [live, pro.cameraReady, complete, single, stopSequence]);
  const choose = (index?: number) => { setTarget(index); if (input.current) { input.current.value = ''; input.current.click(); } };
  const takeNative = () => { if (native.current && missing >= 0) void shootNative(native.current, missing); };
  const switchToUpload = () => { cancelPro(); updateSettings({ mode: 'upload' }); };
  return <section className="page workflow-page capture-page"><Steps current={1} />
    <div className="page-intro"><div><span className="eyebrow">THIS IS YOUR MOMENT</span><h1>Less perfect. <em>More you.</em></h1><p>{live ? 'Find your light, gather your people, and let the countdown do its thing.' : 'Bring your favorite photos together. A little story in every frame.'}</p></div><span className="pill subtle">{done} / {total} photos</span></div>
    <div className="capture-workspace"><div className="capture-main">
      {live ? <><div className={'viewfinder ' + (pro.flash ? 'flashing' : '')}>
        <video ref={video} autoPlay playsInline muted className={settings.mirrorMode && settings.camera === 'user' ? 'mirrored' : ''} />
        {settings.showGrid && <div className="framing-grid" aria-hidden="true" />}
        <div className="viewfinder-top"><span className="viewfinder-badge"><span className={'status-dot ' + (!pro.cameraReady ? 'waiting' : '')} />{pro.cameraReady ? 'LIVE CAMERA' : 'CONNECTING'}</span><div className="viewfinder-tools">
          <button aria-label="Toggle framing grid" aria-pressed={settings.showGrid} onClick={() => updateSettings({ showGrid: !settings.showGrid })}><Icon name="grid" size={18} /></button>
          <button aria-label="Switch front and rear camera" disabled={pro.running} onClick={() => video.current && flipLens(video.current)}><Icon name="refresh" size={18} /></button>
        </div></div>
        {pro.count !== null && <div className="countdown" role="status" aria-live="polite"><span key={pro.count}>{pro.count}</span><small>{pro.count === 1 ? 'Give us a smile.' : 'Your moment is coming.'}</small></div>}
        {(!pro.cameraReady && !pro.error) && <div className="camera-placeholder"><span className="camera-loader"><Icon name="camera" size={34} /></span><h3>{pro.status}</h3><p>{pro.status === 'Camera paused' ? 'Your camera paused while the studio was in the background.' : 'Allow camera access when your browser asks.'}</p>{pro.status === 'Camera paused' && <button className="btn btn-light" onClick={() => video.current && void startPro(video.current)}>Resume camera</button>}<button className="btn btn-light" onClick={switchToUpload}>Use my own photos instead</button></div>}
        {pro.error && <div className="camera-placeholder"><Icon name="camera" size={38} /><h3>Let's find another way.</h3><p>{pro.error}</p><div className="button-row"><button className="btn btn-light" onClick={() => video.current && void startPro(video.current)}><Icon name="refresh" size={16} />Try again</button><button className="btn btn-light" onClick={switchToUpload}><Icon name="upload" size={16} />Upload photos</button></div></div>}
        <div className="viewfinder-bottom"><span>{complete ? 'You look good in every frame.' : pro.status}</span><span>{settings.countdown > 0 ? settings.countdown + 's timer' : 'No timer'}</span></div>
      </div><div className="shutter-controls"><button className="icon-button" aria-label="Toggle shutter sounds" aria-pressed={settings.soundEnabled} onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}><Icon name="volume" /><span>{settings.soundEnabled ? 'Sound on' : 'Sound off'}</span></button>
        <button className={'shutter ' + (pro.running ? 'is-running' : '')} aria-label={pro.running ? 'Stop capture sequence' : 'Start capture sequence'} disabled={(!pro.cameraReady && !pro.running) || complete || busy} onClick={() => pro.running ? stopSequence() : void captureSequence(single)}><span>{pro.running ? <i /> : <Icon name="camera" size={27} />}</span></button>
        <button className="icon-button" aria-label="Toggle screen flash" aria-pressed={settings.flashEnabled} onClick={() => updateSettings({ flashEnabled: !settings.flashEnabled })}><Icon name="bolt" /><span>{settings.flashEnabled ? 'Flash on' : 'Flash off'}</span></button></div>
        <div className="capture-mode-toggle"><label><input type="checkbox" checked={single} onChange={e => setSingle(e.target.checked)} disabled={pro.running} /> Take one photo at a time</label><span className="keyboard-tip"><kbd>space</kbd> capture · <kbd>esc</kbd> stop</span></div></>
        : <div className={'upload-zone ' + (dragging ? 'dragging' : '')} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void importPhotos(Array.from(e.dataTransfer.files)); }}>
          <span className="upload-illustration"><Icon name={settings.mode === 'native' ? 'camera' : 'image'} size={50} /><span>+</span></span>
          <h2>{complete ? 'Every frame has a story.' : settings.mode === 'native' ? 'A tap. A pose. A memory.' : 'Your favorites belong together.'}</h2><p>{complete ? 'Your photos are ready. Add the finishing touches next.' : 'Drop your photos here, or choose them from your device.'}</p>
          {!complete && <div className="button-row">{settings.mode === 'native' && <button className="btn btn-primary" disabled={busy} onClick={takeNative}><Icon name="camera" size={18} />Take photo {done + 1}</button>}<button className={settings.mode === 'native' ? 'btn btn-secondary' : 'btn btn-primary'} disabled={busy} onClick={() => choose()}><Icon name="upload" size={18} />{busy ? 'Opening photos…' : 'Choose photos'}</button></div>}
          <small>JPG, PNG, WebP, and supported HEIC · up to 40 MB each</small>
          {settings.mode === 'upload' && !complete && <button className="text-button" onClick={() => updateSettings({ mode: 'pro' })}>Prefer to take new photos? Open the camera <Icon name="arrow" size={16} /></button>}
        </div>}
    </div><aside className="capture-rail panel"><div className="panel-heading"><h3>Your frames</h3><span>{done} of {total}</span></div><p className="control-hint">{isStrip(settings.layout) && settings.stripMode === 'different' && total > 1 ? 'First half: strip A. Second half: strip B.' : 'A new expression for every frame.'}</p>
      <div className="shot-list">{Array.from({ length: total }, (_, i) => <div key={i} className={'shot-slot ' + (shots[i] ? 'filled' : missing === i ? 'next' : '')}><span className="shot-number">{String(i + 1).padStart(2, '0')}</span>
        {shots[i] ? <><ShotImage file={shots[i]!.file} alt={'Captured photo ' + (i + 1)} /><button className="shot-download" aria-label={'Download original photo ' + (i + 1)} onClick={() => downloadFile(shots[i]!.file)}><Icon name="download" size={16} /></button><button className="shot-replace" disabled={pro.running || busy} aria-label={'Replace photo ' + (i + 1)} onClick={() => live ? retakeShot(i) : choose(i)}><Icon name="refresh" size={15} />{live ? 'Retake' : 'Replace'}</button></> : <><Icon name="image" size={26} /><span>{missing === i ? 'Your next moment' : 'Waiting for a memory'}</span></>}
      </div>)}</div><button className="btn btn-primary full-width" disabled={!complete || pro.running || busy} onClick={() => go('review')}>Make it yours <Icon name="arrow" size={17} /></button>
      <button className="text-button full-width" disabled={pro.running || busy || complete} onClick={() => choose()}><Icon name="upload" size={16} /> Add from your device</button>
    </aside></div><button className="text-button back-link" disabled={busy} onClick={() => go('setup')}><Icon name="back" size={16} /> Back to setup</button>
    <input data-testid="photo-upload" ref={input} className="visually-hidden" tabIndex={-1} type="file" accept="image/*,.heic,.heif" multiple={target === undefined} onChange={e => { void importPhotos(Array.from(e.target.files || []), target); e.target.value = ''; }} />
    <input ref={native} className="visually-hidden" tabIndex={-1} type="file" accept="image/*" capture={settings.camera} />
  </section>;
}
