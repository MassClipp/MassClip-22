"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, updateDoc, setDoc, Timestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

// Define plan types
export type UserPlan = "free" | "pro"

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
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setPlanData({
            plan: userData.plan || "free",
            downloads: userData.downloads || 0,
            downloadsLimit: userData.plan === "pro" ? Number.POSITIVE_INFINITY : 5,
            lastReset: userData.lastReset ? userData.lastReset.toDate() : null,
          })
        } else {
          // Create a user document if it doesn't exist
          const defaultUserData = {
            plan: "free",
            downloads: 0,
            lastReset: Timestamp.now(),
            createdAt: Timestamp.now(),
            email: user.email,
            displayName: user.displayName,
          }

          await setDoc(userDocRef, defaultUserData)

          // Default to a plan object
          setPlanData({
            plan: "free",
            downloads: 0,
            downloadsLimit: 5,
            lastReset: new Date(),
          })
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching user plan:", err)
        setError("Failed to load user plan data")
        // Default to a plan object even on error
        setPlanData({
          plan: "free",
          downloads: 0,
          downloadsLimit: 5,
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

    // Pro users don't need to track downloads
    if (planData.plan === "pro") return { success: true }

    try {
      // CRITICAL: Check if user has reached their limit BEFORE incrementing
      if (planData.downloads >= planData.downloadsLimit) {
        return {
          success: false,
          message: "You've reached your monthly download limit. Upgrade to Pro for unlimited downloads.",
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
    isProUser: planData?.plan === "pro",
    recordDownload,
    remainingDownloads: planData ? Math.max(0, planData.downloadsLimit - planData.downloads) : 0,
    hasReachedLimit, // Export this value for all components to use
  }
}
