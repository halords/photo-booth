import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'node:crypto';

const TTL = 24 * 60 * 60 * 1000, MAX_FILE = 250 * 1024 * 1024;
export const hasObjectStorage = () => process.env.BOOTH_SHARE_STORAGE !== 'local' && !!(process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID || process.env.R2_BUCKET_NAME || process.env.R2_ACCESS_KEY_ID || process.env.R2_SECRET_ACCESS_KEY);
let client: S3Client | undefined;
function storage() {
  const { R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
  if ((!R2_ACCOUNT_ID && !R2_ENDPOINT) || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error('R2 storage configuration is incomplete.');
  const endpoint = new URL(R2_ENDPOINT || 'https://' + R2_ACCOUNT_ID + '.r2.cloudflarestorage.com');
  // Cloudflare sometimes displays an S3 URL ending with the bucket name.
  if (endpoint.pathname === '/' + R2_BUCKET_NAME) endpoint.pathname = '/';
  client ||= new S3Client({ region: 'auto', endpoint: endpoint.toString(), forcePathStyle: true,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  return { client, bucket: R2_BUCKET_NAME };
}
function objectKey(id: string) {
  if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('Invalid link.');
  return 'sessions/' + id + '.zip';
}
export async function prepareObjectUpload(name: string, size: number) {
  if (!Number.isSafeInteger(size) || size < 22 || size > MAX_FILE) throw new Error('Invalid session size.');
  const { client, bucket } = storage(), id = randomBytes(24).toString('hex');
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: objectKey(id), ContentType: 'application/zip', ContentLength: size,
    CacheControl: 'private, no-store', Metadata: { filename: name } }), { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']) });
  return { storage: 'r2', id, uploadUrl, url: '/share/' + id, headers: { 'Content-Type': 'application/zip', 'Cache-Control': 'private, no-store' }, expiresAt: Date.now() + TTL };
}
export async function readObjectShare(id: string) {
  const { client, bucket } = storage();
  const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey(id) }));
  const expiresAt = (object.LastModified?.getTime() || 0) + TTL, size = object.ContentLength || 0;
  if (expiresAt <= Date.now() || size < 22 || size > MAX_FILE || object.ContentType !== 'application/zip') throw new Error('Expired or invalid session.');
  const name = (object.Metadata?.filename || 'photo-booth.zip').replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 104);
  return { name, size, expiresAt };
}
export async function objectDownload(id: string) {
  const meta = await readObjectShare(id), { client, bucket } = storage();
  const seconds = Math.min(300, Math.floor((meta.expiresAt - Date.now()) / 1000));
  if (seconds < 1) throw new Error('Expired session.');
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey(id), ResponseContentType: 'application/zip',
    ResponseContentDisposition: 'attachment; filename="' + meta.name + '"', ResponseCacheControl: 'private, no-store' }), { expiresIn: seconds });
}
