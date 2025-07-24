"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"

interface StripeConnectButtonProps {
  userId: string
  onSuccess?: () => void
}

export function StripeConnectButton({ userId, onSuccess }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create onboarding link")
      }
    } catch (error) {
      console.error("Error connecting to Stripe:", error)
      alert("Failed to connect to Stripe. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading} className="w-full" size="lg">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Connect with Stripe
        </>
      )}
    </Button>
  )
}
