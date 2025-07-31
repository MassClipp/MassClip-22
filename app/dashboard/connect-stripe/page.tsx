"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, CreditCard, Globe, Shield } from "lucide-react"
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
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
        <p className="text-gray-600">Start accepting payments and track your earnings</p>
      </div>

      {/* Status Messages */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully connected your Stripe account! You can now start accepting payments.
          </AlertDescription>
        </Alert>
      )}

      {pending && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your Stripe account setup is pending. Please complete the onboarding process.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            An error occurred while connecting your Stripe account. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {refresh && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            The connection process was interrupted. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Accept Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Process payments from customers worldwide securely
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Global Reach</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Supported in 40+ countries with local payment methods
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Secure & Reliable</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">Bank-level security with PCI compliance</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status and Actions */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Manage your Stripe account connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
    </div>
  )
}
