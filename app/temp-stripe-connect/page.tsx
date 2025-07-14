"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Terminal,
  Copy,
  Users,
} from "lucide-react"
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
  platformAccountId?: string
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
    } else {
      setChecking(false)
      setDebugInfo({ error: "User not authenticated" })
    }
  }, [user])

  const checkStripeStatus = async () => {
    if (!user) {
      setDebugInfo({ error: "User not authenticated" })
      setChecking(false)
      return
    }

    setChecking(true)
    try {
      console.log("🔍 Getting ID token...")
      const token = await user.getIdToken(true) // Force refresh token
      console.log("✅ Got ID token, checking status...")

      const response = await fetch("/api/stripe/connection-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: token }),
      })

      const data = await response.json()
      console.log("📊 Status response:", data)
      setDebugInfo(data)

      if (data.success) {
        setAccountStatus({
          connected: data.isConnected,
          accountId: data.accountId,
          chargesEnabled: data.accountStatus?.chargesEnabled || false,
          payoutsEnabled: data.accountStatus?.payoutsEnabled || false,
          detailsSubmitted: data.accountStatus?.detailsSubmitted || false,
          requirementsCount: data.accountStatus?.requirementsCount || 0,
          currentlyDue: data.accountStatus?.currentlyDue || [],
          pastDue: data.accountStatus?.pastDue || [],
          platformAccountId: "acct_1RFLa9Dheyb0pkWF",
        })
      } else {
        console.error("❌ Status check failed:", data)
      }
    } catch (error: any) {
      console.error("❌ Error checking Stripe status:", error)
      setDebugInfo({ error: error.message })
    } finally {
      setChecking(false)
    }
  }

  const createConnectedAccount = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Stripe account",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      console.log("🔗 Starting Stripe Connect onboarding...")
      const token = await user.getIdToken(true) // Force refresh token
      console.log("✅ Got fresh ID token")

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          returnUrl: `${window.location.origin}/temp-stripe-connect?success=true`,
          refreshUrl: `${window.location.origin}/temp-stripe-connect?refresh=true`,
        }),
      })

      const data = await response.json()
      console.log("📊 Onboard response:", data)

      if (data.success) {
        if (data.onboardingComplete) {
          toast({
            title: "Success",
            description: "Stripe Connect account already set up! Checking status...",
          })
          await checkStripeStatus()
        } else if (data.onboardingUrl) {
          toast({
            title: "Redirecting to Stripe",
            description: "Setting up your connected account with MassClip platform...",
          })
          // Add a small delay to show the toast
          setTimeout(() => {
            window.location.href = data.onboardingUrl
          }, 1000)
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to create connected account",
            variant: "destructive",
          })
        }
      } else {
        console.error("❌ Onboarding failed:", data)
        toast({
          title: "Error",
          description: data.error || "Failed to create connected account",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ Error:", error)
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

  const copyAccountId = () => {
    if (accountStatus?.accountId) {
      navigator.clipboard.writeText(accountStatus.accountId)
      toast({
        title: "Copied",
        description: "Account ID copied to clipboard",
      })
    }
  }

  // Check for URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("success") === "true") {
      toast({
        title: "Welcome back!",
        description: "Checking your Stripe Connect status...",
      })
      if (user) {
        checkStripeStatus()
      }
    } else if (urlParams.get("refresh") === "true") {
      toast({
        title: "Setup incomplete",
        description: "Please complete the Stripe Connect setup to continue.",
        variant: "destructive",
      })
    }
  }, [user])

  // Show authentication required message if no user
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-zinc-900/60 border-zinc-800/50 max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 mb-4">You need to be logged in to connect your Stripe account.</p>
            <Button onClick={() => (window.location.href = "/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking Stripe Connect status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">MassClip Stripe Connect Setup</h1>
        <p className="text-zinc-400 mt-1">Connect your account to the MassClip platform to receive payments</p>
      </div>

      {/* Platform Info */}
      <Alert className="border-blue-600 bg-blue-600/10">
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Platform Connection:</strong> This will connect your account to the MassClip platform
          (acct_1RFLa9Dheyb0pkWF) in test mode. You'll be able to receive payments through the MassClip marketplace.
        </AlertDescription>
      </Alert>

      {/* Test Environment Notice */}
      <Alert className="border-yellow-600 bg-yellow-600/10">
        <Terminal className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Environment:</strong> All transactions will be simulated. Use test card numbers for testing
          payments.
        </AlertDescription>
      </Alert>

      {/* Connection Status */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>Your Stripe Connect account status with MassClip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accountStatus?.connected ? (
            <div className="space-y-4">
              <Alert className="border-orange-600 bg-orange-600/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Not Connected:</strong> You need to connect your account to start receiving payments on
                  MassClip.
                </AlertDescription>
              </Alert>

              <div className="bg-zinc-800/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What happens when you connect:</h4>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Create a Stripe Express account linked to MassClip</li>
                  <li>• Complete identity verification (required by Stripe)</li>
                  <li>• Set up bank account for payouts</li>
                  <li>• Start receiving payments from your content sales</li>
                </ul>
              </div>

              <Button onClick={createConnectedAccount} disabled={loading} size="lg" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Connected Account...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Connect to MassClip Platform
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-600 bg-green-600/10">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Connected!</strong> Your account is connected to the MassClip platform and ready to receive
                  payments.
                </AlertDescription>
              </Alert>

              {/* Account Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.chargesEnabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Accept Payments</div>
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
                  <div className="text-sm font-medium">Receive Payouts</div>
                  <div className="text-xs text-zinc-400">{accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}</div>
                </div>

                <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {accountStatus.detailsSubmitted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">Verification</div>
                  <div className="text-xs text-zinc-400">{accountStatus.detailsSubmitted ? "Complete" : "Pending"}</div>
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
                    {accountStatus.requirementsCount === 0 ? "All done" : `${accountStatus.requirementsCount} pending`}
                  </div>
                </div>
              </div>

              {/* Requirements Alert */}
              {accountStatus.requirementsCount > 0 && (
                <Alert className="border-yellow-600 bg-yellow-600/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Action Required:</strong> You have {accountStatus.requirementsCount} pending requirements.
                    Complete them to enable full functionality.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/dashboard/earnings")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Earnings Dashboard
                </Button>
                <Button variant="outline" onClick={checkStripeStatus}>
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Details */}
      {accountStatus?.accountId && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-sm">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400">Connected Account ID</div>
                  <div className="font-mono text-sm">{accountStatus.accountId}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={copyAccountId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400">Platform Account</div>
                  <div className="font-mono text-sm">acct_1RFLa9Dheyb0pkWF</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-400">Environment</div>
                <div className="text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600/20 text-blue-400">
                    Test Mode
                  </span>
                </div>
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
