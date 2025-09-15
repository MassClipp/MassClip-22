"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, updateDoc, setDoc, Timestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

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

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) {
        setPlanData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        const membershipResponse = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        let finalPlan: UserPlan = "free"

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()
          // Simple check - if membership is active, user is pro
          if (membershipData.isActive) {
            finalPlan = "creator_pro"
          }
        }

        if (finalPlan === "creator_pro") {
          setPlanData({
            plan: finalPlan,
            downloads: 0,
            downloadsLimit: Number.POSITIVE_INFINITY,
            lastReset: null,
          })
        } else {
          // Free user - get download tracking from user document
          const userDocRef = doc(db, "users", user.uid)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const userData = userDoc.data()
            setPlanData({
              plan: "free",
              downloads: userData.downloads || 0,
              downloadsLimit: 25,
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

  const hasReachedLimit = !!(planData && planData.plan === "free" && planData.downloads >= planData.downloadsLimit)

  const recordDownload = useCallback(async () => {
    if (!user || !planData) return { success: false, message: "User not authenticated" }

    if (planData.plan === "creator_pro") return { success: true }

    try {
      if (planData.downloads >= planData.downloadsLimit) {
        return {
          success: false,
          message: "You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.",
        }
      }

      const userDocRef = doc(db, "users", user.uid)
      const now = new Date()
      const lastReset = planData.lastReset

      if (lastReset && (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear())) {
        await updateDoc(userDocRef, {
          downloads: 1,
          lastReset: Timestamp.now(),
        })

        setPlanData((prev) => (prev ? { ...prev, downloads: 1, lastReset: now } : null))
        return { success: true }
      }

      await updateDoc(userDocRef, {
        downloads: increment(1),
      })

      setPlanData((prev) => {
        if (!prev) return null
        const newDownloads = prev.downloads + 1
        return { ...prev, downloads: newDownloads }
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
    hasReachedLimit,
  }
}
