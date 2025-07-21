"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

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
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

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
    setMessage("")
    setMessageType("")

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
      setMessage(`Error checking status: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
    } finally {
      setIsLoading(false)
    }
  }

  // Create Express account and start onboarding
  const startOnboarding = async () => {
    if (!user) return

    setIsCreating(true)
    setMessage("")
    setMessageType("")

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
          country: "US", // Can be made configurable
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
        setMessage("Stripe account already connected!")
        setMessageType("success")
        await checkOnboardingStatus() // Refresh status
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error("Error creating Express account:", error)
      setMessage(`Error creating account: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
    } finally {
      setIsCreating(false)
    }
  }

  // Refresh onboarding link
  const refreshOnboardingLink = async () => {
    if (!user) return

    setIsRefreshing(true)
    setMessage("")
    setMessageType("")

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
      setMessage(`Error refreshing link: ${error instanceof Error ? error.message : "Unknown error"}`)
      setMessageType("error")
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

  // Show loading state
  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please log in to set up Stripe payments.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status?.connected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            Stripe Connect Status
            <Button variant="ghost" size="sm" onClick={checkOnboardingStatus} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Checking connection status..."
              : status?.connected
                ? "Your Stripe account is fully connected and ready to accept payments"
                : "Connect your Stripe account to start accepting payments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking status...</span>
            </div>
          ) : status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={status.connected ? "default" : "secondary"}>
                  {status.connected ? "Connected" : "Setup Required"}
                </Badge>
              </div>

              {status.accountId && (
                <div>
                  <span className="font-medium">Account ID:</span>
                  <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">{status.accountId}</code>
                </div>
              )}

              {status.account && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Details Submitted:</span>
                      <Badge variant={status.account.details_submitted ? "default" : "secondary"}>
                        {status.account.details_submitted ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Charges Enabled:</span>
                      <Badge variant={status.account.charges_enabled ? "default" : "secondary"}>
                        {status.account.charges_enabled ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Payouts Enabled:</span>
                      <Badge variant={status.account.payouts_enabled ? "default" : "secondary"}>
                        {status.account.payouts_enabled ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Country:</span>
                      <span className="text-sm">{status.account.country}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Unable to check connection status</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{status?.connected ? "Account Management" : "Get Started"}</CardTitle>
          <CardDescription>
            {status?.connected
              ? "Your Stripe account is ready to process payments"
              : "Set up your Stripe Express account to start accepting payments"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert className={messageType === "error" ? "border-red-500" : "border-green-500"}>
              {messageType === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {!status?.connected ? (
            <div className="space-y-3">
              {!status?.accountId ? (
                // No account exists - create new one
                <Button onClick={startOnboarding} disabled={isCreating} className="w-full" size="lg">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Set Up Stripe Payments
                    </>
                  )}
                </Button>
              ) : (
                // Account exists but onboarding incomplete
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Your Stripe account needs to complete onboarding to accept payments.
                  </p>
                  <Button onClick={refreshOnboardingLink} disabled={isRefreshing} className="w-full">
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

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Stripe Express accounts are managed by our platform</p>
                <p>• You'll be redirected to Stripe to complete verification</p>
                <p>• This enables us to process payments and send payouts on your behalf</p>
              </div>
            </div>
          ) : (
            // Account is fully connected
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-medium">Stripe account connected successfully!</p>
              <p className="text-sm text-muted-foreground">You can now accept payments and receive payouts.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
