import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { hasObjectStorage, objectDownload, prepareObjectUpload, readObjectShare } from './object-shares';

const ROOT = path.resolve(process.env.BOOTH_SHARE_DIR || path.join(tmpdir(), 'pocket-photo-booth-shares'));
const TTL = 24 * 60 * 60 * 1000, MAX_FILE = 250 * 1024 * 1024, MAX_CACHE = 1024 * 1024 * 1024;
const TOKEN = /^[a-f0-9]{48}$/;
export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
export interface ShareInfo { name: string; size: number; expiresAt: number }
const globals = globalThis as unknown as { pocketShares?: { active: number; rates: Map<string, { count: number; until: number }>; timer?: ReturnType<typeof setInterval> } };
const state: NonNullable<typeof globals.pocketShares> = globals.pocketShares ||= { active: 0, rates: new Map() };
export class ShareError extends Error { constructor(message: string, public status: number) { super(message); } }

function directory(id: string) {
  if (!TOKEN.test(id)) throw new ShareError('This link is unavailable or has expired.', 404);
  const target = path.resolve(ROOT, id);
  if (path.dirname(target) !== ROOT) throw new ShareError('Invalid link.', 400);
  return target;
}
async function prune(): Promise<number> {
  await mkdir(ROOT, { recursive: true }); let bytes = 0;
  for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !TOKEN.test(entry.name)) continue;
    const dir = directory(entry.name);
    try {
      const meta: ShareInfo = JSON.parse(await readFile(path.join(dir, 'info.json'), 'utf8'));
      if (meta.expiresAt <= Date.now()) await rm(dir, { recursive: true, force: true });
      else bytes += meta.size;
    } catch {
      try { if (Date.now() - (await stat(dir)).mtimeMs > 3600000) await rm(dir, { recursive: true, force: true }); } catch {}
    }
  }
  return bytes;
}
function available() {
  if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !process.env.BOOTH_SHARE_DIR) {
    throw new ShareError('Link sharing needs a server with a shared temporary folder. Download the session ZIP to share it from this deployment.', 503);
  }
  if (!state.timer) { state.timer = setInterval(() => { void prune().catch(() => {}); }, 15 * 60000); state.timer.unref(); }
}
function authorize(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ShareError('Open the booth to create a sharing link.', 403);
}
function admit(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now();
  for (const [key, rate] of state.rates) if (rate.until <= now) state.rates.delete(key);
  const rate = state.rates.get(ip) || { count: 0, until: now + 3600000 };
  if (rate.count >= 30 || state.rates.size >= 10000 || state.active >= 3) throw new ShareError('Sharing is busy. Try again later or download your session.', 429);
  rate.count++; state.rates.set(ip, rate);
}
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 100).replace(/\.zip$/i, '') + '.zip';
export async function prepareShare(request: Request) {
  authorize(request);
  if (Number(request.headers.get('content-length')) > 2048) throw new ShareError('Invalid upload request.', 400);
  const body = await request.text();
  if (body.length > 2048) throw new ShareError('Invalid upload request.', 400);
  let input;
  try { input = JSON.parse(body); } catch { throw new ShareError('Invalid upload request.', 400); }
  if (!input || typeof input.name !== 'string' || !Number.isSafeInteger(input.size) || input.size < 22) throw new ShareError('Invalid session file.', 400);
  if (input.size > MAX_FILE) throw new ShareError('This session exceeds the 250 MB sharing limit. Download it instead.', 413);
  const name = safeName(input.name);
  if (hasObjectStorage()) { admit(request); return prepareObjectUpload(name, input.size); }
  available(); return { storage: 'local' };
}
export async function saveShare(request: Request) {
  available(); authorize(request);
  if (hasObjectStorage()) throw new ShareError('Use a direct upload for this session.', 400);
  if (request.headers.get('content-type') !== 'application/zip') throw new ShareError('Upload a session ZIP file.', 415);
  if (Number(request.headers.get('content-length')) > MAX_FILE) throw new ShareError('This session exceeds the 250 MB sharing limit. Download it instead.', 413);
  admit(request); state.active++;
  const now = Date.now();
  const id = randomBytes(24).toString('hex'), dir = directory(id);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (await prune() + state.active * MAX_FILE > MAX_CACHE) throw new ShareError('The temporary sharing cache is full. Download your session or try later.', 507);
    if (!request.body) throw new ShareError('The session folder is empty.', 400);
    await mkdir(dir); reader = request.body.getReader();
    const file = await open(path.join(dir, 'session.zip'), 'wx'); let size = 0;
    const signature = new Uint8Array(4);
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        if (size < 4) signature.set(value.subarray(0, Math.min(4 - size, value.length)), size);
        size += value.byteLength;
        if (size > MAX_FILE) throw new ShareError('This session exceeds the 250 MB sharing limit. Download it instead.', 413);
        await file.writeFile(value);
      }
    } finally { await file.close(); }
    if (size < 22 || signature[0] !== 80 || signature[1] !== 75 || signature[2] !== 3 || signature[3] !== 4) throw new ShareError('The session ZIP is invalid.', 400);
    const name = safeName(request.headers.get('x-booth-filename') || 'photo-booth.zip');
    const meta: ShareInfo = { name, size, expiresAt: now + TTL };
    await writeFile(path.join(dir, 'info.json'), JSON.stringify(meta), { flag: 'wx' });
    return { url: '/share/' + id, expiresAt: meta.expiresAt };
  } catch (error) {
    await reader?.cancel().catch(() => {}); await rm(dir, { recursive: true, force: true }); throw error;
  } finally { state.active--; reader?.releaseLock(); }
}
export async function readShare(id: string): Promise<ShareInfo> {
  if (hasObjectStorage()) {
    try { return await readObjectShare(id); }
    catch { throw new ShareError('This link is unavailable or has expired. Ask your friend to share it again.', 404); }
  }
  available(); const dir = directory(id);
  try {
    const meta: ShareInfo = JSON.parse(await readFile(path.join(dir, 'info.json'), 'utf8'));
    if (meta.expiresAt <= Date.now()) { await rm(dir, { recursive: true, force: true }); throw new Error('expired'); }
    if ((await stat(path.join(dir, 'session.zip'))).size !== meta.size) throw new Error('incomplete');
    return meta;
  } catch { throw new ShareError('This link is unavailable or has expired. Ask your friend to share it again.', 404); }
}
export async function shareDownload(id: string) {
  if (hasObjectStorage()) {
    try { return new Response(null, { status: 302, headers: { ...privateHeaders, Location: await objectDownload(id) } }); }
    catch { throw new ShareError('This link is unavailable or has expired. Ask your friend to share it again.', 404); }
  }
  const meta = await readShare(id);
  const stream = Readable.toWeb(createReadStream(path.join(directory(id), 'session.zip'))) as ReadableStream<Uint8Array>;
  return new Response(stream, { headers: { ...privateHeaders, 'Content-Type': 'application/zip', 'Content-Length': String(meta.size), 'Content-Disposition': 'attachment; filename="' + meta.name + '"' } });
}
export function shareFailure(error: unknown) {
  return Response.json({ error: error instanceof ShareError ? error.message : 'The temporary sharing cache is unavailable. Please download the session instead.' }, { status: error instanceof ShareError ? error.status : 503, headers: privateHeaders });
}
