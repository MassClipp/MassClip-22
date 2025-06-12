"use client"

import { useState, useEffect } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { checkSubscription, type SubscriptionStatus } from "@/lib/subscription"

interface DashboardStats {
  totalSales: number
  totalRevenue: number
  thisMonthSales: number
  thisMonthRevenue: number
  totalUploads: number
  freeVideos: number
  premiumVideos: number
  profileViews: number
}

interface DashboardData {
  stats: DashboardStats
  subscription: SubscriptionStatus
  isLoading: boolean
  error: string | null
}

export function useDashboard(): DashboardData {
  const { user } = useAuthContext()
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalSales: 0,
      totalRevenue: 0,
      thisMonthSales: 0,
      thisMonthRevenue: 0,
      totalUploads: 0,
      freeVideos: 0,
      premiumVideos: 0,
      profileViews: 0,
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

        // Fetch subscription status
        const subscription = await checkSubscription(user.uid)

        // Fetch dashboard stats (you can implement these API calls)
        const statsResponse = await fetch(`/api/dashboard/stats?userId=${user.uid}`)
        const stats = statsResponse.ok
          ? await statsResponse.json()
          : {
              totalSales: 0,
              totalRevenue: 0,
              thisMonthSales: 0,
              thisMonthRevenue: 0,
              totalUploads: 0,
              freeVideos: 0,
              premiumVideos: 0,
              profileViews: 0,
            }

        setData({
          stats,
          subscription,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
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
