"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface UpgradeButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function UpgradeButton({ className = "", children }: UpgradeButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()

  const handleSubscribe = () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    // If we're not already on the pricing page, redirect there first
    if (pathname !== "/pricing") {
      router.push("/pricing")
      return
    }

    // Only redirect to Stripe checkout if we're already on the pricing page
    // This should never happen with the current implementation, as the pricing page
    // uses the SubscribeButton component instead of UpgradeButton
    // But we'll keep this as a fallback
    router.push("/pricing")
  }

  return (
    <button onClick={handleSubscribe} className={`vault-button inline-block scale-90 ${className}`}>
      <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300 bg-transparent">
        {children || "Upgrade to Pro"}
      </span>
    </button>
  )
}
