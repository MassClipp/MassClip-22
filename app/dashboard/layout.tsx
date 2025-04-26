import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { MobileReloadEnforcer } from "@/components/mobile-reload-enforcer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <MobileReloadEnforcer />
      {children}
    </DownloadLimitProvider>
  )
}
