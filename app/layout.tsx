import type React from "react"
import type { Metadata } from "next"
import { Inter, League_Spartan } from "next/font/google"
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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-league-spartan",
})

export const metadata: Metadata = {
  title: {
    default: "MassClip - Passive Income From Your Faceless Content",
    template: "%s | MassClip",
  },
  description:
    "MassClip's Vex AI analyzes your content, organizes it intelligently, and helps you create sellable bundles in seconds. Upload videos, clips, templates, and resources—let Vex handle the organization, pricing, and packaging. The smartest way for creators to sell content tools and resources.",
  keywords: [
    "AI content organization",
    "MassClip",
    "Vex AI",
    "content creator tools",
    "sell video clips",
    "sell templates",
    "AI-powered bundling",
    "content monetization",
    "creator marketplace",
    "viral clips",
    "b-roll footage",
    "clip templates",
    "carousel templates",
    "SFX marketplace",
    "audio resources",
    "short-form content tools",
    "AI content assistant",
    "smart content packaging",
    "creator resources",
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
    title: "MassClip - AI-Powered Content Organization & Sales Platform",
    description:
      "MassClip's Vex AI analyzes your content, organizes it intelligently, and helps you create sellable bundles in seconds. Upload clips, templates, and resources—let Vex handle everything. The smartest way to sell content tools.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MassClip - AI Content Organization Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MassClip - AI-Powered Content Organization & Sales Platform",
    description:
      "MassClip's Vex AI analyzes your content, organizes it intelligently, and helps you create sellable bundles in seconds. The smartest way for creators to sell content tools and resources.",
    images: ["/og-image.png"],
    creator: "@massclip",
    site: "@massclip",
  },
  alternates: {
    canonical: "https://massclip.pro",
  },
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
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
    <html lang="en" className={`prevent-zoom ${leagueSpartan.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "MassClip",
              description:
                "AI-powered content platform that helps creators organize, package, and sell content tools and resources with Vex AI assistant",
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
                "AI Content Organization",
                "Content Bundling",
                "Creator Tools",
                "Video Clips",
                "Templates",
                "Content Monetization",
                "Short-form Content",
              ],
              areaServed: "Worldwide",
              serviceType: "AI Content Organization Platform",
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
              description:
                "AI-powered content platform that helps creators organize, package, and sell content tools and resources",
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
              description:
                "AI content platform with Vex AI assistant for creators to organize and sell content tools and resources",
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
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* Load zoom prevention script before anything else */}
        <Script src="/zoom-prevention.js" strategy="beforeInteractive" id="zoom-prevention-script" />

        <script
          type="text/javascript"
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

        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1136266684699128');
            fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1136266684699128&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "tr9t8yy9cv");
            console.log("[v0] Microsoft Clarity initialized with ID: tr9t8yy9cv");
            `,
          }}
        />

        <link rel="preload" href="/og-image.png" as="image" />
        <link rel="dns-prefetch" href="https://player.vimeo.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
            .hero-text { font-display: swap; }
            .gradient-text { 
              background: linear-gradient(to bottom right, rgb(203 213 225), rgb(165 243 252), rgb(219 234 254), rgb(255 255 255));
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-fill-color: transparent;
            }
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
