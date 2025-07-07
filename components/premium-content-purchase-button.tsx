"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, ShoppingCart, Lock } from "lucide-react"

interface PremiumContentPurchaseButtonProps {
  productBoxId: string
  productName: string
  price: number
  currency: string
  creatorUsername?: string
  className?: string
  size?: "sm" | "default" | "lg"
}

export default function PremiumContentPurchaseButton({
  productBoxId,
  productName,
  price,
  currency,
  creatorUsername,
  className,
  size = "default",
}: PremiumContentPurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase this content",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log(`🔄 [Purchase] Starting checkout for product: ${productBoxId}`)

      // Get user token
      const token = await user.getIdToken()

      const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userToken: token,
          successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      })

      console.log(`📡 [Purchase] Checkout API response status: ${response.status}`)

      if (!response.ok) {
        const error = await response.json()
        console.error(`❌ [Purchase] Checkout failed:`, error)

        // Handle specific error cases
        if (error.code === "ALREADY_PURCHASED") {
          toast({
            title: "Already Purchased",
            description: "You already own this content",
            variant: "destructive",
          })
          return
        }

        if (error.code === "NO_STRIPE_ACCOUNT") {
          toast({
            title: "Payment Unavailable",
            description: "This creator hasn't set up payment processing yet",
            variant: "destructive",
          })
          return
        }

        throw new Error(error.error || "Failed to create checkout session")
      }

      const data = await response.json()
      console.log(`✅ [Purchase] Checkout session created:`, data.sessionId)

      if (data.url) {
        // Redirect to Stripe checkout
        console.log(`🔄 [Purchase] Redirecting to checkout: ${data.url}`)
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("❌ [Purchase] Error creating checkout session:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Button
        disabled
        size={size}
        variant="outline"
        className={`border-zinc-700 text-zinc-500 cursor-not-allowed ${className}`}
      >
        <Lock className="h-4 w-4 mr-2" />
        Login Required
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={loading}
      size={size}
      className={`bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium shadow-lg shadow-amber-900/20 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          {formatPrice(price, currency)}
        </>
      )}
    </Button>
  )
}

// Alternative locked state button for when no products are available
export function LockedContentButton({
  className,
  size = "default",
}: { className?: string; size?: "sm" | "default" | "lg" }) {
  return (
    <Button
      disabled
      size={size}
      variant="outline"
      className={`border-zinc-700 text-zinc-500 cursor-not-allowed ${className}`}
    >
      <Lock className="h-4 w-4 mr-2" />
      Premium Content
    </Button>
  )
}
