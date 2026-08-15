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
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  } : undefined,
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
import { GoogleAnalytics } from '@next/third-parties/google';

import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

import { AuthProvider } from '@/components/auth/AuthProvider';
import { ProfileProvider } from '@/components/auth/ProfileContext';
import { DialogProvider } from '@/components/ui/DialogProvider';
import Script from 'next/script';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head />
      <body className={process.env.NEXT_PUBLIC_PRESENTATION_MODE === 'true' ? 'presentation-mode' : ''}>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers>
          <DialogProvider>
            <AuthProvider>
              <ProfileProvider>
                <Analytics />
                <CommandPalette />
                {children}
              </ProfileProvider>
            </AuthProvider>
          </DialogProvider>
        </Providers>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

