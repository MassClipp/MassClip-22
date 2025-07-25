"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export function StripeConnectButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useFirebaseAuth()

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Stripe account.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    console.log("🚀 [Stripe Connect] Starting connection process")

    try {
      // Get the user's ID token
      const idToken = await user.getIdToken()
      console.log("🔑 [Stripe Connect] Got user ID token")

      // Store state in localStorage as backup
      const backupState = crypto.randomUUID()
      localStorage.setItem("stripe_oauth_state", backupState)
      console.log(`💾 [Stripe Connect] Stored backup state in localStorage: ${backupState}`)

      // Call our OAuth initiation endpoint
      console.log("📡 [Stripe Connect] Calling OAuth initiation endpoint")
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()
      console.log("📥 [Stripe Connect] OAuth response:", data)

      if (!response.ok) {
        console.error("❌ [Stripe Connect] OAuth initiation failed:", data)
        throw new Error(data.details || data.error || "Failed to initialize OAuth flow")
      }

      if (!data.authUrl) {
        console.error("❌ [Stripe Connect] No auth URL in response:", data)
        throw new Error("No authorization URL received")
      }

      console.log(`🔗 [Stripe Connect] Redirecting to Stripe: ${data.authUrl}`)

      // Store additional state info for debugging
      localStorage.setItem(
        "stripe_oauth_debug",
        JSON.stringify({
          state: data.state,
          redirectUri: data.redirectUri,
          timestamp: new Date().toISOString(),
          userId: user.uid,
        }),
      )

      // Redirect to Stripe
      window.location.href = data.authUrl
    } catch (error: any) {
      console.error("❌ [Stripe Connect] Connection failed:", error)

      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Stripe. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading || !user} className="w-full">
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Connecting to Stripe...
        </>
      ) : (
        "Connect with Stripe"
      )}
    </Button>
  )
}

// Named export for compatibility
export { StripeConnectButton as default }
