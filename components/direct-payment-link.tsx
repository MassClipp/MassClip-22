"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface DirectPaymentLinkProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  children?: React.ReactNode
}

export function DirectPaymentLink({
  className,
  variant = "default",
  size = "default",
  children = "Subscribe Now",
}: DirectPaymentLinkProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // The direct Stripe payment link
  const PAYMENT_LINK = "https://buy.stripe.com/cN22be92y96c3nybIL"

  const handleClick = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login or create an account first.",
        variant: "destructive",
      })
      return
    }

    setIsRedirecting(true)

    try {
      // Log the payment attempt in Firestore for tracking
      // This is optional but helpful for analytics
      const response = await fetch("/api/log-payment-click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          timestamp: new Date().toISOString(),
          paymentLink: PAYMENT_LINK,
        }),
      })

      // Redirect to the Stripe payment link
      window.location.href = PAYMENT_LINK
    } catch (error) {
      console.error("Error logging payment click:", error)
      // Still redirect even if logging fails
      window.location.href = PAYMENT_LINK
      setIsRedirecting(false)
    }
  }

  return (
    <Button onClick={handleClick} className={className} variant={variant} size={size} disabled={isRedirecting}>
      {isRedirecting ? "Redirecting..." : children}
    </Button>
  )
}
