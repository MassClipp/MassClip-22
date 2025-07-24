"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { toast } from "sonner"

interface StripeConnectButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  variant?: "default" | "outline" | "secondary"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function StripeConnectButton({
  onSuccess,
  onError,
  variant = "default",
  size = "default",
  className,
}: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const { getIdToken } = useFirebaseAuth()

  const handleConnect = async () => {
    try {
      setLoading(true)

      // Get ID token for authentication
      const idToken = await getIdToken()
      if (!idToken) {
        throw new Error("Authentication required")
      }

      // Create Stripe connect URL
      const response = await fetch("/api/stripe/connect-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Stripe connection")
      }

      if (data.success && data.connectUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.connectUrl
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error: any) {
      console.error("Stripe connect error:", error)
      const errorMessage = error.message || "Failed to connect to Stripe"
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading} variant={variant} size={size} className={className}>
      {loading ? "Connecting..." : "Connect with Stripe"}
    </Button>
  )
}
