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

      // Call the OAuth API to get the connection URL
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("OAuth request failed:", errorData)

        // Show specific error message for missing configuration
        if (errorData.error === "Stripe Connect not configured") {
          alert(`Configuration Error: ${errorData.details}\n\nSuggestion: ${errorData.suggestion}`)
        } else {
          alert(`Failed to connect to Stripe: ${errorData.error || "Unknown error"}`)
        }
        return
      }

      const data = await response.json()

      if (data.url) {
        console.log(`🔗 [Connect Button] Redirecting to OAuth flow: ${data.url}`)
        // Redirect to Stripe's OAuth authorization page
        window.location.href = data.url
      } else {
        throw new Error("Failed to generate OAuth URL")
      }
    } catch (error: any) {
      console.error("Error connecting to Stripe:", error)
      alert(`Failed to connect to Stripe: ${error.message}`)
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
