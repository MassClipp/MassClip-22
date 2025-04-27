"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

// Direct Stripe checkout link
const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/8wMdTW1A64PW1fqfZ0"

export function SubscribeButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleSubscription = async () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    try {
      setIsLoading(true)
      console.log("Redirecting to Stripe checkout for user:", user.uid)

      // Direct redirect to Stripe checkout link
      window.location.href = STRIPE_CHECKOUT_URL
    } catch (error) {
      console.error("Error redirecting to checkout:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleSubscription} disabled={isLoading} className={className || "w-full"} variant="default">
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </Button>
  )
}
