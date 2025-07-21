"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  fullyEnabled?: boolean
  needsAttention?: boolean
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  requirementsCurrentlyDue?: string[]
  requirementsEventuallyDue?: string[]
  country?: string
  email?: string
  mode?: "test" | "live"
  error?: string
}

export function StripeAccountLinker() {
  const { user } = useFirebaseAuth()
  const [status, setStatus] = useState<StripeConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check connection status on mount and when user changes
  useEffect(() => {
    if (user?.uid) {
      checkConnectionStatus()
    }
  }, [user?.uid])

  // Handle URL parameters (success, error, etc.)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const error = urlParams.get("error")
    const errorDescription = urlParams.get("error_description")
    const needsSetup = urlParams.get("needs_setup")
    const fullyEnabled = urlParams.get("fully_enabled")

    if (success === "true") {
      if (fullyEnabled === "true") {
        setError(null)
        // Refresh status to show updated info
        setTimeout(() => checkConnectionStatus(), 1000)
      } else if (needsSetup === "true") {
        setError("Account connected but requires additional setup. Please complete the onboarding process.")
        setTimeout(() => checkConnectionStatus(), 1000)
      }

      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    } else if (error) {
      setError(errorDescription ? decodeURIComponent(errorDescription) : "Connection failed")
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const checkConnectionStatus = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        throw new Error("Failed to check connection status")
      }

      const data = await response.json()
      setStatus(data)
      setError(data.error || null)
    } catch (err: any) {
      console.error("Error checking connection status:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const initiateOAuthFlow = async () => {
    if (!user?.uid) return

    try {
      setConnecting(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      if (!response.ok) {
        throw new Error("Failed to initiate OAuth flow")
      }

      const data = await response.json()

      // Redirect to Stripe OAuth
      window.location.href = data.url
    } catch (err: any) {
      console.error("Error initiating OAuth:", err)
      setError(err.message)
      setConnecting(false)
    }
  }

  const createExpressAccount = async () => {
    if (!user?.uid) return

    try {
      setConnecting(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          country: "US", // You can make this dynamic
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create Express account")
      }

      const data = await response.json()

      // Redirect to Stripe onboarding
      window.location.href = data.url
    } catch (err: any) {
      console.error("Error creating Express account:", err)
      setError(err.message)
      setConnecting(false)
    }
  }

  const refreshAccountLink = async () => {
    if (!user?.uid || !status?.accountId) return

    try {
      setConnecting(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          accountId: status.accountId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create account link")
      }

      const data = await response.json()

      // Redirect to Stripe onboarding
      window.location.href = data.url
    } catch (err: any) {
      console.error("Error creating account link:", err)
      setError(err.message)
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Checking connection status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Please log in to connect your Stripe account.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status?.connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Stripe Account Connected
            </CardTitle>
            <CardDescription>
              Account ID: {status.accountId} • Mode: {status.mode?.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Charges</p>
                <Badge variant={status.chargesEnabled ? "default" : "secondary"}>
                  {status.chargesEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Payouts</p>
                <Badge variant={status.payoutsEnabled ? "default" : "secondary"}>
                  {status.payoutsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            {status.country && (
              <div>
                <p className="text-sm font-medium">Country</p>
                <p className="text-sm text-gray-600">{status.country}</p>
              </div>
            )}

            {status.requirementsCurrentlyDue && status.requirementsCurrentlyDue.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-600">Action Required</p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {status.requirementsCurrentlyDue.map((req, index) => (
                    <li key={index}>{req.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={refreshAccountLink} disabled={connecting} variant="outline">
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Update Account
              </Button>

              <Button onClick={checkConnectionStatus} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Stripe Account</CardTitle>
            <CardDescription>
              Choose how you'd like to connect your Stripe account to start receiving payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button onClick={createExpressAccount} disabled={connecting} className="w-full" size="lg">
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Create New Express Account
              </Button>

              <div className="text-center text-sm text-gray-500">or</div>

              <Button
                onClick={initiateOAuthFlow}
                disabled={connecting}
                variant="outline"
                className="w-full bg-transparent"
                size="lg"
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Connect Existing Account
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You'll be redirected to Stripe to complete setup</li>
                <li>• Provide business information and bank details</li>
                <li>• Verify your identity with government ID</li>
                <li>• Start receiving payments once approved</li>
              </ul>
            </div>

            {status?.mode && (
              <div className="text-center">
                <Badge variant="outline">Running in {status.mode.toUpperCase()} mode</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
