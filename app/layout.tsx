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
  title: "MassClip - Premium Content Vault",
  description: "The #1 clip vault for faceless creators",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
  generator: "v0.dev",
}

// Maintenance Mode Component
function MaintenanceMode() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="text-center px-6">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-light text-white mb-4">
            <span className="text-red-500">MASS</span>
            <span className="text-white">CLIP</span>
          </h1>
        </div>

        <div className="max-w-md mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-white mb-6">Under Maintenance</h2>

          <p className="text-white/70 text-lg mb-8 leading-relaxed">
            We're currently performing system updates to improve your experience. We'll be back online shortly.
          </p>

          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>

          <p className="text-white/50 text-sm">
            Follow us for updates:
            <a
              href="https://www.instagram.com/massclip.official"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 ml-2 transition-colors"
            >
              @massclip.official
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if maintenance mode is enabled
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true"

  return (
    <html lang="en" className="prevent-zoom">
      <head>
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
        {isMaintenanceMode ? (
          <MaintenanceMode />
        ) : (
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
        )}
        <Toaster />
      </body>
    </html>
  )
}
