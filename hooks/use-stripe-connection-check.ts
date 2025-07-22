"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

interface ConnectionStatus {
  connected: boolean
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
  account: {
    country: string
    email: string
    type: string
    businessType: string
  } | null
  message: string
}

export function useStripeConnectionCheck() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)

  const checkConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data)
        setIsConnected(data.connected && data.capabilities?.charges_enabled && data.capabilities?.payouts_enabled)
      } else {
        console.error("Failed to check connection status:", response.status)
        setIsConnected(false)
        setConnectionStatus(null)
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
      setIsConnected(false)
      setConnectionStatus(null)
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
    connectionStatus,
    refreshStatus,
  }
}
