"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"

interface UnlockButtonProps {
  stripePriceId?: string
  bundleId: string
  user: any
  creatorId: string
  price?: number
}

export function UnlockButton({ stripePriceId, bundleId, user, creatorId, price }: UnlockButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Safe price formatting function
  const formatPrice = (price: number | undefined | null): string => {
    console.log("🔢 UnlockButton formatting price:", price, typeof price)
    if (typeof price === "number" && !isNaN(price) && isFinite(price)) {
      return price.toFixed(2)
    }
    return "0.00"
  }

  const handleUnlock = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = "/login"
      return
    }

    if (!stripePriceId) {
      console.error("❌ No stripePriceId provided")
      return
    }

    setIsLoading(true)

    try {
      console.log("🔓 Creating checkout session for:", {
        stripePriceId,
        bundleId,
        creatorId,
        userId: user.uid,
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          bundleId,
          creatorId,
          userId: user.uid,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error) {
      console.error("❌ Error creating checkout session:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleUnlock}
      disabled={isLoading}
      size="sm"
      className="bg-white text-black hover:bg-gray-100 font-medium px-4 py-2 rounded-lg transition-colors duration-200"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Lock className="w-4 h-4 mr-2" />
          Unlock
        </>
      )}
    </Button>
  )
}
