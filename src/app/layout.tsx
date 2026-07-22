import type { Metadata } from 'next';
import './globals.css';
import './auth.css';

export const metadata: Metadata = {
  title: 'OpportunityOS AI — Your AI Chief Opportunity Officer',
  description:
    'Discover, prioritize, prepare for, and win life-changing opportunities with the world\'s first AI Chief Opportunity Officer. Powered by OpportunityOS AI.',
  keywords: [
    'scholarship finder',
    'AI scholarship',
    'opportunity discovery',
    'fellowship finder',
    'grant finder',
    'AI career coach',
    'application builder',
    'scholarship success',
  ],
  authors: [{ name: 'OpportunityOS AI' }],
  metadataBase: new URL('https://opportunityos.ai'),
  openGraph: {
    title: 'OpportunityOS AI — Your AI Chief Opportunity Officer',
    description: 'The world\'s first AI platform that helps you discover and WIN life-changing opportunities.',
    url: 'https://opportunityos.ai',
    siteName: 'OpportunityOS AI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpportunityOS AI',
    description: 'Your AI Chief Opportunity Officer. From discovery to acquisition.',
    creator: '@opportunityos',
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
        <Providers>
          <Analytics />
          <CommandPalette />
          {children}
        </Providers>
      </body>
    </html>
  );
}

