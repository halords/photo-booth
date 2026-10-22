'use client';
import { useBooth } from '@/lib/booth';
import type { LayoutId, TemplateId } from '@/lib/types';
import Icon from './Icon';
import PhotoStrip from './PhotoStrip';

const inspiration: { name: string; sub: string; tag: string; template: TemplateId; layout: LayoutId; color: string }[] = [
  { name: 'The classic strip', sub: 'Four poses. All you.', tag: 'THE FAVORITE', template: 'polaroid-white', layout: 'strip4', color: '#e9e4db' },
  { name: 'A little nostalgia', sub: 'Good times, on film.', tag: 'RETRO MOOD', template: 'film', layout: 'strip3', color: '#dde3d9' },
  { name: 'Better together', sub: 'Make room for everyone.', tag: 'GROUP APPROVED', template: 'editorial', layout: 'grid2x2', color: '#eadbd2' },
];
export default function HomeView() {
  const { go, gallery, openRecord, updateSettings, useDemo, busy } = useBooth();
  return <section className="page home-page">
    <div className="page-intro"><div><div className="eyebrow">A LITTLE SPACE TO MAKE MEMORIES</div><h1>Life happens. <em>Keep a little.</em></h1><p>Your favorite people, your best expressions. Make a photo strip that feels like you.</p></div><span className="intro-note"><Icon name="sun" size={16} /> Make today a good one.</span></div>
    <div className="hero-card">
      <div className="hero-copy"><span className="pill"><span className="status-dot" /> YOUR BOOTH IS READY</span><h2>Come as you are.<br /><em>Leave with a memory.</em></h2><p>A few poses, a little personality, and a strip<br className="desktop-break" /> you'll want to keep. No sign-up. Just you.</p>
        <div className="hero-actions"><button className="btn btn-primary" onClick={() => go('setup')}><Icon name="camera" size={19} /> Let's take some photos <Icon name="arrow" size={18} /></button><button className="text-button" onClick={() => { updateSettings({ mode: 'upload' }); go('setup'); }}><Icon name="upload" size={16} /> Use my own photos</button></div>
        <div className="hero-benefits"><span><Icon name="clock" size={15} /> Ready in a minute</span><span><Icon name="shield" size={15} /> Yours to keep</span></div>
      </div>
      <div className="hero-art" aria-label="Sample photo strips"><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-orbit" />
        <PhotoStrip layout="strip3" template="film" className="hero-strip-back" caption="the good times." />
        <PhotoStrip layout="strip3" className="hero-strip-front" caption="us, being us." />
        <div className="art-sticker"><Icon name="sparkles" size={21} /><span>Made of<br /><em>good moments.</em></span></div>
        <span className="handwritten">a little you, on paper <svg viewBox="0 0 75 40"><path d="M2 5c35-10 65 8 65 26m-10-6 10 8 7-12" /></svg></span>
      </div>
    </div>
    <div className="section-heading"><div><span className="eyebrow">START WITH A LITTLE INSPIRATION</span><h2>Pick your kind of keepsake.</h2></div><button className="text-button" onClick={() => go('setup')}>Explore all styles <Icon name="arrow" size={16} /></button></div>
    <div className="inspiration-grid">{inspiration.map(item => <button className="inspiration-card" key={item.name} onClick={() => { updateSettings({ layout: item.layout, template: item.template, frameColor: '' }); go('setup'); }}>
      <div className="inspiration-art" style={{ background: item.color }}><span className="card-tag">{item.tag}</span><PhotoStrip template={item.template} layout={item.layout} className={item.layout === 'grid2x2' ? 'sample-grid' : ''} /><span className="card-arrow"><Icon name="arrow" size={18} /></span></div>
      <div className="inspiration-meta"><h3>{item.name}</h3><p>{item.sub}</p></div>
    </button>)}</div>
    <div className="section-heading recent-heading"><div><h2>Your little collection.</h2><p>Good moments deserve a second look.</p></div><button className="text-button" onClick={() => go('gallery')}>View gallery <Icon name="arrow" size={16} /></button></div>
    {gallery.length ? <div className="recent-grid">{gallery.slice(0, 4).map(record => <button className="recent-card" key={record.id} onClick={() => openRecord(record)}><div><img src={record.thumbnailUrl || record.dataUrl} alt={record.eventName} loading="lazy" /></div><strong>{record.eventName}</strong><small>{new Date(record.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></button>)}</div>
      : <div className="collection-empty"><span className="empty-icon"><Icon name="image" size={25} /></span><div><h3>Your first memory is waiting.</h3><p>Finished strips will find a home right here.</p></div><button className="text-button" disabled={busy} onClick={() => void useDemo()}>Try with sample photos <Icon name="arrow" size={17} /></button></div>}
  </section>;
}
