import type React from "react"
import { DownloadLimitProvider } from "@/components/providers/download-limit-provider"
import { RedirectHelper } from "@/components/redirect-helper"
import Logo from "@/components/logo"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DownloadLimitProvider>
      <RedirectHelper />
      {children}
      <footer className="mt-4 py-4 border-t border-zinc-800/30 text-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo href="/" size="sm" />
          </div>
          <div>
            <a href="mailto:john@massclip.pro" className="text-zinc-400 hover:text-white transition-colors">
              john@massclip.pro
            </a>
          </div>
        </div>
      </footer>
    </DownloadLimitProvider>
  )
}
