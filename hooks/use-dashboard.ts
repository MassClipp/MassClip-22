"use client"

import { useState, useEffect } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { checkSubscription, type SubscriptionStatus } from "@/lib/subscription"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/firebase"

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

        // Fetch real profile views from user document
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        const userData = userDoc.exists() ? userDoc.data() : {}

        const stats = {
          totalSales: 0,
          totalRevenue: 0,
          thisMonthSales: 0,
          thisMonthRevenue: 0,
          totalUploads: 0,
          freeVideos: 0,
          premiumVideos: 0,
          profileViews: userData.profileViews || 0, // Get real profile views from database
        }

        setData({
          stats,
          subscription,
          isLoading: false,
          error: null,
        })

        // Also add real-time listener for profile views
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data()
            setData((prev) => ({
              ...prev,
              stats: {
                ...prev.stats,
                profileViews: data.profileViews || 0,
              },
            }))
          }
        })

        // Return cleanup function
        return () => unsubscribe()
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load dashboard data",
        }))
      }
    }

    const unsubscribe = fetchDashboardData()

    return () => {
      if (unsubscribe && typeof unsubscribe === "function") {
        unsubscribe()
      }
    }
  }, [user?.uid])

  return data
}
