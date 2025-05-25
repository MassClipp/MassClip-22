"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getSiteUrl } from "@/lib/url-utils"
import { useState } from "react"

interface DirectPaymentLinkProps {
  className?: string
  children?: React.ReactNode
  onClick?: () => void
  trackingId?: string
}

export default function DirectPaymentLink({ className = "", children, onClick, trackingId }: DirectPaymentLinkProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [hasLogged, setHasLogged] = useState(false)

  // Log click for analytics
  const logClick = async () => {
    if (hasLogged || !trackingId) return

    try {
      await fetch("/api/log-payment-click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackingId,
          userId: user?.uid || "anonymous",
        }),
      })
      setHasLogged(true)
    } catch (error) {
      console.error("Failed to log payment click:", error)
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }

    logClick()

    // Get current site URL
    const currentSiteUrl = getSiteUrl()

    if (!user) {
      // Redirect to login first
      router.push(`${currentSiteUrl}/login?redirect=/membership-plans`)
      return
    }

    // Direct to membership plans
    router.push(`${currentSiteUrl}/membership-plans`)
  }

  return (
    <button
      onClick={handleClick}
      className={`bg-crimson hover:bg-crimson-dark text-white font-medium py-2 px-4 rounded-md transition-all duration-300 ${className}`}
    >
      {children || "Get Creator Pro"}
    </button>
  )
}
