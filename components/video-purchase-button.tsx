"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2, Play } from "lucide-react"

interface VideoPurchaseButtonProps {
  videoId: string
  bundleId?: string
  productBoxId?: string
  price: number
  title: string
  className?: string
}

export function VideoPurchaseButton({
  videoId,
  bundleId,
  productBoxId,
  price,
  title,
  className = "",
}: VideoPurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handlePurchase = async () => {
    try {
      setIsLoading(true)

      // Get the Firebase ID token for authentication
      let idToken = ""
      if (user) {
        try {
          idToken = await user.getIdToken()
          console.log("🔑 [Video Purchase] Got auth token for user:", user.uid)
        } catch (error) {
          console.error("❌ [Video Purchase] Failed to get auth token:", error)
          toast({
            title: "Authentication Error",
            description: "Please try signing in again",
            variant: "destructive",
          })
          return
        }
      } else {
        console.log("⚠️ [Video Purchase] No user authenticated, proceeding as anonymous")
      }

      const itemId = bundleId || productBoxId
      if (!itemId) {
        throw new Error("No product or bundle ID provided")
      }

      console.log("🎥 [Video Purchase] Starting checkout:", {
        videoId,
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
          successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}&video_id=${videoId}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url, sessionId, buyerUid } = await response.json()

      console.log("✅ [Video Purchase] Checkout session created:", {
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
      console.error("❌ [Video Purchase] Purchase failed:", error)
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handlePurchase} disabled={isLoading} className={className}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Unlock for ${price}
        </>
      )}
    </Button>
  )
}
