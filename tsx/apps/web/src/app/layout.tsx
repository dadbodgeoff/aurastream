import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Bebas_Neue, Oswald, Anton, Black_Ops_One, Russo_One, Orbitron, Press_Start_2P, Bangers, Permanent_Marker, Creepster } from 'next/font/google';
import './globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const poppins = Poppins({ weight: ['400', '600', '700', '900'], subsets: ['latin'], variable: '--font-poppins' });
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const oswald = Oswald({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-oswald' });
const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' });
const blackOpsOne = Black_Ops_One({ weight: '400', subsets: ['latin'], variable: '--font-blackops' });
const russoOne = Russo_One({ weight: '400', subsets: ['latin'], variable: '--font-russo' });
const orbitron = Orbitron({ weight: ['400', '700', '900'], subsets: ['latin'], variable: '--font-orbitron' });
const pressStart2P = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-pressstart' });
const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' });
const permanentMarker = Permanent_Marker({ weight: '400', subsets: ['latin'], variable: '--font-marker' });
const creepster = Creepster({ weight: '400', subsets: ['latin'], variable: '--font-creepster' });

// Combined font classes for body
const fontVariables = [
  inter.variable,
  poppins.variable,
  bebasNeue.variable,
  oswald.variable,
  anton.variable,
  blackOpsOne.variable,
  russoOne.variable,
  orbitron.variable,
  pressStart2P.variable,
  bangers.variable,
  permanentMarker.variable,
  creepster.variable,
].join(' ');

// Site configuration
const siteConfig = {
  name: 'AuraStream',
  title: 'AuraStream — Your stream. Your brand. Every platform.',
  description: 'AI-powered thumbnails, overlays, banners, emotes, and more — all matching your style, ready in seconds. No templates. No Photoshop. Just you.',
  url: 'https://aurastream.shop',
  ogImage: 'https://aurastream.shop/og-image.png',
  twitterHandle: '@aurastream',
};

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
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'stream assets',
    'twitch emotes',
    'youtube thumbnails',
    'stream overlays',
    'AI graphics',
    'content creator tools',
    'streamer branding',
    'twitch banners',
    'gaming graphics',
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  
  // Open Graph (Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - AI-powered stream assets`,
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  },
  
  // Icons - place these files in /public folder
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  
  // Manifest for PWA
  manifest: '/site.webmanifest',
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${fontVariables} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
