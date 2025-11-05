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

  const checkConnection = useCallback(
    async (forceRefresh = false) => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("🔍 [Connection Check] Checking Stripe connection...")

        const idToken = await user.getIdToken(forceRefresh) // Force token refresh if needed

        // Use the connection status API with cache busting if needed
        const url = forceRefresh
          ? `/api/stripe/connection-status-on-login?t=${Date.now()}`
          : `/api/stripe/connection-status-on-login`

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          cache: forceRefresh ? "no-store" : "default",
        })

        if (response.ok) {
          const data = await response.json()
          console.log("📊 [Connection Check] Status received:", data)

          const connected = data.connected && data.account_id
          setIsConnected(connected)

          if (connected) {
            setConnectionStatus({
              isConnected: true,
              accountId: data.account_id,
              businessType: data.account_status?.business_type || null,
              capabilities: {
                charges_enabled: data.account_status?.charges_enabled || false,
                payouts_enabled: data.account_status?.payouts_enabled || false,
                details_submitted: data.account_status?.details_submitted || false,
                currently_due: data.account_status?.requirements?.currently_due || [],
                eventually_due: data.account_status?.requirements?.eventually_due || [],
                past_due: data.account_status?.requirements?.past_due || [],
              },
            })
          } else {
            setConnectionStatus({
              isConnected: false,
              accountId: null,
              businessType: null,
              capabilities: null,
            })
          }
        } else {
          console.error("❌ [Connection Check] API error:", response.status)
          setIsConnected(false)
          setConnectionStatus(null)
        }
      } catch (error) {
        console.error("❌ [Connection Check] Error:", error)
        setIsConnected(false)
        setConnectionStatus(null)
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  // Force refresh function for after OAuth
  const refreshStatus = useCallback(() => {
    console.log("🔄 [Connection Check] Force refreshing status...")
    return checkConnection(true)
  }, [checkConnection])

  // Initial check
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Listen for storage events (when user completes OAuth in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "stripe_connection_updated") {
        console.log("🔄 [Connection Check] Storage event detected, refreshing...")
        refreshStatus()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [refreshStatus])

  // Listen for focus events (when user returns to tab after OAuth)
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we think we're not connected
      if (!isConnected) {
        console.log("🔄 [Connection Check] Tab focused and not connected, checking...")
        refreshStatus()
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [isConnected, refreshStatus])

  return {
    isConnected,
    loading,
    connectionStatus,
    refreshStatus,
  }
}
