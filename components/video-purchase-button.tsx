"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VideoPurchaseButtonProps {
  productBoxId: string
  price: number
  title?: string
  disabled?: boolean
  className?: string
}

export default function VideoPurchaseButton({
  productBoxId,
  price,
  title = "Buy Now",
  disabled = false,
  className = "",
}: VideoPurchaseButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("🛒 [Purchase Button] Starting purchase process...")
      console.log("   Product Box ID:", productBoxId)
      console.log("   Price:", price)
      console.log("   Current domain:", window.location.origin)

      // Get fresh auth token
      console.log("🔐 [Purchase Button] Getting auth token...")
      const idToken = await user.getIdToken(true)
      console.log("✅ [Purchase Button] Auth token obtained")

      // Create checkout session
      console.log("💳 [Purchase Button] Creating checkout session...")
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          productBoxId,
          priceInCents: Math.round(price * 100), // Convert to cents
        }),
      })

      console.log("📊 [Purchase Button] Checkout response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ [Purchase Button] Checkout failed:", errorData)
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()
      console.log("✅ [Purchase Button] Checkout session created:")
      console.log("   Session ID:", data.sessionId)
      console.log("   Domain used:", data.domain)
      console.log("   Success URL:", data.successUrl)
      console.log("   Checkout URL:", data.url)

      if (!data.url) {
        throw new Error("No checkout URL received")
      }

      // Redirect to Stripe Checkout
      console.log("🔗 [Purchase Button] Redirecting to Stripe...")
      window.location.href = data.url
    } catch (error: any) {
      console.error("❌ [Purchase Button] Purchase failed:", error)
      toast({
        title: "Purchase Failed",
        description: error.message || "Unable to start checkout process. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isLoading || !user}
      className={`${className} ${isLoading ? "cursor-not-allowed" : ""}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          {title} ${price.toFixed(2)}
        </>
      )}
    </Button>
  )
}
