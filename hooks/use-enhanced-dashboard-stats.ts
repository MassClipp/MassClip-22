"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

/**
 * Safely converts a Firestore timestamp or any date-like value to a JavaScript Date
 */
function safelyConvertToDate(dateValue: any): Date {
  if (!dateValue) return new Date()

  // If it's already a Date object
  if (dateValue instanceof Date) return dateValue

  // If it's a Firestore timestamp with toDate() method
  if (dateValue && typeof dateValue.toDate === "function") {
    try {
      return dateValue.toDate()
    } catch (e) {
      console.error("Error converting Firestore timestamp:", e)
      return new Date()
    }
  }

  // If it's a timestamp number
  if (typeof dateValue === "number") {
    return new Date(dateValue)
  }

  // If it's an ISO string
  if (typeof dateValue === "string") {
    try {
      return new Date(dateValue)
    } catch (e) {
      console.error("Error parsing date string:", e)
      return new Date()
    }
  }

  // Default fallback
  return new Date()
}

interface EnhancedDashboardStats {
  sales: {
    totalSalesLast30Days: number
    totalRevenueLast30Days: number
    thisMonthSales: number
    thisMonthRevenue: number
    averageOrderValue: number
    recentTransactions: any[]
  }
  videos: {
    totalFreeVideos: number
    totalUploads: number
    freeVideoPercentage: number
    recentFreeVideos: any[]
  }
  profile: {
    profileViews: number
  }
  lastUpdated: Date
}

export function useEnhancedDashboardStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<EnhancedDashboardStats>({
    sales: {
      totalSalesLast30Days: 0,
      totalRevenueLast30Days: 0,
      thisMonthSales: 0,
      thisMonthRevenue: 0,
      averageOrderValue: 0,
      recentTransactions: [],
    },
    videos: {
      totalFreeVideos: 0,
      totalUploads: 0,
      freeVideoPercentage: 0,
      recentFreeVideos: [],
    },
    profile: {
      profileViews: 0,
    },
    lastUpdated: new Date(),
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/enhanced-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        // Safely convert the lastUpdated field to a Date object
        result.data.lastUpdated = safelyConvertToDate(result.data.lastUpdated)
        setStats(result.data)
      } else {
        throw new Error(result.error || "Failed to fetch stats")
      }
    } catch (error) {
      console.error("Error fetching enhanced dashboard stats:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  return {
    ...stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
