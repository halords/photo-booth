'use client';
import { useState } from 'react';
import { useBooth } from '@/lib/booth';
import Icon from './Icon';
import Steps from './Steps';
export default function ResultView() {
  const { result, go, share, download, gallery, toggleFavorite, startSession } = useBooth(), [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  if (!result) return <section className="page"><h1>Let's make a memory.</h1><button className="btn btn-primary" onClick={() => go('setup')}>Open the booth</button></section>;
  const favorite = gallery.find(r => r.id === result.id)?.favorite;
  const printStyle = result.printOrientation ? `@media print { @page { size: ${result.printOrientation === 'portrait' ? '4in 6in' : '6in 4in'}; margin: 0; } .print-strip { width: ${result.printOrientation === 'portrait' ? '4in' : '6in'}; height: ${result.printOrientation === 'portrait' ? '6in' : '4in'}; max-height: none; max-width: none; } }` : '';
  return <section className="page workflow-page result-page"><Steps current={3} /><div className="page-intro"><div><span className="eyebrow">ONE FOR THE MEMORY BOOK</span><h1>That's a keeper. <em>So very you.</em></h1><p>{result.saved ? 'Saved to your gallery. Now keep it, share it, or make someone smile.' : 'Your strip is ready. Download it to keep this memory.'}</p></div><span className="pill success-pill"><Icon name="check" size={15} />{result.saved ? 'Saved on this device' : 'Ready to download'}</span></div>
    <div className="result-workspace"><div className="finished-stage"><img className="print-strip" src={result.dataUrl} alt="Your finished photo booth strip" /><span className="finished-note">keep the good ones. <Icon name="heart" size={21} /></span></div><div className="result-tools panel"><span className="eyebrow">YOURS TO KEEP</span><h2>Pass the memories around.</h2><p>A little reminder of a very good moment.</p>
      {printStyle && <style>{printStyle}</style>}
      <button className="btn btn-primary full-width" onClick={() => void share()}><Icon name="share" size={19} /> Share your strip</button>
      <div className="download-options"><label><span>Download as</span><select value={format} onChange={e => setFormat(e.target.value as 'jpg' | 'png')}><option value="jpg">JPG · smaller file</option><option value="png">PNG · lossless file</option></select></label><button className="btn btn-secondary full-width" onClick={() => void download(format)}><Icon name="download" size={18} /> Download {format.toUpperCase()}</button><small>{result.width.toLocaleString()} × {result.height.toLocaleString()} pixels · full resolution</small></div>
      <div className="result-utility"><button className="text-button" onClick={() => window.print()}><Icon name="print" size={18} />Print</button>{result.saved && <button className={'text-button ' + (favorite ? 'is-favorite' : '')} aria-pressed={!!favorite} onClick={() => void toggleFavorite(result.id)}><Icon name="heart" size={18} />{favorite ? 'Favorited' : 'Favorite'}</button>}{result.editable && <button className="text-button" onClick={() => go('review')}><Icon name="settings" size={18} />Edit</button>}</div>
      <div className="result-next"><h3>One more for the road?</h3><button className="btn btn-secondary full-width" onClick={startSession}><Icon name="camera" size={18} /> Another round, same style</button><button className="text-button full-width" onClick={() => go('setup')}>Try a different look <Icon name="arrow" size={16} /></button></div><p className="storage-note"><Icon name="shield" size={15} /> Download your favorites before clearing browser data.</p>
    </div></div><button className="text-button back-link" onClick={() => go('gallery')}><Icon name="grid" size={17} /> Back to your collection</button>
  </section>;
}
