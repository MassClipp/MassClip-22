import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/providers/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MassClip - Premium Content Platform",
  description: "Discover and purchase premium video content from top creators",
  keywords: ["video", "content", "premium", "creators", "streaming"],
  authors: [{ name: "MassClip Team" }],
  openGraph: {
    title: "MassClip - Premium Content Platform",
    description: "Discover and purchase premium video content from top creators",
    url: "https://massclip.pro",
    siteName: "MassClip",
    images: [
      {
        url: "https://massclip.pro/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MassClip - Premium Content Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MassClip - Premium Content Platform",
    description: "Discover and purchase premium video content from top creators",
    images: ["https://massclip.pro/og-image.jpg"],
  },
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
  verification: {
    google: "your-google-verification-code",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
