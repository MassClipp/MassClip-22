"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Lock, DollarSign } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface VideoPurchaseButtonProps {
  productBoxId: string
  priceInCents: number
  title: string
  hasAccess: boolean
  className?: string
}

export default function VideoPurchaseButton({
  productBoxId,
  priceInCents,
  title,
  hasAccess,
  className,
}: VideoPurchaseButtonProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase content",
        variant: "destructive",
      })
      return
    }

    if (hasAccess) {
      toast({
        title: "Already Owned",
        description: "You already have access to this content",
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
          productBoxId,
          priceInCents,
        }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Purchase error:", error)
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

  return (
    <Button onClick={handlePurchase} disabled={isLoading} className={`bg-green-600 hover:bg-green-700 ${className}`}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <DollarSign className="h-4 w-4 mr-2" />
          Buy for {formatPrice(priceInCents)}
        </>
      )}
    </Button>
  )
}
