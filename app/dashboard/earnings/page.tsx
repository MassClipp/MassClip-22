"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import StripeExpressOnboarding from "@/components/stripe-express-onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp } from "lucide-react"

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading earnings dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings Dashboard</h1>
          <p className="text-gray-600">
            {onboardingStatus?.connected
              ? "Track your earnings and manage your payment settings"
              : "Set up your payment account to start earning from your content"}
          </p>
        </div>

        <div className="space-y-8">
          {/* Stripe Account Setup/Status */}
          <StripeExpressOnboarding />

          {/* Earnings Overview - Show only if connected */}
          {onboardingStatus?.connected && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">Earnings Overview</CardTitle>
                    <CardDescription className="text-gray-600">Your revenue and payout information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Start Earning</h3>
                  <p className="text-gray-600 mb-4">
                    Your earnings dashboard will populate once you start making sales.
                  </p>
                  <p className="text-sm text-gray-500">
                    Upload content and share it with your audience to begin generating revenue.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
