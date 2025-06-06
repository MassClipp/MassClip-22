"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ShoppingCart, Lock } from "lucide-react"

interface PremiumContentPurchaseButtonProps {
  creatorId: string
  priceId: string
  productName: string
  price: number
  currency: string
  creatorUsername?: string
  className?: string
  size?: "sm" | "default" | "lg"
}

export default function PremiumContentPurchaseButton({
  creatorId,
  priceId,
  productName,
  price,
  currency,
  creatorUsername,
  className,
  size = "default",
}: PremiumContentPurchaseButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const handlePurchase = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/stripe/checkout/premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          creatorId,
          successUrl: `${window.location.origin}/purchase/success?creator=${creatorUsername || creatorId}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create checkout session")
      }

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
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
          Buy {formatPrice(price, currency)}
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
