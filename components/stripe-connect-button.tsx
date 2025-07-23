"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StripeConnectButtonProps {
  variant?: "create" | "connect"
  className?: string
}

export function StripeConnectButton({ variant = "connect", className }: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useFirebaseAuth()

  const handleConnect = async () => {
    if (!user) {
      setError("Please log in to connect your Stripe account")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const idToken = await user.getIdToken()

      const endpoint = variant === "create" ? "/api/stripe/create-stripe-account" : "/api/stripe/connect/onboard"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to connect with Stripe")
      }

      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      } else {
        throw new Error("No onboarding URL received")
      }
    } catch (error: any) {
      console.error("Stripe connect error:", error)
      setError(error.message || "Failed to create onboarding link")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleConnect} disabled={isLoading || !user} className={className} size="lg">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            {variant === "create" ? "Creating Account..." : "Connecting..."}
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            {variant === "create" ? "Create Stripe Account" : "Connect with Stripe"}
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        {variant === "create"
          ? "You'll be redirected to Stripe to complete setup"
          : "Stripe will detect your existing account and connect it securely"}
      </p>
    </div>
  )
}
