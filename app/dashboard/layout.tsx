import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      {children}
    </DownloadLimitProvider>
  )
}
