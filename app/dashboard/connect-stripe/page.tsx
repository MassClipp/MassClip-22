"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StripeConnectButton } from "@/components/stripe-connect-button"
import { StripeConnectionStatus } from "@/components/stripe-connection-status"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, CreditCard, Zap, Shield } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

export default function ConnectStripePage() {
  const searchParams = useSearchParams()
  const { user } = useFirebaseAuth()
  const [showSuccess, setShowSuccess] = useState(false)
  const [showRefresh, setShowRefresh] = useState(false)

  useEffect(() => {
    const success = searchParams.get("success")
    const refresh = searchParams.get("refresh")

    if (success === "true") {
      setShowSuccess(true)
    }
    if (refresh === "true") {
      setShowRefresh(true)
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connect with Stripe</h1>
        <p className="text-muted-foreground">Set up payments to start earning from your content</p>
      </div>

      {showSuccess && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully connected to Stripe! You can now start accepting payments.
          </AlertDescription>
        </Alert>
      )}

      {showRefresh && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Please complete your Stripe setup to start accepting payments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create New Account */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Create New Stripe Account</CardTitle>
            </div>
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Automatic payouts to your bank</span>
              </div>
            </div>

            <StripeConnectButton variant="create" className="w-full bg-blue-600 hover:bg-blue-700" />
          </CardContent>
        </Card>

        {/* Connect Existing Account */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl">Already Have a Stripe Account?</CardTitle>
            </div>
            <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Stripe handles account verification</span>
              </div>
            </div>

            <StripeConnectButton variant="connect" className="w-full bg-green-600 hover:bg-green-700" />
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <CardTitle>How It Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Account</h3>
              <p className="text-sm text-muted-foreground">Create or connect your Stripe account securely</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Verify Identity</h3>
              <p className="text-sm text-muted-foreground">Complete Stripe's verification process</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Start Earning</h3>
              <p className="text-sm text-muted-foreground">Begin accepting payments for your content</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {user && (
        <div className="mt-8">
          <StripeConnectionStatus />
        </div>
      )}
    </div>
  )
}
