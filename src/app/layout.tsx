import type { Metadata } from 'next';
import './globals.css';
import './auth.css';
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  DEFAULT_DESCRIPTION,
  TWITTER_HANDLE,
  OG_IMAGE,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import JsonLd from '@/components/JsonLd';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'scholarship finder',
    'AI scholarship',
    'opportunity discovery',
    'fellowship finder',
    'grant finder',
    'AI career coach',
    'application builder',
    'hackathons',
    'remote jobs',
    'accelerators',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: 'Your AI Chief Opportunity Officer. From discovery to acquisition.',
    creator: TWITTER_HANDLE,
    images: [OG_IMAGE],
  },
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

export const viewport = {
  themeColor: '#020408',
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: users must be able to pinch-zoom (WCAG 1.4.4).
};

import Analytics from '@/components/Analytics';

import { Providers } from '@/components/Providers';
import { CommandPalette } from '@/components/ui/CommandPalette';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={process.env.NEXT_PUBLIC_PRESENTATION_MODE === 'true' ? 'presentation-mode' : ''}>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers>
          <Analytics />
          <CommandPalette />
          {children}
        </Providers>
      </body>
    </html>
  );
}

