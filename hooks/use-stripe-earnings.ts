"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface EarningsData {
  totalEarnings: number
  last30Days: number
  thisMonth: number
  lastMonth: number
  recentTransactions: Array<{
    id: string
    amount: number
    currency: string
    created: number
    customer: string | null
    description: string | null
    status: string
  }>
  isConnected: boolean
  loading: boolean
  error: string | null
}

export function useStripeEarnings() {
  const { user } = useAuth()
  const [data, setData] = useState<EarningsData>({
    totalEarnings: 0,
    last30Days: 0,
    thisMonth: 0,
    lastMonth: 0,
    recentTransactions: [],
    isConnected: false,
    loading: true,
    error: null,
  })

  const fetchEarnings = useCallback(async () => {
    if (!user) {
      setData((prev) => ({ ...prev, loading: false, isConnected: false }))
      return
    }

    try {
      setData((prev) => ({ ...prev, loading: true, error: null }))

      const idToken = await user.getIdToken()
      const response = await fetch("/api/dashboard/earnings", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (response.status === 404) {
        // User doesn't have Stripe connected
        setData({
          totalEarnings: 0,
          last30Days: 0,
          thisMonth: 0,
          lastMonth: 0,
          recentTransactions: [],
          isConnected: false,
          loading: false,
          error: null,
        })
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const earningsData = await response.json()

      setData({
        totalEarnings: earningsData.totalEarnings || 0,
        last30Days: earningsData.last30Days || 0,
        thisMonth: earningsData.thisMonth || 0,
        lastMonth: earningsData.lastMonth || 0,
        recentTransactions: earningsData.recentTransactions || [],
        isConnected: true,
        loading: false,
        error: null,
      })
    } catch (error: any) {
      console.error("Error fetching earnings:", error)
      setData({
        totalEarnings: 0,
        last30Days: 0,
        thisMonth: 0,
        lastMonth: 0,
        recentTransactions: [],
        isConnected: false,
        loading: false,
        error: error.message || "Failed to load earnings data",
      })
    }
  }, [user])

  useEffect(() => {
    fetchEarnings()
  }, [fetchEarnings])

  const unlinkStripeAccount = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to unlink account")
      }

      // Refresh earnings data after unlinking
      await fetchEarnings()

      return result
    } catch (error: any) {
      console.error("Error unlinking Stripe account:", error)
      throw error
    }
  }, [user, fetchEarnings])

  return {
    ...data,
    refresh: fetchEarnings,
    unlinkStripeAccount,
  }
}
