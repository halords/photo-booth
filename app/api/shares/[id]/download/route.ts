import { shareDownload, shareFailure } from '@/lib/server/share-cache';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return await shareDownload((await context.params).id); }
  catch (error) { return shareFailure(error); }
}
