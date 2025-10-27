"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2, CreditCard } from "lucide-react"

interface DirectPaymentLinkProps {
  bundleId?: string
  productBoxId?: string
  price: number
  title: string
  description?: string
  className?: string
  buttonText?: string
}

export function DirectPaymentLink({
  bundleId,
  productBoxId,
  price,
  title,
  description,
  className = "",
  buttonText,
}: DirectPaymentLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handlePayment = async () => {
    try {
      setIsLoading(true)

      // Get the Firebase ID token for authentication
      let idToken = ""
      if (user) {
        try {
          idToken = await user.getIdToken()
          console.log("🔑 [Direct Payment] Got auth token for user:", user.uid)
        } catch (error) {
          console.error("❌ [Direct Payment] Failed to get auth token:", error)
          toast({
            title: "Authentication Error",
            description: "Please try signing in again",
            variant: "destructive",
          })
          return
        }
      } else {
        console.log("⚠️ [Direct Payment] No user authenticated, proceeding as anonymous")
      }

      const itemId = bundleId || productBoxId
      if (!itemId) {
        throw new Error("No product or bundle ID provided")
      }

      console.log("💳 [Direct Payment] Starting checkout:", {
        itemId,
        userUid: user?.uid || "anonymous",
        hasToken: !!idToken,
      })

      // Create checkout session with authentication token
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bundleId: itemId,
          idToken, // CRITICAL: Include the Firebase auth token
          successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url, sessionId, buyerUid } = await response.json()

      console.log("✅ [Direct Payment] Checkout session created:", {
        sessionId,
        buyerUid,
        hasUrl: !!url,
      })

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("❌ [Direct Payment] Payment failed:", error)
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
      <Button onClick={handlePayment} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {buttonText || `Pay $${price}`}
          </>
        )}
      </Button>
    </div>
  )
}
