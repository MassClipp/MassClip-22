"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useStripeConnectionCheck } from "@/hooks/use-stripe-connection-check"
import StripeConnectionPrompt from "@/components/stripe-connection-prompt"
import EarningsPageContent from "./earnings-content"

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth()
  const { isConnected, loading: connectionLoading, connectionStatus, refreshStatus } = useStripeConnectionCheck()

  // Handle URL parameters for Stripe onboarding returns
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const refresh = urlParams.get("refresh")

    if (success === "true") {
      console.log("✅ Returned from successful Stripe onboarding")
      // Clean URL and refresh status
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => refreshStatus(), 1000)
    } else if (refresh === "true") {
      console.log("🔄 Returned from Stripe onboarding refresh")
      // Clean URL and refresh status
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => refreshStatus(), 1000)
    }
  }, [refreshStatus])

  if (authLoading || connectionLoading) {
    return <EarningsPageContent />
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <StripeConnectionPrompt
          onConnectionSuccess={() => {
            refreshStatus()
          }}
          existingStatus={connectionStatus}
        />
      </div>
    )
  }

  return <EarningsPageContent />
}
