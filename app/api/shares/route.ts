import { prepareShare, saveShare, shareFailure, privateHeaders } from '@/lib/server/share-cache';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try { return Response.json(await (request.headers.get('content-type') === 'application/json' ? prepareShare(request) : saveShare(request)), { status: 201, headers: privateHeaders }); }
  catch (error) { return shareFailure(error); }
}
