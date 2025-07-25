"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeConnectButtonProps {
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
  children?: React.ReactNode
}

export function StripeConnectButton({
  variant = "default",
  size = "default",
  className = "",
  children = "Connect with Stripe",
}: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useFirebaseAuth()

  const handleConnect = async () => {
    if (!user) {
      console.error("❌ [Connect Button] User not authenticated")
      return
    }

    setIsLoading(true)
    console.log("🔄 [Connect Button] Starting OAuth flow")

    try {
      // Get the user's ID token
      const idToken = await user.getIdToken()
      console.log("🔑 [Connect Button] Got ID token")

      // Call our OAuth initiation endpoint
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      console.log("📨 [Connect Button] Response status:", response.status)

      const data = await response.json()
      console.log("📋 [Connect Button] Response data:", data)

      if (response.ok && data.success && data.url) {
        console.log("✅ [Connect Button] Redirecting to Stripe OAuth")
        // Redirect to Stripe OAuth
        window.location.href = data.url
      } else {
        console.error("❌ [Connect Button] Failed to initiate OAuth:", data)
        setIsLoading(false)
        // You might want to show an error toast here
      }
    } catch (error) {
      console.error("💥 [Connect Button] Error:", error)
      setIsLoading(false)
      // You might want to show an error toast here
    }
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading || !user} variant={variant} size={size} className={className}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          {children}
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  )
}
