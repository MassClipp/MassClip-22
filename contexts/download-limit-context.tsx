"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"

interface DownloadLimitContextType {
  hasReachedLimit: boolean
  remainingDownloads: number
  isProUser: boolean
  forceRefresh: () => void
  loading: boolean
}

const DownloadLimitContext = createContext<DownloadLimitContextType>({
  hasReachedLimit: false,
  remainingDownloads: 999999, // Temporarily unlimited
  isProUser: true, // Temporarily treat all users as pro
  forceRefresh: () => {},
  loading: false,
})

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [remainingDownloads, setRemainingDownloads] = useState(999999) // Temporarily unlimited
  const [isProUser, setIsProUser] = useState(true) // Temporarily treat all as pro
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [loading, setLoading] = useState(false) // Temporarily no loading

  // Force a refresh of the limit status
  const forceRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, [])

  // Temporarily disable download limits for all users
  useEffect(() => {
    // Set unlimited downloads for all users temporarily
    setHasReachedLimit(false)
    setRemainingDownloads(999999)
    setIsProUser(true)
    setLoading(false)
  }, [user, refreshCounter])

  return (
    <DownloadLimitContext.Provider
      value={{
        hasReachedLimit: false, // Temporarily no limits
        remainingDownloads: 999999, // Temporarily unlimited
        isProUser: true, // Temporarily treat all as pro
        forceRefresh,
        loading: false,
      }}
    >
      {children}
    </DownloadLimitContext.Provider>
  )
}

export function useDownloadLimit() {
  return useContext(DownloadLimitContext)
}
