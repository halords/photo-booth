import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pocket. — Your personal photo booth',
  description: 'Capture, personalize, and keep your favorite moments. Your own photo booth, with beautiful strips, filters, and a private gallery.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pocket',
  },
  openGraph: {
    title: 'Pocket Photo Booth',
    description: 'Your personal photo booth, with custom 4R event prints and a private gallery.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f6f2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
