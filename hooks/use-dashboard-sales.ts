"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface DashboardSalesData {
  totalRevenueLast30Days: number
  totalSalesLast30Days: number
  averageOrderValue: number
  loading: boolean
  error: string | null
}

export function useDashboardSales(): DashboardSalesData {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardSalesData>({
    totalRevenueLast30Days: 0,
    totalSalesLast30Days: 0,
    averageOrderValue: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!user?.uid) {
      setData({
        totalRevenueLast30Days: 0,
        totalSalesLast30Days: 0,
        averageOrderValue: 0,
        loading: false,
        error: null,
      })
      return
    }

    const fetchSalesData = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }))

        const response = await fetch("/api/dashboard/earnings", {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.details || `HTTP ${response.status}`)
        }

        const earningsData = await response.json()

        setData({
          totalRevenueLast30Days: earningsData.last30DaysRevenue || 0,
          totalSalesLast30Days: earningsData.last30DaysSales || 0,
          averageOrderValue: earningsData.averageTransactionValue || 0,
          loading: false,
          error: null,
        })
      } catch (error) {
        console.error("Error fetching dashboard sales data:", error)
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch sales data",
        }))
      }
    }

    fetchSalesData()

    // Refresh every 30 seconds
    const interval = setInterval(fetchSalesData, 30000)
    return () => clearInterval(interval)
  }, [user?.uid])

  return data
}
