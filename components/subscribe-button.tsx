"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface SubscribeButtonProps {
  className?: string
  children?: React.ReactNode
  navigateOnly?: boolean // New prop to control behavior
}

export function SubscribeButton({
  className = "",
  children,
  navigateOnly = false, // Default to false for backward compatibility
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubscribe = async () => {
    // If navigateOnly is true, just go to the membership plans page
    if (navigateOnly) {
      router.push("/membership-plans")
      return
    }

    if (!user) {
      router.push("/login?redirect=/membership-plans")
      return
    }

    setIsLoading(true)

    try {
      // Log the click for analytics
      try {
        await fetch("/api/log-payment-click", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            action: "subscribe_click",
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error("Failed to log payment click:", error)
        // Continue anyway, as this is not critical
      }

      // Create checkout session
      console.log(`Creating checkout session for user ${user.uid} with email ${user.email}`)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          siteUrl: "https://massclip.pro", // Always use massclip.pro
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()

      if (url) {
        console.log(`Redirecting to checkout URL: ${url}`)
        // Use window.location.href for a full page navigation to Stripe
        window.location.href = url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error: any) {
      console.error("Subscribe error:", error)
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading}
      className={`bg-crimson hover:bg-crimson-dark text-white font-medium py-2 px-4 rounded-md transition-all duration-300 ${className}`}
    >
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </button>
  )
}

// Default export for backward compatibility
export default SubscribeButton
