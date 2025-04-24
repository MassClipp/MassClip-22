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
      // Get the current user and their ID token
      const auth = getAuth()
      const user = auth.currentUser

      if (!user) {
        throw new Error("You must be logged in to subscribe")
      }

      // Get a fresh ID token
      const idToken = await user.getIdToken(true)

      console.log("Starting subscription process for user:", user.uid)

      // Call our API to create a checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: user.uid, // Explicitly include userId in request body as backup
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Error starting subscription:", error)
      toast({
        title: "Subscription Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      })
      setIsLoading(false)
    }
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
