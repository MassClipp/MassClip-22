"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShoppingCart, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

interface VideoPurchaseButtonProps {
  productBoxId: string
  priceId: string
  price: number
  currency?: string
  title?: string
  disabled?: boolean
}

export default function VideoPurchaseButton({
  productBoxId,
  priceId,
  price,
  currency = "USD",
  title = "Purchase",
  disabled = false,
}: VideoPurchaseButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    if (!user) {
      console.log("❌ User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("🛒 Starting purchase process:", {
        productBoxId,
        priceId,
        buyerUid: user.uid,
        buyerEmail: user.email,
      })

      // Get Firebase ID token with force refresh
      console.log("🔐 Getting Firebase ID token...")
      const idToken = await user.getIdToken(true)
      console.log("✅ Firebase token obtained, length:", idToken.length)

      // Verify token format
      if (!idToken || idToken.split(".").length !== 3) {
        throw new Error("Invalid token format received")
      }

      const requestBody = {
        idToken,
        priceId,
        bundleId: productBoxId,
        successUrl: `${window.location.origin}/purchase-success`,
        cancelUrl: window.location.href,
      }

      console.log("📤 Sending request to create checkout session:", {
        ...requestBody,
        idToken: `${idToken.substring(0, 20)}...`, // Log partial token for debugging
      })

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // Also send as header
        },
        body: JSON.stringify(requestBody),
      })

      console.log("📥 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Checkout session creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        })

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ Checkout session created:", {
        sessionId: data.sessionId,
        buyerUid: data.buyerUid,
        bundleId: data.bundleId,
      })

      // Verify returned buyer UID matches authenticated user
      if (data.buyerUid !== user.uid) {
        console.error("❌ Buyer UID mismatch:", {
          returnedBuyerUid: data.buyerUid,
          authUserUid: user.uid,
        })
        throw new Error("Authentication mismatch")
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        console.log("🔄 Redirecting to Stripe Checkout:", data.url)
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("❌ Error creating checkout session:", error)
      setError(error.message || "Failed to create checkout session")
    } finally {
      setLoading(false)
    }
  }

  // Show login prompt for unauthenticated users
  if (!user) {
    return (
      <Button onClick={() => router.push("/login")} className="w-full">
        <Lock className="h-4 w-4 mr-2" />
        Login to Purchase
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button onClick={handlePurchase} disabled={loading || disabled} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Checkout...
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            {title} - ${(price / 100).toFixed(2)} {currency}
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Badge variant="outline" className="text-xs">
          Buyer: {user.email}
        </Badge>
        <Badge variant="outline" className="text-xs">
          UID: {user.uid.substring(0, 8)}...
        </Badge>
      </div>
    </div>
  )
}
