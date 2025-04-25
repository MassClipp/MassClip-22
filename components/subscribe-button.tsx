"use client"

import type React from "react"
import { useState } from "react"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useToast } from "@/hooks/use-toast"

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
      // Just redirect to Stripe checkout without trying to upgrade the plan immediately
      // The webhook will handle the upgrade after successful payment
      window.location.href = "https://buy.stripe.com/test_cN27uB5Jb1Bg316bII"
    } catch (error) {
      console.error("Error redirecting to payment page:", error)
      setIsLoading(false)
    }
    // No need for finally block as the page will be redirected
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
