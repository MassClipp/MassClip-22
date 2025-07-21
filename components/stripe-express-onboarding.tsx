"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, CheckCircle, RefreshCw } from "lucide-react"

interface OnboardingStatus {
  connected: boolean
  accountId?: string
  onboardingRequired: boolean
  account?: {
    id: string
    type: string
    country: string
    email?: string
    details_submitted: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    requirements?: any
  }
}

export default function StripeExpressOnboarding() {
  const { user } = useAuth()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get Firebase ID token
  const getIdToken = async () => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error("Failed to get ID token:", error)
      return null
    }
  }

  // Check onboarding status
  const checkOnboardingStatus = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/onboarding-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setStatus(data)
      console.log("Onboarding status:", data)
    } catch (error) {
      console.error("Error checking onboarding status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create Express account and start onboarding
  const startOnboarding = async () => {
    if (!user) return

    setIsCreating(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      console.log("Creating Express account...")

      const response = await fetch("/api/stripe/connect/create-express-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country: "US",
          businessType: "individual",
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Express account created:", data)

      if (data.alreadyConnected) {
        await checkOnboardingStatus() // Refresh status
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error creating Express account:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // Refresh onboarding link
  const refreshOnboardingLink = async () => {
    if (!user) return

    setIsRefreshing(true)

    try {
      const token = await getIdToken()
      if (!token) throw new Error("Failed to get authentication token")

      const response = await fetch("/api/stripe/connect/refresh-onboarding-link", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("Onboarding link refreshed:", data)

      if (data.onboardingUrl) {
        // Redirect to refreshed Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error refreshing onboarding link:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Check status on component mount and when user changes
  useEffect(() => {
    if (user) {
      checkOnboardingStatus()
    }
  }, [user])

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connect Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className={`h-5 w-5 ${status?.connected ? "text-green-500" : "text-zinc-500"}`} />
            <h2 className="text-xl font-semibold text-white">Stripe Connect Status</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkOnboardingStatus}
            disabled={isLoading}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="text-zinc-400 mb-6">
          {isLoading
            ? "Checking connection status..."
            : status?.connected
              ? "Your Stripe account is fully connected and ready to accept payments"
              : "Connect your Stripe account to start accepting payments"}
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">Status:</span>
              <Badge
                variant={status.connected ? "default" : "secondary"}
                className={status.connected ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {status.connected ? "Connected" : "Setup Required"}
              </Badge>
            </div>

            {status.accountId && (
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Account ID:</span>
                <code className="text-zinc-300 text-sm">{status.accountId}</code>
              </div>
            )}

            {status.account && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Details Submitted:</span>
                    <Badge
                      variant={status.account.details_submitted ? "default" : "secondary"}
                      className={status.account.details_submitted ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {status.account.details_submitted ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Charges Enabled:</span>
                    <Badge
                      variant={status.account.charges_enabled ? "default" : "secondary"}
                      className={status.account.charges_enabled ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {status.account.charges_enabled ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Payouts Enabled:</span>
                    <Badge
                      variant={status.account.payouts_enabled ? "default" : "secondary"}
                      className={status.account.payouts_enabled ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {status.account.payouts_enabled ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Country:</span>
                    <span className="text-zinc-300">{status.account.country}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-zinc-400">Unable to check connection status</p>
        )}
      </div>

      {/* Account Management */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Account Management</h2>
        <p className="text-zinc-400 mb-6">
          {status?.connected
            ? "Your Stripe account is ready to process payments"
            : "Set up your Stripe Express account to start accepting payments"}
        </p>

        {!status?.connected ? (
          <div className="space-y-4">
            {!status?.accountId ? (
              // No account exists - create new one
              <Button
                onClick={startOnboarding}
                disabled={isCreating}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Stripe Account
                  </>
                )}
              </Button>
            ) : (
              // Account exists but onboarding incomplete
              <div className="space-y-3">
                <p className="text-zinc-400 text-sm">
                  Your Stripe account needs to complete onboarding to accept payments.
                </p>
                <Button
                  onClick={refreshOnboardingLink}
                  disabled={isRefreshing}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Stripe Setup
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Account is fully connected
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-white">Stripe account connected successfully!</h3>
              <p className="text-zinc-400">You can now accept payments and receive payouts.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
