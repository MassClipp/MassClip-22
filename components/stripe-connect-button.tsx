"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ExternalLink, CheckCircle } from "lucide-react"

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

      // Get the user's ID token
      const idToken = await user.getIdToken()

      // Call the onboarding API
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start Stripe Connect onboarding")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        // If already onboarded, update status
        setIsConnected(true)
        setAccountStatus(data)
        onStatusChange?.(true)
        alert("Your Stripe account is already connected and ready to receive payments!")
      } else if (data.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        console.log("🔗 Redirecting to Stripe onboarding:", data.onboardingUrl)
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error connecting to Stripe:", error)
      alert(`Failed to connect to Stripe: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("Failed to refresh onboarding")
      }

      const data = await response.json()
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error refreshing onboarding:", error)
      alert(`Failed to refresh onboarding: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected && accountStatus?.capabilities?.charges_enabled && accountStatus?.capabilities?.payouts_enabled) {
    return (
      <Button disabled className={className} variant="outline" size={size}>
        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
        Connected to Stripe
      </Button>
    )
  }

  if (
    isConnected &&
    accountStatus &&
    (!accountStatus.capabilities?.charges_enabled || !accountStatus.capabilities?.payouts_enabled)
  ) {
    return (
      <Button onClick={handleRefresh} disabled={isLoading || !user} className={className} variant="outline" size={size}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            Complete Setup
          </>
        )}
      </Button>
    )
  }

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
