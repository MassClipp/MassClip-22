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

// Inside your RootLayout component, wrap the children with DownloadLimitProvider
// This is a simplified example - make sure to keep all your existing providers
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
            {/* Your existing layout structure */}
            {children}
          </DownloadLimitProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
