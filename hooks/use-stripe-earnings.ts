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
  nextPayoutDate: Date | null
  payoutSchedule: string
  accountStatus: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCount: number
    currentlyDue: string[]
    pastDue: string[]
  }
  recentTransactions: any[]
  payoutHistory: any[]
  monthlyBreakdown: {
    month: string
    earnings: number
    transactionCount: number
  }[]
  salesMetrics: {
    totalSales: number
    thisMonthSales: number
    last30DaysSales: number
    averageTransactionValue: number
    conversionRate: number
  }
  balanceBreakdown: {
    available: { amount: number; currency: string }[]
    pending: { amount: number; currency: string }[]
    reserved: { amount: number; currency: string }[]
  }
  error?: string | null
}

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(
    async (forceRefresh = false) => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        const token = await user.getIdToken()
        const endpoint = forceRefresh ? "/api/dashboard/earnings?refresh=true" : "/api/dashboard/earnings"

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        // Handle the new API response format
        if (result.error) {
          throw new Error(result.error)
        }

        // Convert the dashboard earnings format to the expected Stripe format
        const convertedData: StripeEarningsData = {
          totalEarnings: result.totalRevenue || 0,
          thisMonthEarnings: result.thisMonthRevenue || 0,
          lastMonthEarnings: 0, // Not available in current format
          last30DaysEarnings: result.last30DaysRevenue || 0,
          pendingPayout: 0,
          availableBalance: 0,
          nextPayoutDate: null,
          payoutSchedule: "monthly",
          accountStatus: {
            chargesEnabled: true,
            payoutsEnabled: true,
            detailsSubmitted: true,
            requirementsCount: 0,
            currentlyDue: [],
            pastDue: [],
          },
          recentTransactions:
            result.recentSales?.map((sale: any) => ({
              id: sale.id,
              amount: sale.amount,
              net: sale.amount,
              fee: 0,
              type: "payment",
              description: sale.productBoxTitle || "Sale",
              created: new Date(sale.createdAt),
              status: sale.status || "succeeded",
              currency: "USD",
              source: null,
            })) || [],
          payoutHistory: [],
          monthlyBreakdown: [],
          salesMetrics: {
            totalSales: result.totalSales || 0,
            thisMonthSales: result.thisMonthSales || 0,
            last30DaysSales: result.last30DaysSales || 0,
            averageTransactionValue: result.averageTransactionValue || 0,
            conversionRate: 0,
          },
          balanceBreakdown: {
            available: [],
            pending: [],
            reserved: [],
          },
          error: null,
        }

        setData(convertedData)
        setLastUpdated(new Date())
      } catch (err) {
        console.error("Error fetching earnings:", err)
        setError(err instanceof Error ? err.message : "Unknown error occurred")
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  const syncData = useCallback(async () => {
    if (!user) return

    try {
      // Just refresh the data since we don't have a separate sync endpoint
      await fetchEarnings(true)
    } catch (err) {
      console.error("Error syncing data:", err)
      throw err
    }
  }, [user, fetchEarnings])

  const refresh = useCallback(() => {
    return fetchEarnings(true)
  }, [fetchEarnings])

  // Initial fetch
  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchEarnings()
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(interval)
  }, [fetchEarnings])

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
    isConnected: data !== null && !data.error,
  }
}
