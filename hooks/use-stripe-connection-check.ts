"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "./use-firebase-auth"

interface StripeConnectionStatus {
  isConnected: boolean
  loading: boolean
  error: string | null
}

export function useStripeConnectionCheck(): StripeConnectionStatus {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useFirebaseAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const checkStripeConnection = async () => {
      try {
        setLoading(true)
        setError(null)

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
        setIsConnected(data.connected || false)
      } catch (err) {
        console.error("Error checking Stripe connection:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setIsConnected(false)
      } finally {
        setLoading(false)
      }
    }

    checkStripeConnection()
  }, [user])

  return { isConnected, loading, error }
}
