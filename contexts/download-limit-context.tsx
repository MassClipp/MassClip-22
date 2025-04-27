"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useUserPlan } from "@/hooks/use-user-plan"

interface DownloadLimitContextType {
  hasReachedLimit: boolean
  remainingDownloads: number
  refreshLimitStatus: () => Promise<void>
}

const DownloadLimitContext = createContext<DownloadLimitContextType | undefined>(undefined)

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [remainingDownloads, setRemainingDownloads] = useState(5) // Default to 5 total downloads
  const { isProUser, planData } = useUserPlan()

  // Simple function to refresh the download limit status - for UI display only
  const refreshLimitStatus = async () => {
    if (isProUser) {
      setHasReachedLimit(false)
      setRemainingDownloads(Number.POSITIVE_INFINITY)
      return
    }

    if (planData) {
      const remaining = Math.max(0, planData.downloadsLimit - planData.downloads)
      setRemainingDownloads(remaining)
      setHasReachedLimit(remaining <= 0)
    }
  }

  // Initialize and update when planData changes
  useEffect(() => {
    refreshLimitStatus()
  }, [isProUser, planData])

  return (
    <DownloadLimitContext.Provider value={{ hasReachedLimit, remainingDownloads, refreshLimitStatus }}>
      {children}
    </DownloadLimitContext.Provider>
  )
}

export function useDownloadLimit() {
  const context = useContext(DownloadLimitContext)
  if (context === undefined) {
    throw new Error("useDownloadLimit must be used within a DownloadLimitProvider")
  }
  return context
}
