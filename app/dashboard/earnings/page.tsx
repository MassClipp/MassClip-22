"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import StripeExpressOnboarding from "@/components/stripe-express-onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Show onboarding if needed
  if (onboardingStatus && !onboardingStatus.connected) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
          <p className="text-muted-foreground">Set up your Stripe account to start earning from your content</p>
        </div>

        <StripeExpressOnboarding />
      </div>
    )
  }

  // Show main earnings dashboard
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Earnings Dashboard</h1>
        <p className="text-muted-foreground">Track your earnings and manage your Stripe account</p>
      </div>

      <div className="grid gap-6">
        {/* Stripe Account Status */}
        <StripeExpressOnboarding />

        {/* Earnings Overview - This would be your existing earnings components */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>Your earnings and payout information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your earnings dashboard will appear here once you start making sales.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
