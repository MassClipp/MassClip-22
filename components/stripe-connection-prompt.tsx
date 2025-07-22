"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  CreditCard,
  Globe,
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Building2,
  User,
} from "lucide-react"

interface ConnectionStatus {
  isConnected: boolean
  accountId: string | null
  businessType: "individual" | "company" | null
  capabilities: {
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  } | null
}

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
  existingStatus?: ConnectionStatus | null
}

export default function StripeConnectionPrompt({ onConnectionSuccess, existingStatus }: StripeConnectionPromptProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start Stripe Connect onboarding")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        onConnectionSuccess?.()
      } else if (data.onboardingUrl) {
        console.log(`🔗 ${data.resuming ? "Resuming" : "Starting"} Stripe onboarding`)
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error connecting to Stripe:", error)
      alert(`Failed to connect to Stripe: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueSetup = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.accountDeleted) {
          window.location.reload()
          return
        }
        throw new Error(errorData.error || "Failed to continue setup")
      }

      const data = await response.json()
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      } else if (data.onboardingComplete) {
        onConnectionSuccess?.()
      }
    } catch (error: any) {
      console.error("Error continuing setup:", error)
      alert(`Failed to continue setup: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getBusinessTypeMessage = (businessType: string | null) => {
    if (!businessType || businessType === "individual") {
      return {
        icon: <User className="h-5 w-5 text-blue-600" />,
        title: "Individual Creator Account",
        message: "Perfect for getting started quickly with personal content creation",
      }
    }

    return {
      icon: <Building2 className="h-5 w-5 text-purple-600" />,
      title: "Business Account",
      message: "Great choice for serious creators with higher volume and business structure",
    }
  }

  // If account exists but needs completion
  if (existingStatus?.accountId && !existingStatus.isConnected) {
    const needsAction =
      existingStatus.capabilities?.currently_due?.length > 0 || existingStatus.capabilities?.past_due?.length > 0
    const businessTypeInfo = getBusinessTypeMessage(existingStatus.businessType)

    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Complete Your Stripe Setup</CardTitle>
            <CardDescription>
              Your Stripe account needs additional information to start accepting payments
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {existingStatus.businessType && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {businessTypeInfo.icon}
                  <div>
                    <h4 className="font-medium text-blue-900">{businessTypeInfo.title}</h4>
                    <p className="text-sm text-blue-700">{businessTypeInfo.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Current Status:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  {existingStatus.capabilities?.charges_enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-sm">Accept Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  {existingStatus.capabilities?.payouts_enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="text-sm">Receive Payouts</span>
                </div>
              </div>
            </div>

            {needsAction && existingStatus.capabilities && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Action Required:</h4>
                <div className="text-sm text-red-700 space-y-1">
                  {existingStatus.capabilities.past_due.length > 0 && (
                    <p>• Past due: {existingStatus.capabilities.past_due.join(", ")}</p>
                  )}
                  {existingStatus.capabilities.currently_due.length > 0 && (
                    <p>• Currently due: {existingStatus.capabilities.currently_due.join(", ")}</p>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleContinueSetup} disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Continue Stripe Setup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default connection prompt for new users
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl">Connect Your Stripe Account</CardTitle>
          <CardDescription className="text-lg">Start accepting payments and track your earnings</CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <div className="mx-auto mb-3 p-2 bg-green-100 rounded-full w-fit">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Accept Payments</h3>
              <p className="text-sm text-gray-600">Process payments from customers worldwide</p>
            </div>

            <div className="text-center p-6 border rounded-lg">
              <div className="mx-auto mb-3 p-2 bg-blue-100 rounded-full w-fit">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Global Reach</h3>
              <p className="text-sm text-gray-600">Supported in 40+ countries</p>
            </div>

            <div className="text-center p-6 border rounded-lg">
              <div className="mx-auto mb-3 p-2 bg-purple-100 rounded-full w-fit">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm text-gray-600">Bank-level security and encryption</p>
            </div>
          </div>

          {/* Main CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Ready to Start Earning?</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Quick 5-minute setup</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>2.9% + 30¢ per transaction</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Automatic payouts to your bank</span>
                </div>
              </div>

              <Button onClick={handleConnect} disabled={isLoading || !user} className="w-full max-w-md" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect with Stripe
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 max-w-md mx-auto">
                By connecting, you'll be redirected to Stripe to securely set up your account. You can choose between
                individual or business account types during setup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
