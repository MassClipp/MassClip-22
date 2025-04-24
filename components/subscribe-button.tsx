"use client"

import type React from "react"
import { useState } from "react"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useToast } from "@/hooks/use-toast"
import { getAuth } from "firebase/auth"

interface SubscribeButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  children?: React.ReactNode
}

export default function SubscribeButton({
  variant = "default",
  size = "default",
  className = "",
  children = "Upgrade to Pro",
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { upgradeToPro, isProUser } = useUserPlan()
  const { toast } = useToast()

  const handleSubscribe = async () => {
    // If already a pro user, show a message
    if (isProUser) {
      toast({
        title: "Already Subscribed",
        description: "You're already on the Pro plan!",
      })
      return
    }

    setIsLoading(true)

    try {
      // Get the current user
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to subscribe.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Get the ID token
      const idToken = await user.getIdToken()

      // Call our API to create a checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      })
      setIsLoading(false)
    }
    // No finally block as we're redirecting on success
  }

  return (
    <button
      onClick={handleSubscribe}
      className={`vault-button inline-block scale-90 ${className}`}
      disabled={isLoading}
    >
      <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300 bg-transparent">
        {isLoading ? "Processing..." : children}
      </span>
    </button>
  )
}
