"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

interface UpgradeButtonProps {
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  navigateOnly?: boolean
}

export default function UpgradeButton({ children, className, onClick, navigateOnly = false }: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { isProUser, loading: planLoading } = useUserPlan()

  // If loading or user is already a pro user, don't show the button
  if (planLoading || isProUser) {
    return null
  }

  const handleClick = async () => {
    if (onClick) {
      onClick()
    }

    // If navigateOnly is true, just navigate to the membership plans page
    if (navigateOnly) {
      router.push("/membership-plans")
      return
    }

    try {
      setIsLoading(true)

      // Log the payment click for analytics
      try {
        await fetch("/api/log-payment-click", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.uid || "anonymous",
            source: "upgrade_button",
          }),
        })
      } catch (error) {
        console.error("Failed to log payment click:", error)
      }

      // Get idToken for secure authentication on the backend
      const idToken = await user?.getIdToken?.()
      if (!idToken) {
        throw new Error("Could not get user authentication token.")
      }

      // Create checkout session using the membership endpoint for consistency
      const response = await fetch("/api/stripe/checkout/membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create checkout session")
      }

      const data = await response.json()
      if (data.url) {
        router.push(data.url)
      } else {
        throw new Error("Checkout URL not received from server.")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      // If there's an error, redirect to the membership plans page as a fallback
      router.push("/membership-plans")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "bg-crimson hover:bg-crimson-dark text-white",
        isLoading && "opacity-70 cursor-not-allowed",
        className,
      )}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children || "Upgrade to Pro"
      )}
    </Button>
  )
}
