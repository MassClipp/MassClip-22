"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Shield,
  Zap,
  DollarSign,
  CreditCard,
  TrendingUp,
  Globe,
} from "lucide-react"

interface ConnectionStatus {
  connected: boolean
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
  account: {
    country: string
    email: string
    type: string
    businessType: string
  } | null
  message: string
}

interface StripeConnectionPromptProps {
  onConnectionSuccess?: () => void
  existingStatus?: ConnectionStatus | null
}

export default function StripeConnectionPrompt({ onConnectionSuccess, existingStatus }: StripeConnectionPromptProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAccount = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

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
        console.log(`🔗 Starting Stripe onboarding:`, data.onboardingUrl)
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error creating Stripe account:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

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
        throw new Error(errorData.error || "Failed to connect existing account")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        onConnectionSuccess?.()
      } else if (data.onboardingUrl) {
        console.log(`🔗 Connecting existing account:`, data.onboardingUrl)
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error connecting existing account:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueSetup = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

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
        throw new Error(errorData.error || "Failed to continue setup")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        onConnectionSuccess?.()
      } else if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl
      } else if (data.accountDeleted) {
        window.location.reload()
      }
    } catch (error: any) {
      console.error("Error continuing setup:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Show incomplete setup prompt if account exists but needs completion
  if (existingStatus?.accountId && !existingStatus.connected) {
    const needsAction =
      existingStatus.capabilities?.currently_due?.length > 0 || existingStatus.capabilities?.past_due?.length > 0

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Complete Your Stripe Setup</h1>
          <p className="text-zinc-400">Finish setting up your account to start earning</p>
        </div>

        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-white">Setup In Progress</CardTitle>
            </div>
            <CardDescription>{existingStatus.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsAction && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">Action Required</h4>
                <p className="text-sm text-orange-700 mb-3">
                  Stripe needs additional information to complete your account setup.
                </p>
                <Button onClick={handleContinueSetup} disabled={isLoading} className="w-full">
                  {isLoading ? "Loading..." : "Complete Setup"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {!needsAction && existingStatus.capabilities?.details_submitted && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Under Review</h4>
                <p className="text-sm text-blue-700">
                  Your account is being reviewed by Stripe. This typically takes 1-2 business days.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show main connection prompt
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Connect with Stripe</h1>
        <p className="text-zinc-400">Set up payments to start earning from your content</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create New Account */}
        <Card className="bg-zinc-900/60 border-zinc-800/50 hover:border-blue-500/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Zap className="h-5 w-5 text-blue-400" />
              </div>
              <CardTitle className="text-white">Create New Stripe Account</CardTitle>
            </div>
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Automatic payouts to your bank</span>
              </div>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={isLoading || !user}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Create Stripe Account
                </>
              )}
            </Button>
            <p className="text-xs text-zinc-500 text-center">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        {/* Connect Existing Account */}
        <Card className="bg-zinc-900/60 border-zinc-800/50 hover:border-green-500/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-green-400" />
              </div>
              <CardTitle className="text-white">Already Have a Stripe Account?</CardTitle>
            </div>
            <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Stripe handles account verification</span>
              </div>
            </div>

            {existingStatus?.accountId && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Failed to create Stripe account</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleConnectExisting}
              disabled={isLoading || !user}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with Stripe
                </>
              )}
            </Button>
            <p className="text-xs text-zinc-500 text-center">
              Stripe will detect your existing account and connect it securely
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-500/10 rounded-lg w-fit mx-auto">
                <CreditCard className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium text-white">Connect Account</h3>
              <p className="text-sm text-zinc-400">Link your Stripe account securely through our platform</p>
            </div>
            <div className="text-center space-y-2">
              <div className="p-3 bg-green-500/10 rounded-lg w-fit mx-auto">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-medium text-white">Start Earning</h3>
              <p className="text-sm text-zinc-400">Customers can purchase your content with secure payments</p>
            </div>
            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-500/10 rounded-lg w-fit mx-auto">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-medium text-white">Get Paid</h3>
              <p className="text-sm text-zinc-400">Receive automatic payouts to your bank account</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-900/20 border-red-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Connection Error</span>
            </div>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
