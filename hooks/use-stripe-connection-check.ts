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
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)

  const checkStatus = useCallback(async () => {
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
        const status: ConnectionStatus = {
          isConnected: data.connected,
          accountId: data.accountId,
          businessType: data.businessType,
          capabilities: data.capabilities,
        }

        setConnectionStatus(status)
        setIsConnected(data.connected && data.capabilities?.charges_enabled && data.capabilities?.payouts_enabled)
      } else {
        // If there's an error, assume not connected
        setConnectionStatus(null)
        setIsConnected(false)
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
      setConnectionStatus(null)
      setIsConnected(false)
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
    isConnected,
    loading,
    connectionStatus,
    refreshStatus,
  }
}
