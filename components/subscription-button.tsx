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

      let idToken = ""
      try {
        idToken = await user.getIdToken()
      } catch (error) {
        console.error("Failed to get auth token:", error)
        toast({
          title: "Authentication Error",
          description: "Please try signing in again",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/stripe/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          uid: user.uid,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create subscription session")
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error("Subscribe failed:", error)
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
