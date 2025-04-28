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
      router.push("/login?redirect=/membership-plans")
      return
    }

    // Redirect to membership plans page
    router.push("/membership-plans")
  }

  return (
    <button onClick={handleSubscribe} className={`vault-button inline-block scale-90 ${className}`}>
      <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300 bg-transparent">
        {children || "Upgrade to Pro"}
      </span>
    </button>
  )
}
