"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"
import { useStripeConnectionCheck } from "@/hooks/use-stripe-connection-check"
import StripeConnectionPrompt from "@/components/stripe-connection-prompt"

// Import the existing earnings page content
import EarningsPageContent from "./earnings-content"

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const { isConnected, loading: connectionLoading, refreshStatus } = useStripeConnectionCheck()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Only show prompt if user is authenticated and not connected
    if (!authLoading && !connectionLoading && user && !isConnected) {
      setShowPrompt(true)
    } else {
      setShowPrompt(false)
    }
  }, [user, isConnected, authLoading, connectionLoading])

  const handleConnectionSuccess = () => {
    setShowPrompt(false)
    refreshStatus()
  }

  // Show loading while checking authentication and connection
  if (authLoading || connectionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">{authLoading ? "Authenticating..." : "Checking Stripe connection..."}</p>
        </div>
      </div>
    )
  }

  // Show connection prompt if user is not connected
  if (showPrompt) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <StripeConnectionPrompt onConnectionSuccess={handleConnectionSuccess} />
        </div>
      </div>
    )
  }

  // Show earnings page if connected
  return <EarningsPageContent />
}
