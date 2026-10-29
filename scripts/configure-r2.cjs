// Merge the photobooth's CORS and lifecycle rules without replacing other rules.
const { loadEnvConfig } = require('@next/env');
const { S3Client, GetBucketCorsCommand, PutBucketCorsCommand, GetBucketLifecycleConfigurationCommand, PutBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');
loadEnvConfig(process.cwd());
const env = process.env, bucket = env.R2_BUCKET_NAME;
const origins = process.argv.slice(2).map(value => {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS, or localhost for local testing.');
  return url.origin;
});
if (!origins.length) throw new Error('Supply the app origin(s) to allow.');
const endpoint = new URL(env.R2_ENDPOINT || 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com'); endpoint.pathname = '/';
const client = new S3Client({ region: 'auto', endpoint: endpoint.toString(), credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
(async () => {
  let cors = [], lifecycle = [];
  try { cors = (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules || []; } catch (error) { if (error.name !== 'NoSuchCORSConfiguration') throw error; }
  try { lifecycle = (await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))).Rules || []; } catch (error) { if (error.name !== 'NoSuchLifecycleConfiguration') throw error; }
  const existing = cors.find(rule => rule.ID === 'pocket-photo-booth');
  const nextCors = { ID: 'pocket-photo-booth', AllowedOrigins: [...new Set([...(existing?.AllowedOrigins || []), ...origins])], AllowedMethods: ['PUT', 'GET', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 };
  const rule = { ID: 'pocket-photo-booth-expire-sessions', Status: 'Enabled', Filter: { Prefix: 'sessions/' }, Expiration: { Days: 1 } };
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [...cors.filter(rule => rule.ID !== nextCors.ID), nextCors] } }));
  await client.send(new PutBucketLifecycleConfigurationCommand({ Bucket: bucket, LifecycleConfiguration: { Rules: [...lifecycle.filter(item => item.ID !== rule.ID), rule] } }));
  const verifiedCors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  const verifiedLifecycle = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
  if (!verifiedCors.CORSRules?.some(item => origins.every(origin => item.AllowedOrigins.includes(origin)))) throw new Error('Could not verify CORS.');
  if (!verifiedLifecycle.Rules?.some(item => item.ID === rule.ID && item.Expiration?.Days === 1)) throw new Error('Could not verify lifecycle.');
  console.log('Verified CORS origins: ' + nextCors.AllowedOrigins.join(', '));
  console.log('Verified one-day deletion rule for sessions/. Existing unrelated rules preserved.');
})().catch(error => { console.error(error.name + ': bucket configuration could not be completed. Check bucket-management permission in Cloudflare.'); process.exitCode = 1; }).finally(() => client.destroy());
