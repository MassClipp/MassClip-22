"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, DollarSign, Calendar } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface VideoPurchaseButtonProps {
  videoId: string
  flatPrice: number
  subscriptionPrice: number
  pricingModel: "flat" | "subscription" | null
  title: string
  hasAccess: boolean
  className?: string
}

export default function VideoPurchaseButton({
  videoId,
  flatPrice,
  subscriptionPrice,
  pricingModel,
  title,
  hasAccess,
  className,
}: VideoPurchaseButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<"flat" | "subscription">(pricingModel || "flat")

  const handlePurchase = async (model: "flat" | "subscription" = selectedModel) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase videos",
        variant: "destructive",
      })
      return
    }

    if (hasAccess) {
      toast({
        title: "Already Owned",
        description: "You already have access to this video",
      })
      return
    }

    try {
      setIsLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          videoId,
          pricingModel: model,
        }),
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
        title: "Purchase Error",
        description: error instanceof Error ? error.message : "Failed to start purchase process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAccess) {
    return (
      <Button variant="outline" disabled className={className}>
        <Lock className="h-4 w-4 mr-2" />
        Owned
      </Button>
    )
  }

  // If creator only offers one pricing model, show a simple button
  if (pricingModel) {
    return (
      <Button
        onClick={() => handlePurchase(pricingModel)}
        disabled={isLoading}
        className={`bg-green-600 hover:bg-green-700 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : pricingModel === "flat" ? (
          <>
            <DollarSign className="h-4 w-4 mr-2" />
            Buy for ${flatPrice.toFixed(2)}
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4 mr-2" />
            Subscribe for ${subscriptionPrice.toFixed(2)}/month
          </>
        )}
      </Button>
    )
  }

  // If creator offers both pricing models, show a dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading} className={`bg-green-600 hover:bg-green-700 ${className}`}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Purchase Options
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlePurchase("flat")}>
          <DollarSign className="h-4 w-4 mr-2" />
          One-time payment: ${flatPrice.toFixed(2)}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlePurchase("subscription")}>
          <Calendar className="h-4 w-4 mr-2" />
          Monthly subscription: ${subscriptionPrice.toFixed(2)}/month
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
