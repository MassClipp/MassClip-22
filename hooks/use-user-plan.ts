"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, updateDoc, setDoc, Timestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

// Define plan types
export type UserPlan = "free" | "creator_pro"

export interface UserPlanData {
  plan: UserPlan
  downloads: number
  downloadsLimit: number
  lastReset: Date | null
}

export function useUserPlan() {
  const { user } = useAuth()
  const [planData, setPlanData] = useState<UserPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user plan data
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) {
        setPlanData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // First check membership status API for most accurate data
        const membershipResponse = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        let finalPlan: UserPlan = "free"

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()

          // Check if subscription is expired
          let isExpired = false
          if (membershipData.currentPeriodEnd) {
            const endDate = new Date(membershipData.currentPeriodEnd)
            const now = new Date()
            isExpired = now > endDate
          }

          // Only use creator_pro if active and not expired
          if (membershipData.plan === "creator_pro" && membershipData.isActive && !isExpired) {
            finalPlan = "creator_pro"
          }
        }

        // Fallback to user document if membership API fails
        if (finalPlan === "free") {
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userPlan = userData.plan === "pro" ? "creator_pro" : userData.plan || "free"

            // Check expiration for legacy subscriptions
            if (userPlan === "creator_pro" && userData.subscriptionCurrentPeriodEnd) {
              const endDate = new Date(userData.subscriptionCurrentPeriodEnd)
              const now = new Date()
              const isExpired = now > endDate

              if (!isExpired) {
                finalPlan = "creator_pro"
              }
            } else if (userPlan === "creator_pro" && !userData.subscriptionCurrentPeriodEnd) {
              // Legacy pro without expiration date - assume expired
              finalPlan = "free"
            }

            setPlanData({
              plan: finalPlan,
              downloads: userData.downloads || 0,
              downloadsLimit: finalPlan === "creator_pro" ? Number.POSITIVE_INFINITY : 25,
              lastReset: userData.lastReset ? userData.lastReset.toDate() : null,
            })
          } else {
            // Create default user document
            const defaultUserData = {
              plan: "free",
              downloads: 0,
              lastReset: Timestamp.now(),
              createdAt: Timestamp.now(),
              email: user.email,
              displayName: user.displayName,
            }

            await setDoc(userDocRef, defaultUserData)

            setPlanData({
              plan: "free",
              downloads: 0,
              downloadsLimit: 25,
              lastReset: new Date(),
            })
          }
        } else {
          // Pro user from membership API
          setPlanData({
            plan: finalPlan,
            downloads: 0, // Pro users don't track downloads
            downloadsLimit: Number.POSITIVE_INFINITY,
            lastReset: null,
          })
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching user plan:", err)
        setError("Failed to load user plan data")
        setPlanData({
          plan: "free",
          downloads: 0,
          downloadsLimit: 25,
          lastReset: null,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserPlan()
  }, [user])

  // Calculate if user has reached their download limit - this is used by all components
  const hasReachedLimit = !!(planData && planData.plan === "free" && planData.downloads >= planData.downloadsLimit)

  // Function to increment download count and handle resets
  const recordDownload = useCallback(async () => {
    if (!user || !planData) return { success: false, message: "User not authenticated" }

    // Creator Pro users don't need to track downloads
    if (planData.plan === "creator_pro") return { success: true }

    try {
      // CRITICAL: Check if user has reached their limit BEFORE incrementing
      if (planData.downloads >= planData.downloadsLimit) {
        return {
          success: false,
          message: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
        }
      }

      const userDocRef = doc(db, "users", user.uid)

      // Check if we need to reset downloads (new month)
      const now = new Date()
      const lastReset = planData.lastReset

      if (lastReset && (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear())) {
        // Reset for new month
        await updateDoc(userDocRef, {
          downloads: 1, // Set to 1 because we're counting this download
          lastReset: Timestamp.now(),
        })

        // Update local state immediately
        setPlanData((prev) => (prev ? { ...prev, downloads: 1, lastReset: now } : null))

        return { success: true }
      }

      // Increment download count
      await updateDoc(userDocRef, {
        downloads: increment(1),
      })

      // Update local state immediately to prevent race conditions
      setPlanData((prev) => {
        if (!prev) return null

        const newDownloads = prev.downloads + 1
        return {
          ...prev,
          downloads: newDownloads,
        }
      })

      return { success: true }
    } catch (err) {
      console.error("Error recording download:", err)
      return {
        success: false,
        message: "Failed to record download. Please try again.",
      }
    }
  }, [user, planData])

  return {
    planData,
    loading,
    error,
    isProUser: planData?.plan === "creator_pro",
    recordDownload,
    remainingDownloads: planData ? Math.max(0, planData.downloadsLimit - planData.downloads) : 0,
    hasReachedLimit, // Export this value for all components to use
  }
}
