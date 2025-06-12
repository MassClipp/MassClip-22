"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, ExternalLink, RefreshCw, XCircle, Clock, AlertTriangle } from "lucide-react"
import StripeConnectButton from "./stripe-connect-button"
import SSNCompletionPrompt from "./ssn-completion-prompt"

interface StripeStatusProps {
  className?: string
}

interface StripeAccountStatus {
  isOnboarded: boolean
  canReceivePayments: boolean
  accountId?: string
  detailedStatus: string
  message: string
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

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
      case "onboarding_incomplete":
        return <StripeConnectButton className="w-full" />

      case "past_due_requirements":
      case "current_requirements":
      case "charges_disabled":
      case "payouts_disabled":
        return (
          <Button
            onClick={() => {
              if (status.accountId) {
                window.open(`https://dashboard.stripe.com/connect/accounts/${status.accountId}`, "_blank")
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Resolve in Stripe Dashboard
          </Button>
        )

      case "pending_verification":
        return (
          <Button variant="outline" className="w-full" disabled>
            <Clock className="h-4 w-4 mr-2" />
            Waiting for Verification
          </Button>
        )

      case "fully_enabled":
        return (
          <Button
            variant="outline"
            onClick={() => {
              if (status.accountId) {
                window.open(`https://dashboard.stripe.com/connect/accounts/${status.accountId}`, "_blank")
              }
            }}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Stripe Dashboard
          </Button>
        )

      default:
        return (
          <Button onClick={refreshStatus} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Status
          </Button>
        )
    }
  }

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
          <Button onClick={refreshStatus} variant="outline" size="sm" className="mt-2">
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
          </CardTitle>
          <CardDescription>Stripe Connect integration for receiving payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          <Alert className={getStatusColor(status.detailedStatus, status.requirementsSummary)}>
            <AlertDescription className="flex items-center gap-2">
              {getStatusIcon(status.detailedStatus, status.requirementsSummary)}
              {status.message}
            </AlertDescription>
          </Alert>

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
                {status.requirementsSummary.eventually_due.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>{status.requirementsSummary.eventually_due.length} eventually due</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              disabled={isRefreshing}
              className="flex-shrink-0"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <div className="flex-1">{getActionButton()}</div>
          </div>
        </CardContent>
      </Card>

      {/* SSN Completion Prompt - Only show if connected */}
      {status.isConnected && status.accountId && <SSNCompletionPrompt accountId={status.accountId} />}
    </div>
  )
}
