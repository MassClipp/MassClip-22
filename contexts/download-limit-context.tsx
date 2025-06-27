"use client"

import React from "react"

type DownloadLimitState = {
  remainingDownloads: number
  decrement: () => void
}

const DownloadLimitContext = React.createContext<DownloadLimitState | null>(null)

/**
 * TEMPORARY override: all users have unlimited downloads.
 * Revert by restoring the original logic & limits.
 */
export function DownloadLimitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const state = React.useMemo<DownloadLimitState>(
    () => ({
      remainingDownloads: Number.POSITIVE_INFINITY,
      decrement: () => {
        /* no-op while limits disabled */
      },
    }),
    [],
  )

  return <DownloadLimitContext.Provider value={state}>{children}</DownloadLimitContext.Provider>
}

export function useDownloadLimit() {
  const ctx = React.useContext(DownloadLimitContext)
  if (!ctx) {
    throw new Error("useDownloadLimit must be used within a DownloadLimitProvider")
  }
  return ctx
}
