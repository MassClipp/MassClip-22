import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"
import { Toaster } from "@/components/ui/toaster"
import VexChat from "@/components/vex-chat"
import { TrialStatusBanner } from "@/components/trial-status-banner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      <TrialStatusBanner />
      <VexChat>{children}</VexChat>
      <Toaster />
    </DownloadLimitProvider>
  )
}
