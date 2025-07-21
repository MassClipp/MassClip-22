"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import StripeExpressOnboarding from "@/components/stripe-express-onboarding"
import { Loader2 } from "lucide-react"

interface OnboardingStatus {
  connected: boolean
  onboardingRequired: boolean
}

export default function EarningsPage() {
  const { user, loading } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Check if user needs onboarding
  const checkOnboardingStatus = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOnboardingStatus(data)
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  useEffect(() => {
    if (user && !loading) {
      checkOnboardingStatus()
    }
  }, [user, loading])

  // Show loading state
  if (loading || isCheckingStatus) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading earnings dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Stripe Account Setup/Status */}
      <StripeExpressOnboarding />

      {/* Earnings Overview - Show only if connected */}
      {onboardingStatus?.connected && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Earnings Overview</h2>
          <p className="text-zinc-400 mb-4">Your earnings and payout information</p>
          <p className="text-zinc-400">Your earnings dashboard will appear here once you start making sales.</p>
        </div>
      )}
    </div>
  )
}
