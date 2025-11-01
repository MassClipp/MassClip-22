"use client"

import type { ReactNode } from "react"
import { DownloadLimitProvider as DLProvider } from "@/contexts/download-limit-context"

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  return <DLProvider>{children}</DLProvider>
}
