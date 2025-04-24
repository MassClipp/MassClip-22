import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DownloadLimitProvider>{children}</DownloadLimitProvider>
}
