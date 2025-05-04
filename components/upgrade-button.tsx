"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface UpgradeButtonProps {
  userId: string
  email: string
  className?: string
  children?: React.ReactNode
}

export function UpgradeButton({ userId, email, className, children }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleUpgrade = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to upgrade",
        variant: "destructive",
      })
      return
    }

    if (!email) {
      toast({
        title: "Error",
        description: "Email is required for checkout",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Log the click for analytics
      try {
        await fetch("/api/log-payment-click", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            action: "upgrade_click",
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error("Failed to log payment click:", error)
        // Continue anyway, as this is not critical
      }

      // Create checkout session
      console.log(`Creating checkout session for user ${userId} with email ${email}`)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email,
          siteUrl: "https://massclip.pro", // Hardcoded for production
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create checkout session")
      }

      const { url } = await response.json()

      if (url) {
        console.log(`Redirecting to checkout URL: ${url}`)
        window.location.href = url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error: any) {
      console.error("Upgrade error:", error)
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleUpgrade} disabled={isLoading} className={className}>
      {isLoading ? "Loading..." : children || "Upgrade to Creator Pro"}
    </Button>
  )
}
