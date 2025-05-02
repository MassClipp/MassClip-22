import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"
// Import the DownloadLimitProvider
import { DownloadLimitProvider } from "@/contexts/download-limit-context"

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
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <DownloadLimitProvider>
            {/* Rest of your layout */}
            {children}
          </DownloadLimitProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}

// Triggering preview deployment
// Triggering preview deployment 2
// Triggering preview deployment 3
//triggering preview deployment 4
// Triggering preview deployment 5
// Triggering preview deployment 6
// Triggering preview deployment 7
// Triggering preview deployment 8 - test