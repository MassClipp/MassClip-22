"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { StripeConnectButton } from "@/components/stripe-connect-button"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { toast } from "sonner"

interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
  requirements?: any
  email?: string
  error?: string
}

export default function ConnectStripePage() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { getIdToken, user } = useFirebaseAuth()

  const checkStripeStatus = async (showToast = false) => {
    try {
      setRefreshing(true)

      const idToken = await getIdToken()
      if (!idToken) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/stripe/connect/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check Stripe status")
      }

      setStatus(data)

      if (showToast) {
        if (data.connected && data.chargesEnabled && data.payoutsEnabled) {
          toast.success("Stripe account is fully connected and active!")
        } else if (data.connected) {
          toast.info("Stripe account connected but requires additional setup")
        } else {
          toast.info("No Stripe account connected")
        }
      }
    } catch (error: any) {
      console.error("Error checking Stripe status:", error)
      toast.error(error.message || "Failed to check Stripe status")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const handleRefresh = () => {
    checkStripeStatus(true)
  }

  const getStatusBadge = () => {
    if (!status) return null

    if (status.connected && status.chargesEnabled && status.payoutsEnabled) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    } else if (status.connected) {
      return <Badge className="bg-yellow-100 text-yellow-800">Setup Required</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Not Connected</Badge>
    }
  }

  const getStatusIcon = () => {
    if (!status) return null

    if (status.connected && status.chargesEnabled && status.payoutsEnabled) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking Stripe connection...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connect with Stripe</h1>
        <p className="text-muted-foreground">
          Connect your Stripe account to start receiving payments for your content.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle>Connection Status</CardTitle>
                  <CardDescription>Current status of your Stripe integration</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {status.connected ? (
                        <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400 mx-auto" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Account Connected</p>
                    <p className="text-xs text-muted-foreground">{status.connected ? "Yes" : "No"}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {status.chargesEnabled ? (
                        <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400 mx-auto" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Charges Enabled</p>
                    <p className="text-xs text-muted-foreground">{status.chargesEnabled ? "Yes" : "No"}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold mb-1">
                      {status.payoutsEnabled ? (
                        <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400 mx-auto" />
                      )}
                    </div>
                    <p className="text-sm font-medium">Payouts Enabled</p>
                    <p className="text-xs text-muted-foreground">{status.payoutsEnabled ? "Yes" : "No"}</p>
                  </div>
                </div>

                {status.accountId && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Account ID:</strong> {status.accountId}
                  </div>
                )}

                {status.email && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Email:</strong> {status.email}
                  </div>
                )}

                {status.error && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{status.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Unable to load status</p>
            )}
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              {status?.connected && status.chargesEnabled && status.payoutsEnabled
                ? "Your Stripe account is fully set up and ready to receive payments!"
                : "Complete your Stripe setup to start receiving payments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status?.connected && status.chargesEnabled && status.payoutsEnabled ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your Stripe account is fully connected and active. You can now receive payments for your content.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" asChild>
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    Open Stripe Dashboard
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!status?.connected ? (
                  <div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Connect your Stripe account to start receiving payments. This will redirect you to Stripe to
                      complete the setup process.
                    </p>
                    <StripeConnectButton
                      onSuccess={() => {
                        toast.success("Redirecting to Stripe...")
                      }}
                      onError={(error) => {
                        toast.error(error)
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Your Stripe account needs additional setup to enable payments. Complete the onboarding process to
                      activate your account.
                    </p>
                    <StripeConnectButton
                      onSuccess={() => {
                        toast.success("Redirecting to complete setup...")
                      }}
                      onError={(error) => {
                        toast.error(error)
                      }}
                    />
                  </div>
                )}

                {status?.requirements && status.requirements.currently_due?.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Required Information:</strong>
                      <ul className="mt-2 list-disc list-inside text-sm">
                        {status.requirements.currently_due.map((req: string, index: number) => (
                          <li key={index}>{req.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Stripe Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Secure Payments:</strong> Stripe handles all payment processing securely, ensuring your
                customers' payment information is protected.
              </p>
              <p>
                <strong>Global Reach:</strong> Accept payments from customers worldwide with support for multiple
                currencies and payment methods.
              </p>
              <p>
                <strong>Automatic Payouts:</strong> Receive your earnings directly to your bank account with automatic
                daily payouts.
              </p>
              <p>
                <strong>Transaction Fees:</strong> Stripe charges 2.9% + 30¢ per successful charge. No setup fees,
                monthly fees, or hidden costs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
