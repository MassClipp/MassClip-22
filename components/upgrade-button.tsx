"use client"

import type React from "react"
import { useRouter } from "next/navigation"

interface UpgradeButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function UpgradeButton({ className = "", children }: UpgradeButtonProps) {
  const router = useRouter()

  const handleSubscribe = () => {
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
