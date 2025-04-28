"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

// Direct Stripe checkout link
const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/8wMdTW1A64PW1fqfZ0"

interface UpgradeButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function UpgradeButton({ className = "", children }: UpgradeButtonProps) {
  const router = useRouter()
  const { user } = useAuth()

  const handleSubscribe = () => {
    if (!user) {
      router.push("/login?redirect=/pricing")
      return
    }

    // Direct redirect to Stripe checkout
    window.location.href = STRIPE_CHECKOUT_URL
  }

  return (
    <button onClick={handleSubscribe} className={`vault-button inline-block scale-90 ${className}`}>
      <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300 bg-transparent">
        {children || "Upgrade to Pro"}
      </span>
    </button>
  )
}
