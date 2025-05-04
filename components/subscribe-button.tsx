"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { getSiteUrl } from "@/lib/url-utils"

interface SubscribeButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function SubscribeButton({ className = "", children }: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  const handleSubscribe = async () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    setIsLoading(true)

    try {
      // Use getSiteUrl instead of getCurrentDomain to avoid location usage
      const siteUrl = getSiteUrl()

      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          siteUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { url } = await response.json()

      // This uses window.location which is browser-only
      // But this component is client-side only, so it's safe
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Subscribe error:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSubscribe}
      disabled={isLoading}
      className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
    >
      {isLoading ? "Loading..." : children || "Subscribe Now"}
    </Button>
  )
}
