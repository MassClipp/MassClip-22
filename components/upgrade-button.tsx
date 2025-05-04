"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface UpgradeButtonProps {
  className?: string
  children?: React.ReactNode
  onClick?: () => void
}

export default function UpgradeButton({ className = "", children, onClick }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const handleUpgrade = async () => {
    if (onClick) {
      onClick()
      return
    }

    if (!user) {
      router.push("/login?redirect=/membership-plans")
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
            userId: user.uid,
            action: "upgrade_click",
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error("Failed to log payment click:", error)
        // Continue anyway, as this is not critical
      }

      // Create checkout session
      console.log(`Creating checkout session for user ${user.uid} with email ${user.email}`)
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
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
    <button
      onClick={handleUpgrade}
      disabled={isLoading}
      className={`premium-button bg-crimson hover:bg-crimson-dark text-white font-light text-sm py-2 px-4 rounded-md transition-all duration-300 ${className}`}
    >
      {isLoading ? "Loading..." : children || "Upgrade to Creator Pro"}
    </button>
  )
}
