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
  recentTransactions: Array<{
    id: string
    amount: number
    currency: string
    created: number
    description?: string
    customer?: {
      name?: string
      email?: string
    }
  }>
  payoutHistory: Array<{
    id: string
    amount: number
    currency: string
    created: number
    status: string
  }>
  monthlyBreakdown: Array<{
    month: string
    earnings: number
    sales: number
  }>
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
      return
    }

    try {
      setError(null)
      const token = await user.getIdToken()

      const response = await fetch("/api/dashboard/earnings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // No Stripe account connected - return empty data
          setData({
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
          })
          setLastUpdated(new Date())
          return
        }

        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch earnings data")
      }

      const earningsData = await response.json()
      setData(earningsData)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error("Error fetching earnings:", err)
      setError(err.message || "Failed to load earnings data")

      // Set empty data on error
      setData({
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
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  const syncData = useCallback(async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/bulk-sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync data")
      }

      // Refresh data after sync
      await fetchEarnings()
    } catch (err: any) {
      console.error("Error syncing data:", err)
      throw err
    }
  }, [user, fetchEarnings])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchEarnings()
  }, [fetchEarnings])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
