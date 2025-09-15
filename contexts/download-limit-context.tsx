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

  // Force a refresh of the limit status
  const forceRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, [])

  // Set up a real-time listener for user plan data
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
        // Check membership status first
        const membershipResponse = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        let isPro = false

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()

          // Check if subscription is expired
          let isExpired = false
          if (membershipData.currentPeriodEnd) {
            const endDate = new Date(membershipData.currentPeriodEnd)
            const now = new Date()
            isExpired = now > endDate
          }

          isPro = membershipData.plan === "creator_pro" && membershipData.isActive && !isExpired
        }

        // Fallback to user document
        if (!isPro) {
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userPlan = userData?.plan === "pro" ? "creator_pro" : userData?.plan

            if (userPlan === "creator_pro" && userData.subscriptionCurrentPeriodEnd) {
              const endDate = new Date(userData.subscriptionCurrentPeriodEnd)
              const now = new Date()
              isPro = now <= endDate
            }
          }
        }

        setIsProUser(isPro)

        if (isPro) {
          setRemainingDownloads(Number.POSITIVE_INFINITY)
          setHasReachedLimit(false)
        } else {
          // Get user document for download tracking
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const downloads = userData.downloads || 0
            const limit = 15

            setRemainingDownloads(Math.max(0, limit - downloads))
            setHasReachedLimit(downloads >= limit)
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

    // Set up real-time listener for user document changes
    const userDocRef = doc(db, "users", user.uid)
    const unsubscribe = onSnapshot(
      userDocRef,
      () => {
        // Re-check subscription status when user document changes
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
