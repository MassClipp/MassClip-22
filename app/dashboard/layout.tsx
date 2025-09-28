"use client"
import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"
import { Toaster } from "@/components/ui/toaster"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { TopHeader } from "@/components/top-header"
import { useIsMobile } from "@/hooks/use-mobile"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()

  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      <div className="flex min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
        {/* Fixed noise overlay */}
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light pointer-events-none z-0"></div>

        {/* Top Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <TopHeader />
        </div>

        {/* Dashboard Sidebar - Hide on mobile */}
        {!isMobile && (
          <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] z-40">
            <DashboardSidebar />
          </div>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 ${isMobile ? "ml-0" : "ml-64"} pt-16 min-h-screen relative z-10`}>
          <div className="h-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">{children}</div>
        </div>
      </div>
      <Toaster />
    </DownloadLimitProvider>
  )
}
