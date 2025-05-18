import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"
import { SidebarNavigation } from "@/components/sidebar-navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      <div className="min-h-screen bg-black">
        <SidebarNavigation />
        <div className="md:pl-64">
          <main className="py-6 px-4 md:px-8">{children}</main>
          <footer className="mt-4 py-4 border-t border-zinc-800/30 text-center hidden md:block">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <a href="/" className="text-zinc-400 hover:text-white transition-colors">
                  MassClip
                </a>
              </div>
              <div>
                <a href="mailto:john@massclip.pro" className="text-zinc-400 hover:text-white transition-colors">
                  john@massclip.pro
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </DownloadLimitProvider>
  )
}
