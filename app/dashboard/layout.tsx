import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"
import DashboardSidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/header"
import { Toaster } from "@/components/ui/toaster"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      <div className="min-h-screen bg-black text-white flex flex-col">
        <DashboardHeader />
        <div className="flex-1 flex flex-col md:flex-row">
          <DashboardSidebar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">{children}</main>
        </div>
        <Toaster />
      </div>
    </DownloadLimitProvider>
  )
}
