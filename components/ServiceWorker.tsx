'use client';

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // Prevent an old installed shell from intercepting development requests.
      void navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          if (registration.active?.scriptURL === new URL('/sw.js', location.href).href) void registration.unregister();
        }
      });
      return;
    }
    const register = () => { void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {}); };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}
