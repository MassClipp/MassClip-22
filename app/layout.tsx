import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"
import "./globals.css"
import "./tiktok-restrictions.css"
import "./watermark.css"
import { DownloadLimitProvider } from "@/contexts/download-limit-context"
import { TikTokBrowserBanner } from "@/components/tiktok-browser-banner"
import { FullscreenBlocker } from "@/components/fullscreen-blocker"
import { ZoomPrevention } from "@/components/zoom-prevention"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "MassClip: Sell Your Content Seriously",
    template: "%s | MassClip - Faceless Creator Platform",
  },
  description:
    "The #1 clip vault for faceless creators. Monetize your anonymous content, build your audience, and sell digital products without showing your face. Join thousands of successful faceless creators.",
  keywords: [
    "faceless creators",
    "anonymous content",
    "digital products",
    "content monetization",
    "clip vault",
    "faceless YouTube",
    "anonymous creator platform",
  ],
  authors: [{ name: "MassClip" }],
  creator: "MassClip",
  publisher: "MassClip",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://massclip.pro",
    siteName: "MassClip",
    title: "MassClip: The #1 Platform for Faceless Creators",
    description:
      "Monetize your anonymous content and build your audience without showing your face. Join thousands of successful faceless creators.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MassClip - Faceless Creator Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MassClip: The #1 Platform for Faceless Creators",
    description: "Monetize your anonymous content and build your audience without showing your face.",
    images: ["/og-image.png"],
    creator: "@massclip",
    site: "@massclip",
  },
  alternates: {
    canonical: "https://massclip.pro",
  },
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
  generator: "v0.dev",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="prevent-zoom">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MassClip",
              description: "The #1 platform for faceless creators to monetize anonymous content",
              url: "https://massclip.pro",
              logo: "https://massclip.pro/favicon.png",
              sameAs: ["https://twitter.com/massclip"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                email: "support@massclip.pro",
              },
              foundingDate: "2024",
              knowsAbout: [
                "Content Creation",
                "Digital Marketing",
                "Faceless Content",
                "Video Production",
                "Content Monetization",
              ],
              areaServed: "Worldwide",
              serviceType: "Digital Content Platform",
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "MassClip",
              url: "https://massclip.pro",
              description: "The #1 platform for faceless creators to monetize anonymous content",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://massclip.pro/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "MassClip",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "1250",
              },
            }),
          }}
        />

        {/* Add Vimeo Player API */}
        <script src="https://player.vimeo.com/api/player.js" async></script>

        {/* Static viewport meta tag as a fallback */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"
        />

        {/* Load zoom prevention script before anything else */}
        <Script src="/zoom-prevention.js" strategy="beforeInteractive" id="zoom-prevention-script" />

        {/* Simple TikTok detection script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // Detect TikTok browser and add class to html element
            (function() {
              try {
                const ua = navigator.userAgent.toLowerCase();
                if (ua.includes('tiktok') || ua.includes('musical_ly') || ua.includes('bytedance')) {
                  document.documentElement.classList.add('tiktok-browser');
                }
              } catch (e) {
                console.error('Error in TikTok detection:', e);
              }
            })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} prevent-zoom`}>
        <Providers>
          <AuthProvider>
            <DownloadLimitProvider>
              <ZoomPrevention />
              <FullscreenBlocker />
              <TikTokBrowserBanner />
              {children}
            </DownloadLimitProvider>
          </AuthProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
