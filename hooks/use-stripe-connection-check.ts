"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeConnectionStatus {
  isConnected: boolean
  loading: boolean
  error: string | null
  accountId?: string
  needsOnboarding?: boolean
}

export function useStripeConnectionCheck() {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeConnectionStatus>({
    isConnected: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!user) {
      setStatus({
        isConnected: false,
        loading: false,
        error: "User not authenticated",
      })
      return
    }

    checkStripeConnection()
  }, [user])

  const checkStripeConnection = async () => {
    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }))

      const idToken = await user!.getIdToken()

      const response = await fetch("/api/stripe/connection-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to check Stripe connection")
      }

      const data = await response.json()

      setStatus({
        isConnected: data.isConnected || false,
        loading: false,
        error: null,
        accountId: data.accountId,
        needsOnboarding: data.needsOnboarding,
      })
    } catch (error) {
      console.error("Error checking Stripe connection:", error)
      setStatus({
        isConnected: false,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const refreshStatus = () => {
    if (user) {
      checkStripeConnection()
    }
  }

  return {
    ...status,
    refreshStatus,
  }
}
