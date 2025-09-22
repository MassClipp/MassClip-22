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
  remainingDownloads: 15,
  isProUser: false,
  forceRefresh: () => {},
  loading: true,
})

export function DownloadLimitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [hasReachedLimit, setHasReachedLimit] = useState(false)
  const [remainingDownloads, setRemainingDownloads] = useState(15)
  const [isProUser, setIsProUser] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [loading, setLoading] = useState(true)

  const forceRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (!user) {
      setHasReachedLimit(false)
      setRemainingDownloads(15)
      setIsProUser(false)
      setLoading(false)
      return
    }

    setLoading(true)

    const checkSubscriptionStatus = async () => {
      try {
        const membershipResponse = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        let isPro = false

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()
          // Simple check - if membership is active, user is pro
          isPro = membershipData.isActive
        }

        setIsProUser(isPro)

        if (isPro) {
          setRemainingDownloads(Number.POSITIVE_INFINITY)
          setHasReachedLimit(false)
        } else {
          const freeUserDocRef = doc(db, "freeUsers", user.uid)
          const freeUserDoc = await getDoc(freeUserDocRef)

          if (freeUserDoc.exists()) {
            const freeUserData = freeUserDoc.data()
            const downloadsUsed = freeUserData.downloadsUsed || 0
            const downloadsLimit = freeUserData.downloadsLimit || 15

            setRemainingDownloads(Math.max(0, downloadsLimit - downloadsUsed))
            setHasReachedLimit(downloadsUsed >= downloadsLimit)
          } else {
            // Default values if no freeUser document exists
            setRemainingDownloads(15)
            setHasReachedLimit(false)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Error checking subscription status:", error)
        setIsProUser(false)
        setLoading(false)
      }
    }

    checkSubscriptionStatus()

    const freeUserDocRef = doc(db, "freeUsers", user.uid)
    const unsubscribe = onSnapshot(
      freeUserDocRef,
      () => {
        checkSubscriptionStatus()
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
