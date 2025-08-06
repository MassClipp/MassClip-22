"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeConnectionStatus {
  connected: boolean
  account?: {
    stripeAccountId: string
    email: string
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    createdAt: any
    updatedAt: any
  }
}

export function useStripeConnection() {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    if (!user) {
      setStatus({ connected: false })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/check-connection", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      console.error("Error checking Stripe connection:", err)
      setError(err instanceof Error ? err.message : "Failed to check connection")
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const refresh = useCallback(() => {
    checkConnection()
  }, [checkConnection])

  return {
    status,
    loading,
    error,
    refresh,
    isConnected: status?.connected || false,
    account: status?.account,
  }
}
