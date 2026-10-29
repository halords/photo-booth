// Explicitly invoked connection check. Uses only synthetic artifacts from session-smoke.
// Leave the object for visual bucket verification; --delete removes only this recorded test.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { loadEnvConfig } = require('@next/env');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetBucketCorsCommand, GetBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
loadEnvConfig(process.cwd());
const { R2_ENDPOINT, R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
const artifact = path.resolve('.artifacts/r2-live-test.json');
const endpoint = new URL(R2_ENDPOINT || 'https://' + R2_ACCOUNT_ID + '.r2.cloudflarestorage.com');
endpoint.pathname = '/';
const client = new S3Client({ region: 'auto', endpoint: endpoint.toString(), credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
(async () => {
  assert(R2_BUCKET_NAME && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY, 'Configure local R2 variables first.');
  if (process.argv.includes('--delete')) {
    const test = JSON.parse(fs.readFileSync(artifact));
    assert.equal(test.bucket, R2_BUCKET_NAME); assert.match(test.key, /^sessions\/[a-f0-9]{48}\.zip$/); assert.equal(test.purpose, 'synthetic-photo-booth-connection-test');
    await client.send(new DeleteObjectCommand({ Bucket: test.bucket, Key: test.key }));
    try { await client.send(new HeadObjectCommand({ Bucket: test.bucket, Key: test.key })); throw new Error('Test object still exists.'); }
    catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
    fs.writeFileSync(artifact, JSON.stringify({ ...test, deleted: true }, null, 2));
    console.log('Deleted and verified absent: ' + test.key); return;
  }
  if (fs.existsSync(artifact) && !JSON.parse(fs.readFileSync(artifact)).deleted) throw new Error('A test object is already recorded. Verify or delete it before creating another.');
  const body = fs.readFileSync(path.resolve('.artifacts/sessions/different-strips.zip'));
  const key = 'sessions/' + crypto.randomBytes(24).toString('hex') + '.zip';
  const filename = 'photobooth-connection-test.zip';
  const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: 'application/zip', ContentLength: body.length,
    CacheControl: 'private, no-store', Metadata: { filename } }), { expiresIn: 300, signableHeaders: new Set(['content-type', 'content-length']) });
  const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/zip', 'Cache-Control': 'private, no-store' }, body });
  if (!upload.ok) {
    const xml = await upload.text(), code = /<Code>([^<]+)<\/Code>/.exec(xml)?.[1] || 'UploadRejected';
    const message = /<Message>([^<]+)<\/Message>/.exec(xml)?.[1] || '';
    throw new Error('R2 returned HTTP ' + upload.status + ' / ' + code + ': ' + message);
  }
  const test = { bucket: R2_BUCKET_NAME, key, filename, purpose: 'synthetic-photo-booth-connection-test', size: body.length, uploadedAt: new Date().toISOString(), deleted: false };
  fs.writeFileSync(artifact, JSON.stringify(test, null, 2));
  const head = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  assert.equal(head.ContentLength, body.length); assert.equal(head.ContentType, 'application/zip');
  const downloadUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }), { expiresIn: 60 });
  const downloaded = await fetch(downloadUrl); assert.equal(downloaded.status, 200); assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), body);
  console.log('PASS: R2 signed upload, metadata, and byte-for-byte signed download.');
  console.log(JSON.stringify(test, null, 2));
  const settings = await Promise.allSettled([
    client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME })),
    client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: R2_BUCKET_NAME })),
  ]);
  settings.forEach((result, index) => console.log((index ? 'Lifecycle: ' : 'CORS: ') + (result.status === 'fulfilled' ? JSON.stringify(index ? result.value.Rules : result.value.CORSRules) : 'Could not read (' + result.reason.name + '). Verify in Cloudflare dashboard.')));
})().catch(error => {
  let message = String(error.message || error.name);
  for (const secret of [R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]) if (secret) message = message.split(secret).join('[redacted]');
  console.error(message); process.exitCode = 1;
}).finally(() => client.destroy());
