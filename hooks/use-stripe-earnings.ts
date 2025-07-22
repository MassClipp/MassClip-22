"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

export interface StripeEarningsData {
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

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch earnings data")
      }

      const earningsData = await response.json()
      setData(earningsData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch earnings")
      console.error("Error fetching earnings:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const refresh = useCallback(async () => {
    await fetchEarnings()
  }, [fetchEarnings])

  const syncData = useCallback(async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/sync-stats", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to sync data")
      }

      await fetchEarnings()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to sync data")
    }
  }, [user, fetchEarnings])

  useEffect(() => {
    if (user) {
      fetchEarnings()
    }
  }, [user, fetchEarnings])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
