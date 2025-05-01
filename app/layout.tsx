import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import "./tiktok-restrictions.css" // Add the TikTok restrictions CSS
// Import the DownloadLimitProvider
import { DownloadLimitProvider } from "@/contexts/download-limit-context"
import { TikTokBrowserBanner } from "@/components/tiktok-browser-banner"
// Make sure the import uses the named export
import { FullscreenBlocker } from "@/components/fullscreen-blocker"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MassClip - Premium Content Vault",
  description: "The #1 clip vault for faceless creators",
    generator: 'v0.dev'
}

// Then in your RootLayout component, wrap your content with it:
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

        {/* Add TikTok detection and protection script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            // Execute immediately to prevent fullscreen in TikTok
            (function() {
              try {
                const ua = navigator.userAgent.toLowerCase();
                if (ua.includes('tiktok') || ua.includes('musical_ly') || ua.includes('bytedance')) {
                  // Add a class to the HTML element for TikTok-specific styles
                  document.documentElement.classList.add('tiktok-browser');
                  
                  // Override fullscreen API
                  if (Element.prototype.requestFullscreen) {
                    const originalRequestFullscreen = Element.prototype.requestFullscreen;
                    Element.prototype.requestFullscreen = function() {
                      if (document.documentElement.classList.contains('tiktok-browser')) {
                        console.log('Fullscreen blocked in TikTok browser');
                        return Promise.reject(new Error('Fullscreen not allowed in TikTok browser'));
                      }
                      return originalRequestFullscreen.apply(this, arguments);
                    };
                  }
                  
                  // Also override the Fullscreen API methods
                  document.addEventListener('fullscreenchange', function(e) {
                    if (document.fullscreenElement && document.documentElement.classList.contains('tiktok-browser')) {
                      document.exitFullscreen().catch(err => console.log(err));
                    }
                  });
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
            <FullscreenBlocker />
            <TikTokBrowserBanner />
            {/* Rest of your layout */}
            {children}
          </DownloadLimitProvider>
        </AuthProvider>
        <Toaster />
        <TikTokBrowserBanner />
      </body>
    </html>
  )
}

// Triggering preview deployment - URL fix for production domain
