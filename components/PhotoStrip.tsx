import { TEMPLATES, LAYOUTS } from '@/lib/compose';
import type { LayoutId, TemplateId } from '@/lib/types';
const images = ['/photos/portrait-1.jpg', '/photos/friends.jpg', '/photos/portrait-3.jpg', '/photos/portrait-2.jpg'];
export default function PhotoStrip({ template = 'polaroid-white', layout = 'strip4', caption = 'a little moment, forever.', className = '' }: { template?: TemplateId; layout?: LayoutId; caption?: string; className?: string }) {
  const theme = TEMPLATES[template], spec = LAYOUTS[layout];
  return <div className={'sample-strip ' + (template === 'film' ? 'sample-film ' : '') + className} style={{ backgroundColor: theme.color, color: theme.ink }}>
    {(template === 'editorial' || template === 'modern') && <div className="sample-strip-title">THE GOOD TIMES.</div>}
    <div className="sample-photos" style={{ gridTemplateColumns: 'repeat(' + spec.cols + ', 1fr)' }}>
      {Array.from({ length: spec.shots }, (_, i) => <img key={i} src={images[i % images.length]} alt="" loading="lazy" style={{ aspectRatio: spec.cols === 1 ? '4 / 3' : '1' }} />)}
    </div>
    <div className="sample-caption">{caption || 'a little moment, forever.'}</div>
    <div className="sample-stamp">POCKET PHOTO BOOTH</div>
  </div>;
}
