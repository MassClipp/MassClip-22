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

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      setLoading(false)
      setError("User not authenticated")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch earnings: ${response.status}`)
      }

      const result = await response.json()

      // Ensure all numeric values are properly set with fallbacks
      const safeData: StripeEarningsData = {
        totalEarnings: Number(result.totalEarnings) || 0,
        thisMonthEarnings: Number(result.thisMonthEarnings) || 0,
        lastMonthEarnings: Number(result.lastMonthEarnings) || 0,
        last30DaysEarnings: Number(result.last30DaysEarnings) || 0,
        pendingPayout: Number(result.pendingPayout) || 0,
        availableBalance: Number(result.availableBalance) || 0,
        salesMetrics: {
          totalSales: Number(result.salesMetrics?.totalSales) || 0,
          thisMonthSales: Number(result.salesMetrics?.thisMonthSales) || 0,
          last30DaysSales: Number(result.salesMetrics?.last30DaysSales) || 0,
          averageTransactionValue: Number(result.salesMetrics?.averageTransactionValue) || 0,
        },
        accountStatus: {
          chargesEnabled: Boolean(result.accountStatus?.chargesEnabled),
          payoutsEnabled: Boolean(result.accountStatus?.payoutsEnabled),
          detailsSubmitted: Boolean(result.accountStatus?.detailsSubmitted),
          requirementsCount: Number(result.accountStatus?.requirementsCount) || 0,
        },
        recentTransactions: Array.isArray(result.recentTransactions) ? result.recentTransactions : [],
        payoutHistory: Array.isArray(result.payoutHistory) ? result.payoutHistory : [],
        monthlyBreakdown: Array.isArray(result.monthlyBreakdown) ? result.monthlyBreakdown : [],
      }

      setData(safeData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch earnings data")
      // Set default data on error to prevent undefined access
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
      setData(null)
      setError(null)
    }
  }, [user, fetchEarnings])

  return {
    data: data || defaultEarningsData, // Always return safe data
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
