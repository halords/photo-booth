/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    // Next's static rendering uses inline hydration scripts and inline styles.
    // Restrict connections and embedding without breaking camera/worker exports.
    const r2Origin = process.env.R2_ENDPOINT
      ? new URL(process.env.R2_ENDPOINT).origin
      : process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : 'https://*.r2.cloudflarestorage.com';
    const csp = [
      "default-src 'self'", "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "media-src 'self' blob:",
      `connect-src 'self' ${r2Origin}` + (process.env.NODE_ENV === 'development' ? ' ws: wss:' : ''),
      "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; ');
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
    ] }];
  },
};

export default nextConfig;
