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

// Create a completely safe default earnings object
const createDefaultEarningsData = (): StripeEarningsData => ({
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

// Ultra-safe number conversion with extensive validation
const ultraSafeNumber = (value: any, fallback = 0): number => {
  // Handle all falsy values
  if (value === null || value === undefined || value === "" || value === false) {
    return fallback
  }

  // If it's already a number, validate it
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      console.warn(`ultraSafeNumber: Invalid number detected:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return value
  }

  // If it's a string, try to convert
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return fallback

    const num = Number(trimmed)
    if (isNaN(num) || !isFinite(num)) {
      console.warn(`ultraSafeNumber: String conversion failed:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return num
  }

  // Try generic Number conversion as last resort
  try {
    const num = Number(value)
    if (isNaN(num) || !isFinite(num)) {
      console.warn(`ultraSafeNumber: Generic conversion failed:`, value, `Using fallback: ${fallback}`)
      return fallback
    }
    return num
  } catch (error) {
    console.error(`ultraSafeNumber: Conversion error for value:`, value, error)
    return fallback
  }
}

// Ultra-safe boolean conversion
const ultraSafeBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return false
  return Boolean(value)
}

// Ultra-safe array conversion
const ultraSafeArray = (value: any): any[] => {
  if (Array.isArray(value)) return value
  return []
}

// Ultra-safe object property access
const safeGet = (obj: any, path: string, fallback: any = undefined) => {
  try {
    const keys = path.split(".")
    let current = obj

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== "object") {
        return fallback
      }
      current = current[key]
    }

    return current !== undefined ? current : fallback
  } catch (error) {
    console.warn(`safeGet: Error accessing path "${path}":`, error)
    return fallback
  }
}

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<StripeEarningsData>(createDefaultEarningsData())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      console.log("🔄 No user, setting defaults")
      setLoading(false)
      setError("User not authenticated")
      setData(createDefaultEarningsData())
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching earnings data for user:", user.uid)

      const token = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${token}`,
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

      // Ultra-safe data extraction with extensive validation
      const safeData: StripeEarningsData = {
        totalEarnings: ultraSafeNumber(safeGet(result, "totalEarnings", 0)),
        thisMonthEarnings: ultraSafeNumber(safeGet(result, "thisMonthEarnings", 0)),
        lastMonthEarnings: ultraSafeNumber(safeGet(result, "lastMonthEarnings", 0)),
        last30DaysEarnings: ultraSafeNumber(safeGet(result, "last30DaysEarnings", 0)),
        pendingPayout: ultraSafeNumber(safeGet(result, "pendingPayout", 0)),
        availableBalance: ultraSafeNumber(safeGet(result, "availableBalance", 0)),
        salesMetrics: {
          totalSales: ultraSafeNumber(safeGet(result, "salesMetrics.totalSales", 0)),
          thisMonthSales: ultraSafeNumber(safeGet(result, "salesMetrics.thisMonthSales", 0)),
          last30DaysSales: ultraSafeNumber(safeGet(result, "salesMetrics.last30DaysSales", 0)),
          averageTransactionValue: ultraSafeNumber(safeGet(result, "salesMetrics.averageTransactionValue", 0)),
        },
        accountStatus: {
          chargesEnabled: ultraSafeBoolean(safeGet(result, "accountStatus.chargesEnabled", false)),
          payoutsEnabled: ultraSafeBoolean(safeGet(result, "accountStatus.payoutsEnabled", false)),
          detailsSubmitted: ultraSafeBoolean(safeGet(result, "accountStatus.detailsSubmitted", false)),
          requirementsCount: ultraSafeNumber(safeGet(result, "accountStatus.requirementsCount", 0)),
        },
        recentTransactions: ultraSafeArray(safeGet(result, "recentTransactions", [])),
        payoutHistory: ultraSafeArray(safeGet(result, "payoutHistory", [])),
        monthlyBreakdown: ultraSafeArray(safeGet(result, "monthlyBreakdown", [])),
      }

      console.log("✅ Processed earnings data:", {
        totalEarnings: safeData.totalEarnings,
        totalSales: safeData.salesMetrics.totalSales,
        allFieldsValid: {
          totalEarnings: typeof safeData.totalEarnings === "number",
          thisMonthEarnings: typeof safeData.thisMonthEarnings === "number",
          salesMetrics: typeof safeData.salesMetrics === "object",
          averageTransactionValue: typeof safeData.salesMetrics.averageTransactionValue === "number",
        },
      })

      setData(safeData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("❌ Error fetching earnings:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch earnings data")

      // Always ensure we have valid data, even on error
      setData(createDefaultEarningsData())
    } finally {
      setLoading(false)
    }
  }, [user])

  const refresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered")
    await fetchEarnings()
  }, [fetchEarnings])

  const syncData = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    try {
      console.log("🔄 Syncing data...")
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
      console.log("🔄 User changed, fetching earnings")
      fetchEarnings()
    } else {
      console.log("🔄 No user, resetting to defaults")
      setLoading(false)
      setData(createDefaultEarningsData())
      setError(null)
    }
  }, [user, fetchEarnings])

  // Final safety check - ensure data is never null/undefined
  const safeData = data || createDefaultEarningsData()

  return {
    data: safeData, // Guaranteed to be a valid StripeEarningsData object
    loading,
    error,
    lastUpdated,
    refresh,
    syncData,
  }
}
