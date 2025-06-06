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
  loading: boolean
}

const DownloadLimitContext = createContext<DownloadLimitContextType>({
  hasReachedLimit: false,
  remainingDownloads: 25,
  isProUser: false,
  forceRefresh: () => {},
  loading: true,
})

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [remainingDownloads, setRemainingDownloads] = useState(25)
  const [isProUser, setIsProUser] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [loading, setLoading] = useState(true)

  // Force a refresh of the limit status
  const forceRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, [])

  // Set up a real-time listener for user plan data
  useEffect(() => {
    if (!user) {
      setHasReachedLimit(false)
      setRemainingDownloads(25)
      setIsProUser(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const userDocRef = doc(db, "users", user.uid)

    // Initial fetch
    getDoc(userDocRef)
      .then((doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const isPro = userData?.plan === "creator_pro"
          const downloads = userData.downloads || 0
          const limit = isPro ? Number.POSITIVE_INFINITY : 25

          setIsProUser(isPro)
          setRemainingDownloads(Math.max(0, limit - downloads))
          setHasReachedLimit(!isPro && downloads >= limit)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching initial user plan:", err)
        setLoading(false)
      })

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const isPro = userData?.plan === "creator_pro"
          const downloads = userData.downloads || 0
          const limit = isPro ? Number.POSITIVE_INFINITY : 25

          setIsProUser(isPro)
          setRemainingDownloads(Math.max(0, limit - downloads))
          setHasReachedLimit(!isPro && downloads >= limit)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error in download limit listener:", error)
        setLoading(false)
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
        loading,
      }}
    >
      {children}
    </DownloadLimitContext.Provider>
  )
}

export function useDownloadLimit() {
  return useContext(DownloadLimitContext)
}
