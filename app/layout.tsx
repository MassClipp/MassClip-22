import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import "./tiktok-restrictions.css"
import "./watermark.css"
import { DownloadLimitProvider } from "@/contexts/download-limit-context"
import { TikTokBrowserBanner } from "@/components/tiktok-browser-banner"
import { FullscreenBlocker } from "@/components/fullscreen-blocker"
import { ZoomPrevention } from "@/components/zoom-prevention"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MassClip - Premium Content Vault",
  description: "The #1 clip vault for faceless creators",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add Vimeo Player API */}
        <script src="https://player.vimeo.com/api/player.js" async></script>

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
      <body className={inter.className}>
        <AuthProvider>
          <DownloadLimitProvider>
            <ZoomPrevention />
            <FullscreenBlocker />
            <TikTokBrowserBanner />
            {children}
          </DownloadLimitProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
