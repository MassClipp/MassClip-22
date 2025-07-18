import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import { AuthProvider } from "@/contexts/auth-context"
import { DownloadLimitProvider } from "@/contexts/download-limit-context"
import { TikTokBrowserBanner } from "@/components/tiktok-browser-banner"
import { ZoomPrevention } from "@/components/zoom-prevention"
import { FullscreenBlocker } from "@/components/fullscreen-blocker"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
import "./tiktok-restrictions.css"
import "./watermark.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MassClip - Premium Content Vault",
  description: "The #1 clip vault for faceless creators",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="prevent-zoom">
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
