"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

interface DownloadLimitContextType {
  hasReachedLimit: boolean
  remainingDownloads: number
  isProUser: boolean
  forceRefresh: () => void
}

const DownloadLimitContext = createContext<DownloadLimitContextType>({
  hasReachedLimit: false,
  remainingDownloads: 5,
  isProUser: false,
  forceRefresh: () => {},
})

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [remainingDownloads, setRemainingDownloads] = useState(5)
  const [isProUser, setIsProUser] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Force a refresh of the limit status
  const forceRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, [])

  // Set up a real-time listener for user plan data
  useEffect(() => {
    if (!user) {
      setHasReachedLimit(false)
      setRemainingDownloads(5)
      setIsProUser(false)
      return
    }

    const userDocRef = doc(db, "users", user.uid)

    // Initial fetch
    getDoc(userDocRef)
      .then((doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const isPro = userData?.plan === "creator_pro"
          const downloads = userData.downloads || 0
          const limit = isPro ? Number.POSITIVE_INFINITY : 5

          setIsProUser(isPro)
          setRemainingDownloads(Math.max(0, limit - downloads))
          setHasReachedLimit(!isPro && downloads >= limit)
        }
      })
      .catch((err) => {
        console.error("Error fetching initial user plan:", err)
      })

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const isPro = userData?.plan === "creator_pro"
          const downloads = userData.downloads || 0
          const limit = isPro ? Number.POSITIVE_INFINITY : 5

          setIsProUser(isPro)
          setRemainingDownloads(Math.max(0, limit - downloads))
          setHasReachedLimit(!isPro && downloads >= limit)
        }
      },
      (error) => {
        console.error("Error in download limit listener:", error)
      },
    )

    return () => unsubscribe()
  }, [user, refreshCounter])

  return (
    <DownloadLimitContext.Provider
      value={{
        hasReachedLimit,
        remainingDownloads,
        isProUser,
        forceRefresh,
      }}
    >
      {children}
    </DownloadLimitContext.Provider>
  )
}

export function useDownloadLimit() {
  return useContext(DownloadLimitContext)
}
