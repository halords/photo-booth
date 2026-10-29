import { readShare } from '@/lib/server/share-cache';
import SharedSessionGallery from '@/components/SharedSessionGallery';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your shared photo booth session', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function SharedSession({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await readShare(id); } catch { /* Expired links show a recovery path. */ }
  return <main className="page shared-session"><div className="panel result-tools">
    <span className="eyebrow">POCKET / PHOTO BOOTH</span>
    <h1>{session ? 'Good times, shared.' : 'This memory link has expired.'}</h1>
    {session ? <><p>Your final photo layout, original individual shots, and animated GIF are together in one folder.</p>
      <SharedSessionGallery id={id} size={session.size} name={session.name} />
      <p>Available until {new Date(session.expiresAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC, or until the temporary cache is cleared.</p>
      <small>Anyone with this link can download these photos. No account needed.</small>
    </> : <p>Shared folders last up to 24 hours. Ask your friend to create a new link from their saved session.</p>}
    <a className="text-button full-width" href="/">Make your own photo booth memory</a>
  </div></main>;
}
