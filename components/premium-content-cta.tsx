"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { DollarSign, Lock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getStripe } from "@/lib/stripe-client"

interface PremiumContentCTAProps {
  creator: {
    uid: string
    displayName: string
    username: string
    premiumEnabled?: boolean
    premiumPrice?: number
    stripePriceId?: string
    paymentMode?: "one-time" | "subscription"
  }
}

export default function PremiumContentCTA({ creator }: PremiumContentCTAProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  if (!creator.premiumEnabled || !creator.stripePriceId || !creator.premiumPrice) {
    return null
  }

  const handleCheckout = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=/creator/${creator.username}`
      return
    }

    try {
      setIsLoading(true)

      // Get the user's email
      const buyerEmail = user.email

      if (!buyerEmail) {
        toast({
          title: "Error",
          description: "Your account doesn't have an email address. Please update your profile.",
          variant: "destructive",
        })
        return
      }

      // Call the checkout API
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: creator.stripePriceId,
          creatorId: creator.uid,
          buyerEmail: buyerEmail,
          buyerId: user.uid,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      // Redirect to Stripe Checkout using the client-side Stripe initialization
      const stripe = await getStripe()
      if (data.sessionId) {
        await stripe?.redirectToCheckout({ sessionId: data.sessionId })
      } else if (data.url) {
        // Fallback to direct URL if sessionId is not provided
        window.location.href = data.url
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="font-medium text-white">Premium Content</h3>
            <p className="text-sm text-zinc-400">Unlock exclusive content from {creator.displayName}</p>
          </div>
        </div>
        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-1" />
              {creator.paymentMode === "subscription"
                ? `Subscribe - $${creator.premiumPrice.toFixed(2)}/month`
                : `Unlock - $${creator.premiumPrice.toFixed(2)}`}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
