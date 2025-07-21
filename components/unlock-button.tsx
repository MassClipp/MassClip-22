"use client"

import { useState } from "react"
import { Lock, ShoppingCart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface UnlockButtonProps {
  bundleId: string
  price: number
  isCreator?: boolean
  creatorId?: string
  onPurchaseStart?: () => void
  onPurchaseComplete?: () => void
}

export function UnlockButton({
  bundleId,
  price,
  isCreator = false,
  creatorId,
  onPurchaseStart,
  onPurchaseComplete,
}: UnlockButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (isCreator) {
      toast({
        title: "Creator Access",
        description: "You have full access to this content as the creator.",
        className:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 rounded-xl shadow-2xl backdrop-blur-sm",
        duration: 3000,
      })
      return
    }

    try {
      setIsLoading(true)
      onPurchaseStart?.()

      console.log("Button clicked for bundle:", bundleId, {
        isLoggedIn: true,
        stripePriceId: `price_1Rn744R8MYlLnvGCR4amSNl`,
        bundleId: bundleId,
        creatorId: creatorId,
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bundleId,
          creatorId,
        }),
      })

      console.log("Checkout API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Checkout session creation failed:", errorData)
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()
      console.log("Redirecting to checkout:", url)

      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
        className:
          "bg-gradient-to-r from-red-600 to-red-700 text-white border-0 rounded-xl shadow-2xl backdrop-blur-sm",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
      onPurchaseComplete?.()
    }
  }

  if (isCreator) {
    return (
      <Button
        onClick={handlePurchase}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-500/20 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
      >
        <Lock className="w-3.5 h-3.5 mr-1.5" />
        Creator Access
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={isLoading}
      className="bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-white border border-zinc-600/20 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium shadow-lg hover:shadow-zinc-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
          Unlock ${price.toFixed(2)}
        </>
      )}
    </Button>
  )
}
