"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ExternalLink } from "lucide-react"

interface StripeConnectButtonProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function StripeConnectButton({
  className,
  variant = "default",
  size = "default",
}: StripeConnectButtonProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

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
        throw new Error("Failed to start Stripe Connect onboarding")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        // If already onboarded, redirect to dashboard
        window.location.href = "/dashboard/earnings"
      } else if (data.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error connecting to Stripe:", error)
      alert("Failed to connect to Stripe. Please try again.")
    } finally {
      setIsLoading(false)
    }
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
