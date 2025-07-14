"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface StripeConnectionStatus {
  isConnected: boolean
  loading: boolean
  error: string | null
}

export function useStripeConnectionCheck(): StripeConnectionStatus {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeConnectionStatus>({
    isConnected: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const checkStripeConnection = async () => {
      if (!user) {
        setStatus({ isConnected: false, loading: false, error: null })
        return
      }

      try {
        const response = await fetch("/api/stripe/connection-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to check Stripe connection")
        }

        const data = await response.json()

        setStatus({
          isConnected: data.connected || false,
          loading: false,
          error: null,
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

    checkStripeConnection()
  }, [user])

  return status
}
