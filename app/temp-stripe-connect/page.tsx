"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, CreditCard, Terminal, Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface StripeAccountStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirementsCount: number
  currentlyDue: string[]
  pastDue: string[]
}

export default function TempStripeConnectPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (user) {
      checkStripeStatus()
    }
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) return

    setChecking(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connection-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()
      setDebugInfo(data)

      if (data.success) {
        setAccountStatus({
          connected: data.isConnected,
          accountId: data.accountId,
          chargesEnabled: data.accountStatus?.chargesEnabled || false,
          payoutsEnabled: data.accountStatus?.payoutsEnabled || false,
          detailsSubmitted: data.accountStatus?.detailsSubmitted || false,
          requirementsCount: data.accountStatus?.requirementsCount || 0,
          currentlyDue: [],
          pastDue: [],
        })
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error)
      setDebugInfo({ error: error.message })
    } finally {
      setChecking(false)
    }
  }

  const createStripeAccount = async () => {
    if (!user) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          returnUrl: `${window.location.origin}/dashboard/earnings`,
          refreshUrl: `${window.location.origin}/temp-stripe-connect`,
        }),
      })

      const data = await response.json()
      console.log("Onboard response:", data)

      if (data.onboardingComplete) {
        toast({
          title: "Success",
          description: "Stripe account already connected! Redirecting to earnings...",
        })
        setTimeout(() => {
          window.location.href = "/dashboard/earnings"
        }, 1500)
      } else if (data.onboardingUrl) {
        toast({
          title: "Redirecting",
          description: "Taking you to Stripe Connect onboarding...",
        })
        window.location.href = data.onboardingUrl
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create Stripe account",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to Stripe",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyDebugInfo = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    toast({
      title: "Copied",
      description: "Debug info copied to clipboard",
    })
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking Stripe account status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">Temporary Stripe Connect Setup</h1>
        <p className="text-zinc-400 mt-1">
          Quick setup for connecting your MassClip account to Stripe test environment
        </p>
      </div>

      {/* Test Environment Notice */}
      <Alert className="border-blue-600 bg-blue-600/10">
        <Terminal className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Environment Active:</strong> This will connect your account to Stripe's test environment. All
          transactions will be simulated and no real money will be processed. Perfect for testing!
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Quick Connect
          </CardTitle>
          <CardDescription>Connect your account to Stripe test environment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accountStatus?.connected ? (
            <div className="space-y-4">
              <Alert className="border-yellow-600 bg-yellow-600/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No Stripe account connected. Click below to start the connection process.
                </AlertDescription>
              </Alert>

              <Button onClick={createStripeAccount} disabled={loading} size="lg" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up Stripe Connect...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Connect to Stripe Test Environment
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-600 bg-green-600/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Stripe account connected! You can now receive test payments.</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.chargesEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Charges</div>
                  <div className="text-xs text-zinc-400">{accountStatus.chargesEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.payoutsEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Payouts</div>
                  <div className="text-xs text-zinc-400">{accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.detailsSubmitted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Details</div>
                  <div className="text-xs text-zinc-400">
                    {accountStatus.detailsSubmitted ? "Submitted" : "Pending"}
                  </div>
                </div>

                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.requirementsCount === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Requirements</div>
                  <div className="text-xs text-zinc-400">
                    {accountStatus.requirementsCount === 0 ? "Complete" : `${accountStatus.requirementsCount} pending`}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/dashboard/earnings")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Earnings Dashboard
                </Button>
                <Button variant="outline" onClick={checkStripeStatus}>
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      {accountStatus?.accountId && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-xs">
                <span className="text-zinc-400">Account ID:</span>
                <span className="font-mono ml-2">{accountStatus.accountId}</span>
              </div>
              <div className="text-xs">
                <span className="text-zinc-400">Environment:</span>
                <span className="ml-2 text-blue-400">Test Mode</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {debugInfo && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Debug Information
              <Button variant="ghost" size="sm" onClick={copyDebugInfo}>
                <Copy className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-zinc-800 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Back to Dashboard
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard/connect-stripe")}>
          Regular Connect Page
        </Button>
      </div>
    </div>
  )
}
