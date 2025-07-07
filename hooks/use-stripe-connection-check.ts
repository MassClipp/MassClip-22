"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeConnectionStatus {
  isConnected: boolean
  accountId?: string
  canReceivePayments: boolean
  loading: boolean
  error?: string
}

export function useStripeConnectionCheck() {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeConnectionStatus>({
    isConnected: false,
    canReceivePayments: false,
    loading: true,
  })

  useEffect(() => {
    if (!user) {
      setStatus({
        isConnected: false,
        canReceivePayments: false,
        loading: false,
      })
      return
    }

    checkStripeConnection()
  }, [user])

  const checkStripeConnection = async () => {
    try {
      setStatus((prev) => ({ ...prev, loading: true }))

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to check Stripe status")
      }

      const data = await response.json()

      setStatus({
        isConnected: !!data.accountId,
        accountId: data.accountId,
        canReceivePayments: data.canReceivePayments || false,
        loading: false,
      })
    } catch (error) {
      console.error("Error checking Stripe connection:", error)
      setStatus({
        isConnected: false,
        canReceivePayments: false,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return {
    ...status,
    refetch: checkStripeConnection,
  }
}
