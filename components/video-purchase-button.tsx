"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    // CRITICAL: Require authentication before purchase
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a purchase.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsLoading(true)

    try {
      console.log("🛒 [Purchase Button] Starting purchase process...")
      console.log("   Product Box ID:", productBoxId)
      console.log("   Price:", price)
      console.log("   Buyer UID:", user.uid)
      console.log("   Current domain:", window.location.origin)

      // Get fresh auth token
      console.log("🔐 [Purchase Button] Getting auth token...")
      const idToken = await user.getIdToken(true)
      console.log("✅ [Purchase Button] Auth token obtained, length:", idToken?.length)

      if (!idToken) {
        throw new Error("Failed to get authentication token")
      }

      // First, let's check if this is a bundle or product box
      console.log("📦 [Purchase Button] Checking item type...")

      // Try to find the bundle first
      const bundleResponse = await fetch(`/api/bundles/${productBoxId}`)
      let isBundle = false
      let bundleData = null

      if (bundleResponse.ok) {
        bundleData = await bundleResponse.json()
        isBundle = true
        console.log("✅ [Purchase Button] Found bundle:", bundleData.title)
      } else {
        console.log("ℹ️ [Purchase Button] Not a bundle, treating as product box")
      }

      // Create checkout session with buyer authentication
      console.log("💳 [Purchase Button] Creating checkout session...")
      const requestBody = {
        idToken,
        bundleId: productBoxId, // Use productBoxId as bundleId
        priceId: isBundle ? bundleData?.stripePriceId || bundleData?.priceId : productBoxId,
        successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}&buyer_uid=${user.uid}`,
        cancelUrl: window.location.href,
      }

      console.log("📝 [Purchase Button] Request body:", {
        ...requestBody,
        idToken: `[TOKEN_LENGTH:${requestBody.idToken.length}]`,
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📊 [Purchase Button] Checkout response status:", response.status)
      console.log("📊 [Purchase Button] Checkout response headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("📊 [Purchase Button] Raw response:", responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ [Purchase Button] Failed to parse response:", parseError)
        throw new Error("Invalid response from server")
      }

      if (!response.ok) {
        console.error("❌ [Purchase Button] Checkout failed:", data)

        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: data.error || "Please log in again to make a purchase.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }

        throw new Error(data.error || "Failed to create checkout session")
      }

      console.log("✅ [Purchase Button] Checkout session created:", data)

      if (!data.url) {
        throw new Error("No checkout URL received")
      }

      // Verify buyer UID is included in response (security check)
      if (!data.buyerUid || data.buyerUid !== user.uid) {
        console.warn("⚠️ [Purchase Button] Buyer UID mismatch or missing:", {
          returned: data.buyerUid,
          expected: user.uid,
        })
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
  if (!user) {
    return (
      <Button onClick={() => router.push("/login")} variant="outline" className={className}>
        <Lock className="h-4 w-4 mr-2" />
        Login to Purchase
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={disabled || isLoading}
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
