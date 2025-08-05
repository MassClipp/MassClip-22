"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { validateEarningsData, createDefaultEarningsData } from "@/lib/format-utils"

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

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData>(createDefaultEarningsData())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching earnings data")

      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("📊 Raw API response received:", {
        hasData: !!result,
        keys: result ? Object.keys(result) : [],
        totalEarnings: result?.totalEarnings,
        salesMetrics: result?.salesMetrics,
      })

      // Use our bulletproof validation function
      const validatedData = validateEarningsData(result)

      console.log("✅ Validated earnings data:", {
        totalEarnings: validatedData.totalEarnings,
        totalSales: validatedData.salesMetrics.totalSales,
        allFieldsValid: {
          totalEarnings: typeof validatedData.totalEarnings === "number" && isFinite(validatedData.totalEarnings),
          thisMonthEarnings:
            typeof validatedData.thisMonthEarnings === "number" && isFinite(validatedData.thisMonthEarnings),
          averageTransactionValue:
            typeof validatedData.salesMetrics.averageTransactionValue === "number" &&
            isFinite(validatedData.salesMetrics.averageTransactionValue),
        },
      })

      setData(validatedData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("❌ Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch earnings data")

      // Always ensure we have valid data, even on error
      setData(createDefaultEarningsData())
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered")
    await fetchEarnings()
  }, [fetchEarnings])

  const syncData = useCallback(async () => {
    try {
      console.log("🔄 Syncing data...")
      const response = await fetch("/api/dashboard/sync-stats", {
        method: "POST",
        headers: {
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
  }, [fetchEarnings])

  useEffect(() => {
    console.log("🔄 Fetching earnings on mount")
    fetchEarnings()
  }, [fetchEarnings])

  // Final safety check - ensure data is never null/undefined
  const safeData = data || createDefaultEarningsData()

  return {
    data: safeData, // Guaranteed to be a valid StripeEarningsData object with all numbers validated
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
