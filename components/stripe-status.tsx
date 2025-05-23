"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react"
import StripeConnectButton from "./stripe-connect-button"

interface StripeStatusProps {
  className?: string
}

interface StripeAccountStatus {
  isOnboarded: boolean
  canReceivePayments: boolean
  accountId?: string
  requirements?: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
  }
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

      // Get the user's ID token
      const idToken = await user.getIdToken()

      // Call the status API
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

      setStatus({
        isOnboarded: data.isOnboarded,
        canReceivePayments: data.canReceivePayments,
        accountId: data.accountId,
        requirements: data.requirements,
      })
    } catch (error) {
      console.error("Error checking Stripe status:", error)
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

  // If not connected to Stripe, show connect button
  if (!status?.accountId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Connect to Stripe</CardTitle>
          <CardDescription>
            Set up payments to sell premium content and receive earnings directly to your bank account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Payment setup required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your Stripe account to receive payments for your premium content
                  </p>
                </div>
              </div>
            </div>

            <StripeConnectButton className="w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // If connected but not fully onboarded
  if (!status.isOnboarded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Complete Stripe Setup</CardTitle>
          <CardDescription>Your Stripe account is connected but needs additional information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Onboarding incomplete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please complete your Stripe account setup to receive payments
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={refreshStatus} disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>

              <StripeConnectButton size="sm" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If fully onboarded
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Payment Setup</CardTitle>
        <CardDescription>Your Stripe account is connected and ready to receive payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Stripe Status</span>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Payouts</span>
            {status.canReceivePayments ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Ready to receive payments</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can now sell premium content and receive payments directly to your bank account
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={refreshStatus} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`https://dashboard.stripe.com/${status.accountId}`, "_blank")
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Stripe Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
