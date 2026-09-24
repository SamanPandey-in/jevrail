import React from "react"
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { GeistPixelLine } from 'geist/font/pixel'
import { Analytics } from '@vercel/analytics/next'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, X_HANDLE } from '@/lib/site'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains'
});

const DEFAULT_TITLE = `${SITE_NAME} | Safe autonomy for AI agents`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "AI agent safety",
    "coding agent guardrails",
    "Claude Code",
    "opencode",
    "Codex",
    "shell command safety",
    "LLM tool use",
    "jevrail",
  ],
  generator: 'v0.app',
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    // Placeholder — drop the real social-preview image at /public/og.png
    // (1200x630 recommended) and this starts resolving automatically via
    // metadataBase. No code changes needed once the file exists.
    images: [{ url: '/og.png', width: 1200, height: 630, alt: DEFAULT_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    site: X_HANDLE,
    images: ['/og.png'],
  },
  icons: {
    icon: [
      {
        url: '/light-icon.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/dark-icon.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${GeistPixelLine.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
