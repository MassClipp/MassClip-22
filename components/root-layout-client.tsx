"use client"

import type React from "react"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"
import { DownloadLimitProvider } from "@/contexts/download-limit-context"
import { TikTokBrowserBanner } from "@/components/tiktok-browser-banner"
import { FullscreenBlocker } from "@/components/fullscreen-blocker"
import { ZoomPrevention } from "@/components/zoom-prevention"
import { useEffect } from "react"
import { getAuth, getRedirectResult } from "firebase/auth"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  useEffect(() => {
    // Handle redirect result from Google Sign In
    const handleRedirectResult = async () => {
      try {
        const auth = getAuth()
        const result = await getRedirectResult(auth)

        if (result) {
          console.log("Successfully signed in after redirect")
          window.location.href = "/dashboard"
        }
      } catch (error) {
        console.error("Error handling redirect result:", error)
      }
    }

    handleRedirectResult()
  }, [])

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
