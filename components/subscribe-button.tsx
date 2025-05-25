"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { getProductionUrl } from "@/lib/url-utils"

export function SubscribeButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubscription = async () => {
    if (!user) {
      console.log("No user found, redirecting to login")
      // Use production URL for login redirect
      const productionUrl = getProductionUrl()
      router.push(`${productionUrl}/login?redirect=/pricing`)
      return
    }

    // Update any plan checks
    const isProUser = user?.plan === "creator_pro"

    try {
      setIsLoading(true)

      // Get fresh user data directly from the auth context
      const userId = user.uid
      const userEmail = user.email

      console.log("🔐 CHECKOUT: Creating session with fresh user data:")
      console.log(`🔐 CHECKOUT: User ID: ${userId}`)
      console.log(`🔐 CHECKOUT: User Email: ${userEmail}`)

      // Validate user data before proceeding
      if (!userId || !userEmail) {
        const errorMsg = `Missing required user data: ${!userId ? "User ID" : ""} ${!userEmail ? "Email" : ""}`
        console.error(errorMsg)
        toast({
          title: "Authentication Error",
          description: "Your account information is incomplete. Please try logging out and back in.",
          variant: "destructive",
        })
        return
      }

      // Create a fresh payload with current timestamp to prevent caching
      const payload = {
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        clientId: Math.random().toString(36).substring(2, 15), // Add random client ID to ensure uniqueness
        productionUrl: getProductionUrl(), // Add production URL to payload
      }

      console.log("🔐 CHECKOUT: Sending payload to API:", JSON.stringify(payload))

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store", // Prevent caching
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("🔐 CHECKOUT ERROR:", response.status, errorText)
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.url && data.sessionId) {
        console.log(`🔐 CHECKOUT SUCCESS: Session ID: ${data.sessionId}`)
        console.log(`🔐 CHECKOUT SUCCESS: Redirecting to: ${data.url}`)

        // Store the session ID in localStorage for debugging
        localStorage.setItem("lastCheckoutSessionId", data.sessionId)
        localStorage.setItem("lastCheckoutTime", new Date().toISOString())

        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        console.error("🔐 CHECKOUT ERROR: No URL in response:", data)
        toast({
          title: "Checkout Error",
          description: "Unable to start checkout process. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("🔐 CHECKOUT ERROR:", error)
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscription} disabled={isLoading} className={className || "w-full"} variant="default">
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </Button>
  )
}
