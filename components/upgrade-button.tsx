"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

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

    if (!user) {
      // Use current site URL for login redirect
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      router.push(`${siteUrl}/login?redirect=/membership-plans`)
      return
    }

    // Redirect to membership plans page
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    router.push(`${siteUrl}/membership-plans`)
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
