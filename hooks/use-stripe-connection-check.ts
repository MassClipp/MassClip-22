"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeConnectionStatus {
  isConnected: boolean
  accountId?: string
  status?: string
  requiresAction?: boolean
}

export function useStripeConnectionCheck() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: StripeConnectionStatus = await response.json()
      setIsConnected(data.isConnected || false)
    } catch (err) {
      console.error("Error checking Stripe connection:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  const refreshStatus = useCallback(() => {
    checkConnection()
  }, [checkConnection])

  return {
    isConnected,
    loading,
    error,
    refreshStatus,
  }
}
