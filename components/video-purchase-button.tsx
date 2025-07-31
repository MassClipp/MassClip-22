"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface VideoPurchaseButtonProps {
  productBoxId?: string
  bundleId?: string
  price: number
  title?: string
  creatorId: string
  disabled?: boolean
  className?: string
  variant?: "default" | "outline" | "secondary"
  size?: "sm" | "default" | "lg"
}

export default function VideoPurchaseButton({
  productBoxId,
  bundleId,
  price,
  title = "Buy Now",
  creatorId,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
}: VideoPurchaseButtonProps) {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    // CRITICAL: Require authentication before purchase
    if (authLoading) {
      toast({
        title: "Please Wait",
        description: "Verifying your authentication...",
      })
      return
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!productBoxId && !bundleId) {
      toast({
        title: "Invalid Product",
        description: "Product information is missing.",
        variant: "destructive",
      })
      return
    }

    if (!creatorId) {
      toast({
        title: "Invalid Creator",
        description: "Creator information is missing.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("🛒 [Purchase Button] Starting purchase process...")
      console.log("   Product Box ID:", productBoxId)
      console.log("   Bundle ID:", bundleId)
      console.log("   Price:", price)
      console.log("   Creator ID:", creatorId)
      console.log("   Buyer UID:", user.uid)

      // Get fresh auth token
      console.log("🔐 [Purchase Button] Getting auth token...")
      const buyerToken = await user.getIdToken(true)
      console.log("✅ [Purchase Button] Auth token obtained")

      if (!buyerToken) {
        throw new Error("Failed to get authentication token")
      }

      // Create checkout session with buyer authentication
      console.log("💳 [Purchase Button] Creating checkout session...")
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          bundleId,
          price,
          title,
          creatorId,
          buyerToken, // CRITICAL: Include buyer authentication token
        }),
      })

      console.log("📊 [Purchase Button] Checkout response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ [Purchase Button] Checkout failed:", errorData)

        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to make a purchase.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()
      console.log("✅ [Purchase Button] Checkout session created:")
      console.log("   Session ID:", data.sessionId)
      console.log("   Buyer UID:", data.buyerUid)
      console.log("   Checkout URL:", data.url)

      if (!data.url) {
        throw new Error("No checkout URL received")
      }

      // Verify buyer UID is included in response (security check)
      if (!data.buyerUid || data.buyerUid !== user.uid) {
        throw new Error("Purchase authentication verification failed")
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

  // Show login prompt for unauthenticated users
  if (!authLoading && !user) {
    return (
      <Button onClick={() => router.push("/login")} variant="outline" size={size} className={className}>
        <Lock className="h-4 w-4 mr-2" />
        Login to Purchase
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isLoading || authLoading || !user}
      variant={variant}
      size={size}
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
