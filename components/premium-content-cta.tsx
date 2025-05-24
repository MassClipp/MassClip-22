"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Lock, DollarSign, CalendarClock, Loader2 } from "lucide-react"

interface PremiumContentCTAProps {
  creatorId: string
  creatorName: string
  priceId: string
  price: number
  paymentMode: "one-time" | "subscription"
}

export default function PremiumContentCTA({
  creatorId,
  creatorName,
  priceId,
  price,
  paymentMode,
}: PremiumContentCTAProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    try {
      setIsLoading(true)

      // Prepare request data
      const requestData = {
        priceId,
        creatorId,
        buyerEmail: user?.email,
      }

      // Get ID token if user is logged in
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (user) {
        const idToken = await user.getIdToken()
        headers["Authorization"] = `Bearer ${idToken}`
      }

      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers,
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
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
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-medium text-white text-lg">Unlock Premium Content</h3>
            <p className="text-zinc-400 text-sm">Get exclusive access to {creatorName}'s premium content</p>
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white min-w-[140px]"
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center">
              {paymentMode === "subscription" ? (
                <>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Subscribe ${price.toFixed(2)}/mo
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Buy Now ${price.toFixed(2)}
                </>
              )}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
