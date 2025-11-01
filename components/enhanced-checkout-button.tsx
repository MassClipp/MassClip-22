"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { toast } from "@/hooks/use-toast"
import { Loader2, ShoppingCart } from "lucide-react"

interface EnhancedCheckoutButtonProps {
  productBoxId?: string
  bundleId?: string
  price: number
  title: string
  creatorId: string
  className?: string
  children?: React.ReactNode
}

export function EnhancedCheckoutButton({
  productBoxId,
  bundleId,
  price,
  title,
  creatorId,
  className = "",
  children,
}: EnhancedCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user, loading: authLoading } = useFirebaseAuth()

  const handleCheckout = async () => {
    try {
      setIsLoading(true)

      // CRITICAL: Ensure we have buyer identification
      const buyerUid = user?.uid || "anonymous"

      if (!buyerUid) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to complete your purchase",
          variant: "destructive",
        })
        return
      }

      console.log("🛒 [Enhanced Checkout] Starting checkout with buyer identification:", {
        buyerUid,
        productBoxId,
        bundleId,
        userEmail: user?.email,
        userName: user?.displayName,
      })

      // Determine the item ID (bundle takes precedence)
      const itemId = bundleId || productBoxId
      if (!itemId) {
        throw new Error("No product or bundle ID provided")
      }

      // Create checkout session with comprehensive buyer metadata
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: itemId, // Use itemId for both products and bundles
          buyerUid, // CRITICAL: Include buyer UID
          successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${buyerUid}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url, sessionId, metadata } = await response.json()

      console.log("✅ [Enhanced Checkout] Checkout session created with buyer metadata:", {
        sessionId,
        buyerUid,
        metadata,
      })

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("❌ [Enhanced Checkout] Checkout error:", error)
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  return (
    <Button onClick={handleCheckout} disabled={isLoading} className={className}>
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
