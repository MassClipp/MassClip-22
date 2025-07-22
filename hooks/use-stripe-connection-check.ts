"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface ConnectionStatus {
  isConnected: boolean
  accountId: string | null
  businessType: "individual" | "company" | null
  capabilities: {
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  } | null
}

export function useStripeConnectionCheck() {
  const { user } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("Failed to check connection status")
      }

      const data = await response.json()
      setStatus({
        isConnected: data.connected,
        accountId: data.accountId,
        businessType: data.businessType,
        capabilities: data.capabilities,
      })
    } catch (err: any) {
      console.error("Error checking Stripe connection:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const refreshStatus = useCallback(() => {
    checkStatus()
  }, [checkStatus])

  return {
    isConnected: status?.isConnected || false,
    accountId: status?.accountId,
    businessType: status?.businessType,
    capabilities: status?.capabilities,
    loading,
    error,
    refreshStatus,
  }
}
