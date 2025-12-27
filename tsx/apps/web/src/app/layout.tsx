import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
    { media: '(prefers-color-scheme: light)', color: '#0F172A' },
  ],
};

export const metadata: Metadata = {
  title: 'Aurastream — Your stream. Your brand. Every platform.',
  description: 'Thumbnails, overlays, banners, and more — all matching your style, ready in seconds. No templates. No Photoshop. Just you.',
  openGraph: {
    title: 'Aurastream',
    description: 'Your stream. Your brand. Every platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurastream',
    description: 'Your stream. Your brand. Every platform.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
