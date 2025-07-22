"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, AlertCircle, Clock, ExternalLink, RefreshCw } from "lucide-react"

interface AccountStatus {
  connected: boolean
  accountId: string | null
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
  } | null
  message: string
}

export function StripeAccountStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      checkStatus()
    }
  }, [user])

  const checkStatus = async () => {
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

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await checkStatus()
    setIsRefreshing(false)
  }

  const handleContinueOnboarding = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.onboardingUrl) {
          window.location.href = data.onboardingUrl
        }
      }
    } catch (error) {
      console.error("Error continuing onboarding:", error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Unable to load Stripe account status</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    if (status.connected && status.capabilities?.charges_enabled && status.capabilities?.payouts_enabled) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    if (status.accountId && status.capabilities?.details_submitted) {
      return <Clock className="h-5 w-5 text-yellow-600" />
    }
    return <AlertCircle className="h-5 w-5 text-red-600" />
  }

  const getStatusBadge = () => {
    if (status.connected && status.capabilities?.charges_enabled && status.capabilities?.payouts_enabled) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Fully Connected
        </Badge>
      )
    }
    if (status.accountId && status.capabilities?.details_submitted) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Under Review
        </Badge>
      )
    }
    if (status.accountId) {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800">
          Setup Incomplete
        </Badge>
      )
    }
    return <Badge variant="destructive">Not Connected</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Stripe Account Status</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <CardDescription>{status.message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status.accountId && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Account ID: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{status.accountId}</code>
            </p>

            {status.account && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Country:</span> {status.account.country}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {status.account.type}
                </div>
              </div>
            )}
          </div>
        )}

        {status.capabilities && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Capabilities</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {status.capabilities.charges_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Accept Payments</span>
              </div>
              <div className="flex items-center gap-2">
                {status.capabilities.payouts_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Receive Payouts</span>
              </div>
            </div>
          </div>
        )}

        {status.capabilities &&
          (status.capabilities.currently_due.length > 0 || status.capabilities.past_due.length > 0) && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-600">Action Required</h4>
              <div className="text-sm text-red-600">
                {status.capabilities.past_due.length > 0 && (
                  <p>Past due requirements: {status.capabilities.past_due.join(", ")}</p>
                )}
                {status.capabilities.currently_due.length > 0 && (
                  <p>Currently due: {status.capabilities.currently_due.join(", ")}</p>
                )}
              </div>
              <Button onClick={handleContinueOnboarding} size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Complete Requirements
              </Button>
            </div>
          )}

        {!status.connected && status.accountId && status.capabilities?.details_submitted && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Your account is under review by Stripe. This typically takes 1-2 business days.
            </p>
          </div>
        )}

        {status.connected && status.capabilities?.charges_enabled && status.capabilities?.payouts_enabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              🎉 Your Stripe account is fully connected and ready to accept payments!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
