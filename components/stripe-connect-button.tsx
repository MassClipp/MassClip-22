"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react"

interface StripeConnectButtonProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  onStatusChange?: (connected: boolean) => void
}

export default function StripeConnectButton({
  className,
  variant = "default",
  size = "default",
  onStatusChange,
}: StripeConnectButtonProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [accountStatus, setAccountStatus] = useState<any>(null)

  // Check connection status on component mount
  React.useEffect(() => {
    if (user) {
      checkConnectionStatus()
    }
  }, [user])

  const checkConnectionStatus = async () => {
    if (!user) return

    try {
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
        setIsConnected(data.connected)
        setAccountStatus(data)
        onStatusChange?.(data.connected)
      }
    } catch (error) {
      console.error("Error checking connection status:", error)
    }
  }

  const handleConnect = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      console.log("🔄 [Connect Button] Starting connection process...")

      // Get the user's ID token
      const idToken = await user.getIdToken()
      console.log("✅ [Connect Button] Got ID token")

      // Call the create account API
      console.log("📡 [Connect Button] Calling /api/stripe/create-stripe-account...")
      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      console.log(`📥 [Connect Button] Response status: ${response.status}`)
      console.log(`📥 [Connect Button] Response headers:`, Object.fromEntries(response.headers.entries()))

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("❌ [Connect Button] Non-JSON response received:", textResponse)
        alert(`Server error: Received non-JSON response. Check console for details.`)
        return
      }

      const data = await response.json()
      console.log("📥 [Connect Button] Response data:", data)

      if (!response.ok) {
        console.error("❌ [Connect Button] API request failed:", data)

        // Show specific error message for missing configuration
        if (data.error === "Stripe Connect not configured") {
          alert(`Configuration Error: ${data.details}\n\nSuggestion: ${data.suggestion}`)
        } else {
          alert(
            `Failed to connect to Stripe: ${data.error || "Unknown error"}\n\nDetails: ${data.details || "No additional details"}`,
          )
        }
        return
      }

      if (data.success && data.url) {
        console.log(`🔗 [Connect Button] Redirecting to onboarding: ${data.url}`)
        // Redirect to Stripe's onboarding page
        window.location.href = data.url
      } else if (data.alreadySetup) {
        console.log("✅ [Connect Button] Account already set up")
        alert("Your Stripe account is already fully set up!")
        await checkConnectionStatus()
      } else {
        console.error("❌ [Connect Button] Unexpected response format:", data)
        alert("Unexpected response from server. Check console for details.")
      }
    } catch (error: any) {
      console.error("❌ [Connect Button] Error connecting to Stripe:", error)
      alert(`Failed to connect to Stripe: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      console.log("🔄 [Connect Button] Refreshing onboarding...")

      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      console.log(`📥 [Connect Button] Refresh response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ [Connect Button] Refresh failed:", errorData)

        if (errorData.accountDeleted) {
          // Account was deleted, refresh page to show connect button
          window.location.reload()
          return
        }
        throw new Error(errorData.error || "Failed to refresh onboarding")
      }

      const data = await response.json()
      console.log("📥 [Connect Button] Refresh data:", data)

      if (data.onboardingUrl) {
        console.log(`🔗 [Connect Button] Redirecting to onboarding: ${data.onboardingUrl}`)
        window.location.href = data.onboardingUrl
      } else if (data.onboardingComplete) {
        // Refresh status
        await checkConnectionStatus()
      }
    } catch (error: any) {
      console.error("❌ [Connect Button] Error refreshing onboarding:", error)
      alert(`Failed to refresh onboarding: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Fully connected account
  if (isConnected && accountStatus?.capabilities?.charges_enabled && accountStatus?.capabilities?.payouts_enabled) {
    return (
      <Button disabled className={className} variant="outline" size={size}>
        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
        Connected to Stripe
      </Button>
    )
  }

  // Account exists but needs completion or is under review
  if (accountStatus?.accountId && !isConnected) {
    const needsAction =
      accountStatus.capabilities?.currently_due?.length > 0 || accountStatus.capabilities?.past_due?.length > 0

    if (needsAction) {
      return (
        <Button
          onClick={handleRefresh}
          disabled={isLoading || !user}
          className={className}
          variant="outline"
          size={size}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
              Complete Setup
            </>
          )}
        </Button>
      )
    }

    // Under review
    return (
      <Button disabled className={className} variant="outline" size={size}>
        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
        Under Review
      </Button>
    )
  }

  // No account or needs to start connection process
  return (
    <Button onClick={handleConnect} disabled={isLoading || !user} className={className} variant={variant} size={size}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <ExternalLink className="mr-2 h-4 w-4" />
          Connect with Stripe
        </>
      )}
    </Button>
  )
}
