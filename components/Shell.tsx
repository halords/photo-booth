'use client';
import { useEffect, useRef, useState } from 'react';
import { useBooth } from '@/lib/booth';
import Icon from './Icon';
import ServiceWorker from './ServiceWorker';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { view, go, toastMsg, gallery } = useBooth(), [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), main = useRef<HTMLElement>(null);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);
  useEffect(() => { main.current?.focus({ preventScroll: true }); }, [view]);
  const active = ['setup', 'capture', 'review', 'result'].includes(view);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => go('home')} aria-label="Pocket home"><span className="brand-icon"><Icon name="camera" size={23} /></span><span>pocket<span className="brand-dot">.</span><small>PHOTO BOOTH</small></span></button>
      <div className="nav-section-label">YOUR CREATIVE CORNER</div>
      <nav className="primary-nav" aria-label="Main navigation">
        <button className={view === 'home' ? 'active' : ''} aria-current={view === 'home' ? 'page' : undefined} onClick={() => go('home')}><Icon name="home" /><span>Overview</span></button>
        <button className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => go('setup')}><Icon name="camera" /><span>Photo booth</span><span className="nav-plus">+</span></button>
        <button className={view === 'gallery' ? 'active' : ''} aria-current={view === 'gallery' ? 'page' : undefined} onClick={() => go('gallery')}><Icon name="grid" /><span>My gallery</span>{gallery.length > 0 && <span className="nav-count">{gallery.length}</span>}</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="note-spark"><Icon name="sparkles" size={22} /></span><p>Good company.<br />Great memories.</p><small>Turn the everyday into<br />something worth keeping.</small></div>
        <button className="help-button" onClick={() => setHelp(true)}><Icon name="help" size={18} /> A little help</button>
        <div className="device-note"><span className="status-dot" /> Stored on this device</div>
      </div>
    </aside>
    <div className="app-body">
      <header className="topbar"><div className="breadcrumb">Your studio <span>/</span> <strong>{view === 'home' ? 'Overview' : view === 'gallery' ? 'My gallery' : 'Photo booth'}</strong></div>
        <div className="topbar-right"><span className="private-badge"><Icon name="shield" size={15} /> Private by design</span><button className="avatar" onClick={() => setHelp(true)} aria-label="Help with your studio">P</button></div>
      </header>
      <main id="main-content" ref={main} tabIndex={-1}>{children}</main>
      <footer className="app-footer"><span>Made for the moments in between.</span><span>pocket. / your personal photo studio</span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button className={view === 'home' ? 'active' : ''} onClick={() => go('home')}><Icon name="home" size={21} />Home</button>
      <button className={active ? 'active' : ''} onClick={() => go('setup')}><Icon name="camera" size={21} />Booth</button>
      <button className={view === 'gallery' ? 'active' : ''} onClick={() => go('gallery')}><Icon name="grid" size={21} />Gallery</button>
    </nav>
    {toastMsg && <div className="toast" role="status" aria-live="polite"><Icon name="check" size={18} />{toastMsg}</div>}
    <dialog ref={dialog} className="help-dialog" onCancel={() => setHelp(false)} onClick={e => { if (e.target === e.currentTarget) setHelp(false); }}>
      <button className="icon-button dialog-close" aria-label="Close help" onClick={() => setHelp(false)}><Icon name="close" /></button>
      <span className="eyebrow">A LITTLE HELP</span><h2>Your booth, made simple.</h2>
      <ol><li><strong>Pick your layout.</strong><p>Choose a strip or a grid, then a frame you love.</p></li><li><strong>Strike a pose.</strong><p>Use the live camera, your phone camera, or photos already on your device. Space starts the live countdown. Escape stops it.</p></li><li><strong>Make it yours.</strong><p>Reorder, crop, rotate, add a filter and a caption. Save, share, or print your strip.</p></li></ol>
      <div className="info-note"><Icon name="shield" /><p>Your captured and uploaded photos are processed on this device. Gallery storage belongs to this browser, so download anything you want to keep before clearing browser data.</p></div>
      <button className="btn btn-primary full-width" onClick={() => setHelp(false)}>Got it <Icon name="check" size={18} /></button>
    </dialog>
    <ServiceWorker />
  </div>;
}
