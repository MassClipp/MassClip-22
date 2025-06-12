"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeDashboardSalesData {
  totalRevenueLast30Days: number
  totalSalesLast30Days: number
  averageOrderValue: number
  loading: boolean
  error: string | null
  source: "stripe" | "firestore" | null
}

export function useStripeDashboardSales(): StripeDashboardSalesData {
  const { user } = useAuth()
  const [data, setData] = useState<StripeDashboardSalesData>({
    totalRevenueLast30Days: 0,
    totalSalesLast30Days: 0,
    averageOrderValue: 0,
    loading: true,
    error: null,
    source: null,
  })

  useEffect(() => {
    if (!user?.uid) {
      setData({
        totalRevenueLast30Days: 0,
        totalSalesLast30Days: 0,
        averageOrderValue: 0,
        loading: false,
        error: null,
        source: null,
      })
      return
    }

    const fetchSalesData = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }))

        // Get the user's ID token for authentication
        const idToken = await user.getIdToken()

        const response = await fetch("/api/dashboard/earnings", {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.details || `HTTP ${response.status}`)
        }

        const earningsData = await response.json()

        console.log(`📊 Dashboard sales data received:`, {
          last30DaysRevenue: earningsData.last30DaysRevenue,
          last30DaysSales: earningsData.last30DaysSales,
          source: earningsData.source,
        })

        setData({
          totalRevenueLast30Days: earningsData.last30DaysRevenue || 0,
          totalSalesLast30Days: earningsData.last30DaysSales || 0,
          averageOrderValue: earningsData.averageTransactionValue || 0,
          loading: false,
          error: null,
          source: earningsData.source || null,
        })
      } catch (error) {
        console.error("❌ Error fetching dashboard sales data:", error)
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch sales data",
        }))
      }
    }

    fetchSalesData()

    // Refresh every 60 seconds (less frequent to avoid rate limits)
    const interval = setInterval(fetchSalesData, 60000)
    return () => clearInterval(interval)
  }, [user?.uid])

  return data
}
