"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, ExternalLink, RefreshCw, XCircle, Clock, AlertTriangle } from "lucide-react"
import StripeConnectButton from "./stripe-connect-button"

interface StripeStatusProps {
  className?: string
}

interface StripeAccountStatus {
  isOnboarded: boolean
  canReceivePayments: boolean
  accountId?: string
  detailedStatus: string
  message: string
  mode?: "live" | "test"
  environment?: string
  capabilities?: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
  }
  requirementsSummary?: {
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  accountStatus?: {
    livemode?: boolean
  }
  isConnected?: boolean
}

export default function StripeStatus({ className }: StripeStatusProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<StripeAccountStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch Stripe status on component mount
  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        throw new Error("Failed to check Stripe Connect status")
      }

      const data = await response.json()
      // Ensure isConnected is set properly
      data.isConnected = data.accountId ? true : false
      setStatus(data)
    } catch (error) {
      console.error("Error checking Stripe status:", error)
      setStatus({
        isOnboarded: false,
        canReceivePayments: false,
        detailedStatus: "error",
        message: "Failed to check account status",
        mode: "test",
        environment: "development",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh Stripe status
  const refreshStatus = async () => {
    if (!user) return

    try {
      setIsRefreshing(true)
      await checkStripeStatus()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Create account link for onboarding
  const createAccountLink = async () => {
    if (!user || !status?.accountId) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/create-account-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountId: status.accountId,
          returnUrl: `${window.location.origin}/dashboard/stripe/success`,
          refreshUrl: `${window.location.origin}/dashboard/connect-stripe`,
        }),
      })

      const data = await response.json()
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        console.error("Failed to create account link:", data.error)
      }
    } catch (error) {
      console.error("Error creating account link:", error)
    }
  }

  // Open Stripe Express Dashboard
  const openStripeDashboard = () => {
    if (!status?.accountId) return

    // For Stripe Connect Express accounts, use the login link
    const dashboardUrl = `https://connect.stripe.com/express/oauth/authorize?redirect_uri=${encodeURIComponent(window.location.origin)}&client_id=ca_32D88BD1qLklliziD7gYQvctJIhWBSQ7&state=${status.accountId}&stripe_user[email]=${encodeURIComponent(user?.email || "")}&stripe_user[business_type]=individual`

    // Alternative: Use Stripe's Express Dashboard direct link
    const expressUrl = `https://dashboard.stripe.com/connect/accounts/${status.accountId}`

    window.open(expressUrl, "_blank")
  }

  const getStatusIcon = (detailedStatus: string, requirementsSummary?: any) => {
    // If only eventually_due requirements and no current/past due, show as active
    if (
      requirementsSummary &&
      requirementsSummary.eventually_due.length > 0 &&
      requirementsSummary.currently_due.length === 0 &&
      requirementsSummary.past_due.length === 0
    ) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }

    switch (detailedStatus) {
      case "fully_enabled":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "no_account":
      case "onboarding_incomplete":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "past_due_requirements":
      case "charges_disabled":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "current_requirements":
      case "payouts_disabled":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "pending_verification":
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (detailedStatus: string, requirementsSummary?: any) => {
    // If only eventually_due requirements, show as success
    if (
      requirementsSummary &&
      requirementsSummary.eventually_due.length > 0 &&
      requirementsSummary.currently_due.length === 0 &&
      requirementsSummary.past_due.length === 0
    ) {
      return "bg-green-500/10 text-green-500 border-green-500/20"
    }

    switch (detailedStatus) {
      case "fully_enabled":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "no_account":
      case "onboarding_incomplete":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "past_due_requirements":
      case "charges_disabled":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "current_requirements":
      case "payouts_disabled":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
      case "pending_verification":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
  }

  const getActionButton = () => {
    if (!status) return null

    switch (status.detailedStatus) {
      case "no_account":
        return <StripeConnectButton className="w-full" />

      case "onboarding_incomplete":
      case "past_due_requirements":
      case "current_requirements":
      case "charges_disabled":
      case "payouts_disabled":
        return (
          <Button onClick={createAccountLink} className="w-full bg-blue-600 hover:bg-blue-700">
            <ExternalLink className="h-4 w-4 mr-2" />
            Complete Stripe Setup
          </Button>
        )

      case "pending_verification":
        return (
          <Button variant="outline" className="w-full bg-transparent" disabled>
            <Clock className="h-4 w-4 mr-2" />
            Waiting for Verification
          </Button>
        )

      case "fully_enabled":
        return (
          <Button variant="outline" onClick={openStripeDashboard} className="w-full bg-transparent">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Stripe Dashboard
          </Button>
        )

      default:
        return (
          <Button onClick={refreshStatus} variant="outline" className="w-full bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Status
          </Button>
        )
    }
  }

  // Check for environment mismatch
  const isProduction = status?.environment === "production"
  const accountIsLive = status?.accountStatus?.livemode
  const environmentMismatch = status && ((isProduction && !accountIsLive) || (!isProduction && accountIsLive))

  // If loading, show loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Checking payment setup...</span>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to check payment status</p>
          <Button onClick={refreshStatus} variant="outline" size="sm" className="mt-2 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Stripe Status Card */}
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status.detailedStatus, status.requirementsSummary)}
            Payment Setup
            <Badge variant="outline" className="ml-auto">
              {status.mode?.toUpperCase()} • {status.environment}
            </Badge>
          </CardTitle>
          <CardDescription>Stripe Connect integration for receiving payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Mismatch Warning */}
          {environmentMismatch && (
            <Alert className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Environment Mismatch Detected</div>
                <div className="text-sm">
                  Your app is running in {isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode but your Stripe account is
                  in {accountIsLive ? "LIVE" : "TEST"} mode.
                </div>
                <div className="text-sm mt-1">
                  {isProduction
                    ? "Please connect a live Stripe account for production use."
                    : "Please use a test Stripe account for development."}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Alert */}
          <Alert className={getStatusColor(status.detailedStatus, status.requirementsSummary)}>
            <AlertDescription className="flex items-center gap-2">
              {getStatusIcon(status.detailedStatus, status.requirementsSummary)}
              {status.message}
            </AlertDescription>
          </Alert>

          {/* Account ID Display */}
          {status.accountId && (
            <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
              Account ID: {status.accountId}
            </div>
          )}

          {/* Capabilities Overview */}
          {status.capabilities && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Account Capabilities</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Charges</span>
                  <Badge variant={status.capabilities.chargesEnabled ? "default" : "secondary"}>
                    {status.capabilities.chargesEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payouts</span>
                  <Badge variant={status.capabilities.payoutsEnabled ? "default" : "secondary"}>
                    {status.capabilities.payoutsEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Requirements Summary */}
          {status.requirementsSummary && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Requirements Status</h4>
              <div className="space-y-1 text-sm">
                {status.requirementsSummary.past_due.length > 0 && (
                  <div className="flex items-center gap-2 text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span>{status.requirementsSummary.past_due.length} past due</span>
                  </div>
                )}
                {status.requirementsSummary.currently_due.length > 0 && (
                  <div className="flex items-center gap-2 text-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{status.requirementsSummary.currently_due.length} currently due</span>
                  </div>
                )}
                {status.requirementsSummary.pending_verification.length > 0 && (
                  <div className="flex items-center gap-2 text-blue-500">
                    <Clock className="h-4 w-4" />
                    <span>{status.requirementsSummary.pending_verification.length} pending verification</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {getActionButton()}
        </CardContent>
      </Card>
    </div>
  )
}
