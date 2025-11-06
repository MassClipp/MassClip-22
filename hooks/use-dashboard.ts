"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { checkSubscription, type SubscriptionStatus } from "@/lib/subscription"

interface DashboardStats {
  totalEarnings: number
  salesCount: number
  totalUploads: number
  freeVideos: number
  premiumVideos: number
  freeRatio: number
  profileViews: number
  hasStripeConnection: boolean
  stripeAccountEnabled: boolean
}

interface DashboardData {
  stats: DashboardStats
  subscription: SubscriptionStatus
  isLoading: boolean
  error: string | null
}

// Helper function to safely convert to number
function safeNumber(value: any): number {
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

export function useDashboard(): DashboardData {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalEarnings: 0,
      salesCount: 0,
      totalUploads: 0,
      freeVideos: 0,
      premiumVideos: 0,
      freeRatio: 0,
      profileViews: 0,
      hasStripeConnection: false,
      stripeAccountEnabled: false,
    },
    subscription: {
      isActive: false,
      plan: "free",
    },
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.uid) {
        setData((prev) => ({ ...prev, isLoading: false }))
        return
      }

      try {
        setData((prev) => ({ ...prev, isLoading: true, error: null }))

        console.log(`📊 [Dashboard] Fetching data for user: ${user.uid}`)

        // Get Firebase ID token for authentication
        const idToken = await user.getIdToken(true)

        // Fetch subscription status
        const subscription = await checkSubscription(user.uid)

        // Fetch dashboard stats with authentication
        const statsResponse = await fetch(`/api/dashboard/statistics`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })

        let stats: DashboardStats = {
          totalEarnings: 0,
          salesCount: 0,
          totalUploads: 0,
          freeVideos: 0,
          premiumVideos: 0,
          freeRatio: 0,
          profileViews: 0,
          hasStripeConnection: false,
          stripeAccountEnabled: false,
        }

        if (statsResponse.ok) {
          const rawStats = await statsResponse.json()
          console.log(`✅ [Dashboard] Raw stats received:`, rawStats)

          // Safely convert all numeric values
          stats = {
            totalEarnings: safeNumber(rawStats.totalEarnings),
            salesCount: safeNumber(rawStats.salesCount),
            totalUploads: safeNumber(rawStats.totalUploads),
            freeVideos: safeNumber(rawStats.freeVideos),
            premiumVideos: safeNumber(rawStats.premiumVideos),
            freeRatio: safeNumber(rawStats.freeRatio),
            profileViews: safeNumber(rawStats.profileViews),
            hasStripeConnection: Boolean(rawStats.hasStripeConnection),
            stripeAccountEnabled: Boolean(rawStats.stripeAccountEnabled),
          }

          console.log(`✅ [Dashboard] Processed stats:`, stats)
        } else {
          console.error(`❌ [Dashboard] Stats API error:`, statsResponse.status, statsResponse.statusText)
        }

        setData({
          stats,
          subscription,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error("❌ [Dashboard] Error fetching dashboard data:", error)
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load dashboard data",
        }))
      }
    }

    fetchDashboardData()
  }, [user?.uid])

  return data
}
