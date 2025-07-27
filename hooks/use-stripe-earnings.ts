"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeEarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  last30DaysEarnings: number
  pendingPayout: number
  availableBalance: number
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
  }
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: any[]
}

const defaultEarningsData: StripeEarningsData = {
  totalEarnings: 0,
  thisMonthEarnings: 0,
  lastMonthEarnings: 0,
  last30DaysEarnings: 0,
  pendingPayout: 0,
  availableBalance: 0,
  salesMetrics: {
    totalSales: 0,
    thisMonthSales: 0,
    last30DaysSales: 0,
    averageTransactionValue: 0,
  },
  accountStatus: {
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirementsCount: 0,
  },
  recentTransactions: [],
  payoutHistory: [],
  monthlyBreakdown: [],
}

// Helper function to safely extract numeric values
const safeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

// Helper function to safely extract boolean values
const safeBoolean = (value: any): boolean => {
  return Boolean(value)
}

// Helper function to safely extract array values
const safeArray = (value: any): any[] => {
  return Array.isArray(value) ? value : []
}

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData>(defaultEarningsData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      setLoading(false)
      setError("User not authenticated")
      setData(defaultEarningsData)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching earnings data...")

      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch earnings: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log("📊 Raw API response:", result)

      // Safely extract all values with proper fallbacks
      const safeData: StripeEarningsData = {
        totalEarnings: safeNumber(result.totalEarnings),
        thisMonthEarnings: safeNumber(result.thisMonthEarnings),
        lastMonthEarnings: safeNumber(result.lastMonthEarnings),
        last30DaysEarnings: safeNumber(result.last30DaysEarnings),
        pendingPayout: safeNumber(result.pendingPayout),
        availableBalance: safeNumber(result.availableBalance),
        salesMetrics: {
          totalSales: safeNumber(result.salesMetrics?.totalSales),
          thisMonthSales: safeNumber(result.salesMetrics?.thisMonthSales),
          last30DaysSales: safeNumber(result.salesMetrics?.last30DaysSales),
          averageTransactionValue: safeNumber(result.salesMetrics?.averageTransactionValue),
        },
        accountStatus: {
          chargesEnabled: safeBoolean(result.accountStatus?.chargesEnabled),
          payoutsEnabled: safeBoolean(result.accountStatus?.payoutsEnabled),
          detailsSubmitted: safeBoolean(result.accountStatus?.detailsSubmitted),
          requirementsCount: safeNumber(result.accountStatus?.requirementsCount),
        },
        recentTransactions: safeArray(result.recentTransactions),
        payoutHistory: safeArray(result.payoutHistory),
        monthlyBreakdown: safeArray(result.monthlyBreakdown),
      }

      console.log("✅ Processed earnings data:", safeData)

      setData(safeData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("❌ Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch earnings data")
      // Keep default data on error to prevent undefined access
      setData(defaultEarningsData)
    } finally {
      setLoading(false)
    }
  }, [user])

  const refresh = useCallback(async () => {
    await fetchEarnings()
  }, [fetchEarnings])

  const syncData = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/sync-stats", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to sync data: ${response.status}`)
      }

      // Refresh data after sync
      await fetchEarnings()
    } catch (err) {
      console.error("Error syncing data:", err)
      throw err
    }
  }, [user, fetchEarnings])

  useEffect(() => {
    if (user) {
      fetchEarnings()
    } else {
      setLoading(false)
      setData(defaultEarningsData)
      setError(null)
    }
  }, [user, fetchEarnings])

  return {
    data, // Always returns safe data, never null/undefined
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
