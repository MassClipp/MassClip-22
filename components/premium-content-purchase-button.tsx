"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2, ShoppingCart } from "lucide-react"

interface PremiumContentPurchaseButtonProps {
  bundleId?: string
  productBoxId?: string
  price: number
  title: string
  creatorId: string
  className?: string
  children?: React.ReactNode
}

export function PremiumContentPurchaseButton({
  bundleId,
  productBoxId,
  price,
  title,
  creatorId,
  className = "",
  children,
}: PremiumContentPurchaseButtonProps) {
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
          console.log("🔑 [Purchase Button] Got auth token for user:", user.uid)
        } catch (error) {
          console.error("❌ [Purchase Button] Failed to get auth token:", error)
          toast({
            title: "Authentication Error",
            description: "Please try signing in again",
            variant: "destructive",
          })
          return
        }
      } else {
        console.log("⚠️ [Purchase Button] No user authenticated, proceeding as anonymous")
      }

      const itemId = bundleId || productBoxId
      if (!itemId) {
        throw new Error("No product or bundle ID provided")
      }

      console.log("🛒 [Purchase Button] Starting checkout:", {
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

      console.log("✅ [Purchase Button] Checkout session created:", {
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
      console.error("❌ [Purchase Button] Purchase failed:", error)
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
          <ShoppingCart className="mr-2 h-4 w-4" />
          {children || `Purchase for $${price}`}
        </>
      )}
    </Button>
  )
}
