"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface UnlockButtonProps {
  bundleId?: string
  productBoxId?: string
  ebookId?: string // Added ebookId prop
  price: number
  title: string
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  stripePriceId?: string
  user?: any
  creatorId?: string
}

export function UnlockButton({
  bundleId,
  productBoxId,
  ebookId, // Added ebookId parameter
  price,
  title,
  className = "",
  variant = "default",
  stripePriceId,
  user,
  creatorId,
}: UnlockButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user: authUser } = useAuth()
  const router = useRouter()

  // Use the passed user or fall back to auth context user
  const currentUser = user || authUser

  const handleUnlock = async () => {
    try {
      setIsLoading(true)

      if (!currentUser) {
        console.log("⚠️ [Unlock Button] User not authenticated, showing login toast")

        // Show custom toast with gradient background and login button
        toast({
          title: "Login Required",
          description: "You need to login or create an account to purchase content.",
          variant: "default",
          className: "bg-gradient-to-br from-black via-black to-zinc-800/30 border-zinc-700/50 text-white",
          action: (
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              Login
            </Button>
          ),
        })
        return
      }

      // Get the Firebase ID token for authentication
      let idToken = ""
      try {
        idToken = await currentUser.getIdToken()
        console.log("🔑 [Unlock Button] Got auth token for user:", currentUser.uid)
      } catch (error) {
        console.error("❌ [Unlock Button] Failed to get auth token:", error)
        toast({
          title: "Authentication Error",
          description: "Please try signing in again",
          variant: "destructive",
        })
        return
      }

      const itemId = bundleId || productBoxId || ebookId
      if (!itemId) {
        throw new Error("No product, bundle, or eBook ID provided")
      }

      console.log("🔓 [Unlock Button] Starting checkout:", {
        itemId,
        itemType: ebookId ? "ebook" : bundleId ? "bundle" : "product_box",
        userUid: currentUser?.uid || "anonymous",
        hasToken: !!idToken,
      })

      const requestBody: any = {
        idToken,
        successUrl: `${window.location.origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      }

      if (bundleId) requestBody.bundleId = bundleId
      if (productBoxId) requestBody.productBoxId = productBoxId
      if (ebookId) requestBody.ebookId = ebookId

      // Create checkout session with authentication token
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url, sessionId, buyerUid } = await response.json()

      console.log("✅ [Unlock Button] Checkout session created:", {
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
      console.error("❌ [Unlock Button] Purchase failed:", error)
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
    <Button onClick={handleUnlock} disabled={isLoading} className={className} variant={variant}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>Buy Now</>
      )}
    </Button>
  )
}
