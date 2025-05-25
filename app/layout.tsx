import type React from "react"
import type { Metadata } from "next"
import RootLayoutClient from "@/components/root-layout-client"
import "./globals.css"
import "./tiktok-restrictions.css"
import "./watermark.css"

export const metadata: Metadata = {
  title: "MassClip - Premium Content Vault",
  description: "The #1 clip vault for faceless creators",
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <RootLayoutClient>{children}</RootLayoutClient>
}
