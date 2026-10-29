import { readShare, shareFailure, privateHeaders } from '@/lib/server/share-cache';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return Response.json(await readShare((await context.params).id), { headers: privateHeaders }); }
  catch (error) { return shareFailure(error); }
}
