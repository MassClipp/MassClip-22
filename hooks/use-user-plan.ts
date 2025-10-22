"use client"

import { useState, useEffect, useCallback } from "react"
import { doc, getDoc, updateDoc, setDoc, Timestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export type UserPlan = "free" | "creator_pro" | "starter"

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
        console.log("[v0] useUserPlan - No user, skipping fetch")
        setPlanData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        console.log("[v0] useUserPlan - Fetching membership status for user:", user.uid)
        console.log("[v0] useUserPlan - User email:", user.email)

        const membershipResponse = await fetch("/api/membership-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        })

        console.log("[v0] useUserPlan - Membership response status:", membershipResponse.status)
        console.log("[v0] useUserPlan - Membership response ok:", membershipResponse.ok)

        let finalPlan: UserPlan = "free"

        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json()
          console.log("[v0] useUserPlan - Membership data:", JSON.stringify(membershipData, null, 2))

          if (membershipData.isActive) {
            // If plan is creator_pro or creator_vip, set to creator_pro for backwards compatibility
            // If plan is starter, set to starter
            if (membershipData.plan === "creator_pro" || membershipData.plan === "creator_vip") {
              finalPlan = "creator_pro"
              console.log("[v0] useUserPlan - User is VIP (creator_pro/creator_vip), setting plan to creator_pro")
            } else if (membershipData.plan === "starter") {
              finalPlan = "starter" as UserPlan
              console.log("[v0] useUserPlan - User is Starter, setting plan to starter")
            } else {
              console.log("[v0] useUserPlan - Unknown plan:", membershipData.plan, "defaulting to free")
            }
          } else {
            console.log(
              "[v0] useUserPlan - User is not active (isActive:",
              membershipData.isActive,
              "), keeping plan as free",
            )
          }
        } else {
          const errorText = await membershipResponse.text()
          console.log("[v0] useUserPlan - Membership API call failed with error:", errorText)
        }

        console.log("[v0] useUserPlan - Final plan determined:", finalPlan)

        if (finalPlan === "creator_pro" || finalPlan === "starter") {
          setPlanData({
            plan: finalPlan,
            downloads: 0,
            downloadsLimit: Number.POSITIVE_INFINITY,
            lastReset: null,
          })
          console.log("[v0] useUserPlan - Set plan data for", finalPlan)
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
        console.error("[v0] useUserPlan - Error fetching user plan:", err)
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

    if (planData.plan === "creator_pro" || planData.plan === "starter") return { success: true }

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
