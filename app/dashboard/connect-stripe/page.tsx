"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StripeConnectButton } from "@/components/stripe-connect-button"
import { StripeConnectionStatus } from "@/components/stripe-connection-status"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { CheckCircle, AlertCircle, CreditCard, Globe, Shield } from "lucide-react"

export default function ConnectStripePage() {
  const { user, loading } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "not_connected">("checking")

  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    }
  }, [user])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status", {
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      })

      const data = await response.json()
      setConnectionStatus(data.connected ? "connected" : "not_connected")
    } catch (error) {
      console.error("Error checking connection status:", error)
      setConnectionStatus("not_connected")
    }
  }

  const handleCreateAccount = async () => {
    try {
      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user?.uid }),
      })

      if (response.ok) {
        // Refresh the page to show the connect button
        window.location.reload()
      }
    } catch (error) {
      console.error("Error creating Stripe account:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to connect your Stripe account.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Connect Your Stripe Account</h1>
          <p className="text-gray-600">Start accepting payments and track your earnings</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully connected your Stripe account! You can now start accepting payments.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-1">Connection Error</div>
              {error === "access_denied" && "You cancelled the Stripe connection process."}
              {error === "oauth_failed" && "Failed to complete the OAuth process."}
              {error === "missing_parameters" && "Missing required parameters from Stripe."}
              {errorDescription && <div className="text-sm mt-1 opacity-75">{errorDescription}</div>}
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
              <CardDescription className="text-center">Process payments from customers worldwide</CardDescription>
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
              <CardDescription className="text-center">Supported in 40+ countries</CardDescription>
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
              <CardDescription className="text-center">Bank-level security and encryption</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Connection Status and Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Create New Stripe Account
              </CardTitle>
              <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Quick 5-minute setup
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  2.9% + 30¢ per transaction
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No monthly fees
                </div>
              </div>

              {connectionStatus === "not_connected" && (
                <StripeConnectButton userId={user.uid} onSuccess={() => setConnectionStatus("connected")} />
              )}

              {connectionStatus === "checking" && (
                <Button disabled className="w-full">
                  Checking connection...
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Already Have a Stripe Account?
              </CardTitle>
              <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Secure OAuth connection
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No manual setup needed
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Keep your existing settings
                </div>
              </div>

              {connectionStatus === "not_connected" && (
                <StripeConnectButton userId={user.uid} onSuccess={() => setConnectionStatus("connected")} />
              )}

              {connectionStatus === "checking" && (
                <Button disabled className="w-full">
                  Checking connection...
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connection Status */}
        <div className="mt-8">
          <StripeConnectionStatus userId={user.uid} onStatusChange={setConnectionStatus} />
        </div>
      </div>
    </div>
  )
}
