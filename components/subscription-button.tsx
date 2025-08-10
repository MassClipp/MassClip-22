"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2, Crown } from "lucide-react"

interface SubscriptionButtonProps {
  priceId: string
  planName: string
  price: number
  className?: string
}

export function SubscriptionButton({ priceId, planName, price, className = "" }: SubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleSubscribe = async () => {
    try {
      setIsLoading(true)

      // Get the Firebase ID token for authentication
      let idToken = ""
      if (user) {
        try {
          idToken = await user.getIdToken()
          console.log("🔑 [Subscription] Got auth token for user:", user.uid)
        } catch (error) {
          console.error("❌ [Subscription] Failed to get auth token:", error)
          toast({
            title: "Authentication Error",
            description: "Please try signing in again",
            variant: "destructive",
          })
          return
        }
      } else {
        toast({
          title: "Sign In Required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        })
        return
      }

      console.log("👑 [Subscription] Starting subscription checkout:", {
        priceId,
        userUid: user.uid,
        hasToken: !!idToken,
      })

      // Create subscription checkout session
      const response = await fetch("/api/stripe/checkout/premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          idToken, // CRITICAL: Include the Firebase auth token
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create subscription session")
      }

      const { url, sessionId } = await response.json()

      console.log("✅ [Subscription] Checkout session created:", {
        sessionId,
        hasUrl: !!url,
      })

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("❌ [Subscription] Subscribe failed:", error)
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscribe} disabled={isLoading} className={className}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Crown className="mr-2 h-4 w-4" />
          Subscribe to {planName} - ${price}/month
        </>
      )}
    </Button>
  )
}
