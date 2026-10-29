# Temporary sharing with Cloudflare R2

The application needs no photo database. It keeps sessions in browser Cache Storage. When a guest chooses **Create 24-hour link**, their browser uploads one ZIP directly to a private R2 bucket. The public app only issues short-lived upload/download signatures and checks object metadata. Large originals do not pass through Vercel's function body limit.

## Connect your existing bucket

1. In Cloudflare R2, create an **R2 API token**, choose **Object Read & Write**, and scope it to this bucket only. Use the generated **Access Key ID** and **Secret Access Key**, not a general Cloudflare API token. Leave public bucket access disabled.
2. Copy `.env.example` to `.env.local` for local work, or add these names under **Vercel → Project → Settings → Environment Variables**:

   ```env
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_BUCKET_NAME=your-bucket-name
   R2_ACCESS_KEY_ID=your-r2-access-key-id
   R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
   ```

   Never prefix these with `NEXT_PUBLIC_`. `.env.local` is ignored by Git. Restart the local server or redeploy Vercel after changes. For a jurisdiction-specific bucket, set `R2_ENDPOINT` to the S3 API endpoint shown in that bucket's dashboard.

3. In the bucket's **Settings → CORS policy**, paste [config/r2-cors.json](../config/r2-cors.json). The example includes `https://photo-booth-theta-fawn.vercel.app`, localhost:3000, and localhost:3091. Replace these when using a different deployment. Keep the localhost entry only if needed; adjust its port to your dev server. Add a custom domain or preview deployment only when you use it. Origins have no trailing slash or path. The browser needs `PUT` and request headers allowed for direct uploads.
4. In **Settings → Object lifecycle rules**, add an enabled rule named `Expire photo booth sessions after one day`, prefix **`sessions/`**, and delete objects **one day after creation**. [config/r2-lifecycle.json](../config/r2-lifecycle.json) is the equivalent S3 lifecycle configuration. If the bucket already has rules, add this rule without replacing unrelated rules.
5. Create a session, create a link, open it in a different browser, and download the ZIP. Verify the layout, individual photos, and GIF. Check that the object is under `sessions/` in R2 and that the lifecycle rule is enabled.

## Expiration and limits

- Upload URLs expire after five minutes and are signed for the expected content length and type. A session is limited to 250 MB for link sharing. Larger sessions can still be downloaded locally.
- The app checks the object's creation time before offering a download and refuses access after 24 hours. Download URLs expire within five minutes, or at the session expiration if sooner. The bucket stays private. Friends see a preview gallery and can download individual originals, the layout, or the GIF. The gallery reads uncompressed entries from a browser Blob without copying or inflating all original files. Sessions up to 30 MB load automatically; larger ones require a Preview photos click.
- R2 lifecycle deletion is asynchronous; it can occur after the exact 24-hour boundary. The app enforces the access deadline independently. The lifecycle rule is required for actual deletion; the app does not change your bucket settings automatically.
- Anyone with the app link can download the folder before expiration. Files already downloaded by friends remain on their devices.
- The upload endpoint has a basic per-process rate limit. For a public event or high-traffic deployment, apply a shared rate limit in Cloudflare/Vercel at `/api/shares`. Configure billing alerts in your account as needed.
- New sessions are never written to IndexedDB. Existing galleries from older versions remain readable. Download important sessions: browsers may evict local cache.

## Local server fallback

Without R2 configuration, `next start` uses `pocket-photo-booth-shares` inside the OS temporary directory. Set `BOOTH_SHARE_DIR` to a writable directory when needed. Local files expire after 24 hours; cleanup runs on access, upload, and every 15 minutes while the server is running. Interrupted uploads are cleaned up after an hour. The cache allows at most 1 GB per process's accounting, with up to three active uploads.

This fallback is for a single Node server. If several server processes serve requests, the directory must be shared, and quotas/rate limits should be enforced at the host. Do not use a function-local `/tmp` as shared storage on Vercel. The app refuses the unconfigured serverless fallback and offers ZIP downloads instead. Friends need a reachable public HTTPS app URL; a `localhost` link works only on the booth computer.

R2 is selected when any R2 variable is present, unless `BOOTH_SHARE_STORAGE=local`. Supply the endpoint (or account ID), bucket name, and both credentials; an incomplete configuration does not silently fall back to local storage. Existing local-server links are not migrated when switching storage backends.
