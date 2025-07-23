"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { StripeConnectButton } from "@/components/stripe-connect-button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
}

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const success = searchParams.get("success")
  const pending = searchParams.get("pending")
  const error = searchParams.get("error")
  const refresh = searchParams.get("refresh")

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Connect Stripe Account</CardTitle>
          <CardDescription>Connect your Stripe account to start receiving payments for your content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Messages */}
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account has been successfully connected and is ready to receive payments!
              </AlertDescription>
            </Alert>
          )}

          {pending && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account setup is pending. Please complete the onboarding process.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error === "no_state" && "Invalid callback state. Please try connecting again."}
                {error === "no_account" && "No Stripe account found. Please create one first."}
                {error === "callback_failed" && "Connection failed. Please try again."}
                {!["no_state", "no_account", "callback_failed"].includes(error) &&
                  "An error occurred. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {refresh && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>The connection process was interrupted. Please try again.</AlertDescription>
            </Alert>
          )}

          {/* Current Status */}
          {stripeStatus && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  {stripeStatus.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Account Connected</span>
                </div>
                <div className="flex items-center space-x-2">
                  {stripeStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Charges Enabled</span>
                </div>
                <div className="flex items-center space-x-2">
                  {stripeStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Payouts Enabled</span>
                </div>
                <div className="flex items-center space-x-2">
                  {stripeStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Details Submitted</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {!stripeStatus?.connected || !stripeStatus?.detailsSubmitted ? (
              <StripeConnectButton userId={user.uid} onSuccess={checkStripeStatus} />
            ) : (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-600">Your Stripe account is fully connected!</p>
                <p className="text-muted-foreground">You can now receive payments for your content.</p>
              </div>
            )}

            <Button variant="outline" onClick={checkStripeStatus} className="w-full bg-transparent">
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
