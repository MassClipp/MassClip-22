"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface SubscribeButtonProps {
  children?: React.ReactNode
  className?: string
  priceId?: string
}

export function SubscribeButton({ children, className = "", priceId }: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    setIsLoading(true)

    try {
      console.log("Creating checkout session with user ID:", user.uid)

      // Use the STRIPE_PRICE_ID from environment variables if priceId is not provided
      const actualPriceId = priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID

      if (!actualPriceId) {
        throw new Error("Price ID is not defined")
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          priceId: actualPriceId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()

      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading}
      className={`w-full py-2 px-4 bg-crimson text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 ${className}`}
    >
      {isLoading ? "Loading..." : children || "Upgrade to Pro"}
    </button>
  )
}
