"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getCurrentDomain } from "@/lib/url-utils"

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

    // Get the current domain from the browser
    const currentDomain = getCurrentDomain()

    if (!user) {
      // Use current domain for login redirect
      router.push(`${currentDomain}/login?redirect=/membership-plans`)
      return
    }

    // Redirect to membership plans page on current domain
    router.push(`${currentDomain}/membership-plans`)
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
