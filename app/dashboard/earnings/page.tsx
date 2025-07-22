"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import StripeConnectionPrompt from "@/components/stripe-connection-prompt"
import EarningsPageContent from "./earnings-content"

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

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  useEffect(() => {
    if (user && !authLoading) {
      checkConnectionStatus()
    }
  }, [user, authLoading])

  const checkConnectionStatus = async () => {
    if (!user) return

    try {
      setIsCheckingConnection(true)
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
        setConnectionStatus({
          isConnected: data.connected,
          accountId: data.accountId,
          businessType: data.businessType,
          capabilities: data.capabilities,
        })
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const handleConnectionSuccess = () => {
    // Refresh connection status after successful connection
    checkConnectionStatus()
  }

  // Show loading while checking authentication and connection
  if (authLoading || isCheckingConnection) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">{authLoading ? "Authenticating..." : "Checking Stripe connection..."}</p>
        </div>
      </div>
    )
  }

  // Show connection prompt if user is not connected or needs to complete setup
  const needsConnection =
    !connectionStatus?.isConnected ||
    !connectionStatus?.capabilities?.charges_enabled ||
    !connectionStatus?.capabilities?.payouts_enabled

  if (needsConnection) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <StripeConnectionPrompt onConnectionSuccess={handleConnectionSuccess} existingStatus={connectionStatus} />
        </div>
      </div>
    )
  }

  // Show earnings page if fully connected
  return <EarningsPageContent />
}
