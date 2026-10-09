import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import ServiceWorker from '@/components/ServiceWorker';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Booth — a pocket photo booth',
  description:
    'A pocket photo booth for iPhone — native camera capture, editorial photo strips, share anywhere.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Booth',
  },
};

export const viewport: Viewport = {
  themeColor: '#f7f3ea',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
