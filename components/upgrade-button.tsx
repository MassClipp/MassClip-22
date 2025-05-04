"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getSiteUrl } from "@/lib/url-utils"

interface UpgradeButtonProps {
  className?: string
  children?: React.ReactNode
  onClick?: () => void
}

export default function UpgradeButton({ className = "", children, onClick }: UpgradeButtonProps) {
  const router = useRouter()
  const { user } = useAuth()

  const handleSubscribe = () => {
    if (onClick) {
      onClick()
      return
    }

    // Get the current site URL from environment variables
    const currentSiteUrl = getSiteUrl()

    if (!user) {
      // Use current site URL for login redirect
      router.push(`${currentSiteUrl}/login?redirect=/membership-plans`)
      return
    }

    // Redirect to membership plans page on current site
    router.push(`${currentSiteUrl}/membership-plans`)
  }

  return (
    <button
      onClick={handleSubscribe}
      className={`premium-button bg-crimson hover:bg-crimson-dark text-white font-light text-sm py-2 px-4 rounded-md transition-all duration-300 ${className}`}
    >
      {children || "Upgrade to Creator Pro"}
    </button>
  )
}
