"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { Loader2, Crown } from "lucide-react"

interface SubscriptionButtonProps {
  planName: string
  price: number
  className?: string
}

export function SubscriptionButton({ planName, price, className = "" }: SubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleSubscribe = async () => {
    try {
      setIsLoading(true)

      if (!user) {
        toast({
          title: "Sign In Required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        })
        return
      }

      console.log("👑 [Subscription] Starting API-created subscription checkout (server uses STRIPE_PRICE_ID)", {
        userUid: user.uid,
      })

      const response = await fetch("/api/stripe/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerUid: user.uid, // server will use this to tie the session to the user
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create subscription session")
      }

      const { url, sessionId } = await response.json()
      console.log("✅ [Subscription] Checkout session created:", { sessionId, hasUrl: !!url })

      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("❌ [Subscription] Subscribe failed:", error)
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscribe} disabled={isLoading} className={className}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Crown className="mr-2 h-4 w-4" />
          Subscribe to {planName} - ${price}/month
        </>
      )}
    </Button>
  )
}
