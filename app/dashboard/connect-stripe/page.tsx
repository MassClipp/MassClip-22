"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink, AlertCircle, RefreshCw, DollarSign, Zap, Lock, Info } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface ConnectionStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  isFullyEnabled: boolean
  actionsRequired: boolean
  requirements: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
    eventually_due: string[]
  }
  country?: string
  email?: string
  businessType?: string
  defaultCurrency?: string
  livemode?: boolean
  lastUpdated?: any
}

export default function ConnectStripePage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const searchParams = useSearchParams()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get URL parameters
  const urlError = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Check connection status
  const checkConnectionStatus = async () => {
    if (!user?.uid) return

    try {
      setChecking(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/connection-status", {
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setConnectionStatus(data)
        console.log("🔍 [Connect Stripe] Connection status:", data)
      } else {
        const errorData = await response.json()
        console.error("❌ [Connect Stripe] Status check failed:", errorData)
        
        // Set default disconnected state
        setConnectionStatus({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          isFullyEnabled: false,
          actionsRequired: false,
          requirements: {
            currently_due: [],
            past_due: [],
            pending_verification: [],
            eventually_due: [],
          },
        })
      }
    } catch (err) {
      console.error("❌ [Connect Stripe] Error checking status:", err)
      setError(err instanceof Error ? err.message : "Failed to check connection status")
      
      // Set default disconnected state
      setConnectionStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        isFullyEnabled: false,
        actionsRequired: false,
        requirements: {
          currently_due: [],
          past_due: [],
          pending_verification: [],
          eventually_due: [],
        },
      })
    } finally {
      setChecking(false)
    }
  }

  // Handle OAuth connection
  const handleOAuthConnect = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection")
      }

      if (data.authUrl) {
        console.log("🔗 [Connect Stripe] Redirecting to OAuth URL:", data.authUrl)
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error("❌ [Connect Stripe] OAuth error:", err)
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  // Handle Express account creation
  const handleCreateAccount = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      if (data.url) {
        console.log("🔗 [Connect Stripe] Redirecting to account creation:", data.url)
        window.location.href = data.url
      }
    } catch (err) {
      console.error("❌ [Connect Stripe] Create account error:", err)
      setError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      checkConnectionStatus()
    }
  }, [user])

  // Handle URL error parameters
  useEffect(() => {
    if (urlError) {
      let errorMessage = urlError
      if (errorDescription) {
        errorMessage = `${urlError}: ${decodeURIComponent(errorDescription)}`
      }
      
      // Map specific error codes to user-friendly messages
      switch (urlError) {
        case "access_denied":
          errorMessage = "Connection was cancelled. You can try connecting again."
          break
        case "missing_code":
          errorMessage = "Authorization failed. Please try connecting again."
          break
        case "invalid_state":
          errorMessage = "Session expired. Please try connecting again."
          break
        case "token_exchange_failed":
          errorMessage = "Failed to complete connection. Please try again."
          break
        case "unexpected_error":
          errorMessage = errorDescription ? decodeURIComponent(errorDescription) : "An unexpected error occurred"
          break
      }
      
      setError(errorMessage)
    }
  }, [urlError, errorDescription])

  // Loading states
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">
            {authLoading ? "Loading..." : "Checking connection status..."}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="max-w-md mx-auto bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-400">Please log in to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show connected status
  if (connectionStatus?.connected) {
    return (
      <div className="min-h-screen bg-black p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Connection Status Header */}
          <Card className="border-green-600/50 bg-green-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-green-400">Stripe Account Connected</CardTitle>
                    <CardDescription className="text-green-300">
                      Account ID: {connectionStatus.accountId?.slice(-8)}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={checkConnectionStatus}
                  variant="outline"
                  size="sm"
                  disabled={checking}
                  className="border-green-600/50 text-green-400 hover:bg-green-900/40"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Account Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Charges Enabled</span>
                  {connectionStatus.chargesEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Payouts Enabled</span>
                  {connectionStatus.payoutsEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Details Submitted</span>
                  {connectionStatus.detailsSubmitted ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Status</span>
                  <Badge variant={connectionStatus.isFullyEnabled ? "default" : "secondary"}>
                    {connectionStatus.isFullyEnabled ? "Active" : "Setup Required"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="h-5 w-5 text-purple-400" />
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionStatus.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Email</span>
                    <span className="text-white font-medium">{connectionStatus.email}</span>
                  </div>
                )}
                {connectionStatus.country && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Country</span>
                    <span className="text-white font-medium">{connectionStatus.country.toUpperCase()}</span>
                  </div>
                )}
                {connectionStatus.defaultCurrency && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Currency</span>
                    <span className="text-white font-medium">{connectionStatus.defaultCurrency.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-300">Mode</span>
                  <Badge variant={connectionStatus.livemode ? "default" : "secondary"}>
                    {connectionStatus.livemode ? "Live" : "Test"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requirements Alert */}
          {connectionStatus.actionsRequired && (
            <Alert className="border-yellow-600/50 bg-yellow-900/20">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                <div className="space-y-2">
                  <p className="font-semibold">Action Required</p>
                  <p>Your Stripe account needs additional information to enable full functionality.</p>
                  {connectionStatus.requirements.currently_due.length > 0 && (
                    <p className="text-sm">
                      Currently due: {connectionStatus.requirements.currently_due.join(", ")}
                    </p>
                  )}
                  {connectionStatus.requirements.past_due.length > 0 && (
                    <p className="text-sm text-red-400">
                      Past due: {connectionStatus.requirements.past_due.join(", ")}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-gray-400">Manage your Stripe integration</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                variant="outline" 
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Stripe Dashboard
              </Button>
              <Button 
                onClick={() => window.location.href = "/dashboard/earnings"}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                View Earnings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show connection options
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Error Display */}
        {error && (
          <Alert className="border-red-600/50 bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              <div className="space-y-2">
                <p className="font-semibold">Connection Error</p>
                <p>{error}</p>
                <Button 
                  onClick={() => setError(null)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-red-600/50 text-red-400 hover:bg-red-900/40"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Connect Your Stripe Account
          </h1>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Start accepting payments and receiving payouts by connecting your Stripe account. 
            Choose to create a new account or connect an existing one.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-800/30">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-white">Accept Payments</h3>
            <p className="text-sm text-gray-400">Process payments from customers worldwide</p>
          </div>
          
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-800/30">
            <Globe className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-white">Global Reach</h3>
            <p className="text-sm text-gray-400">Supported in 40+ countries</p>
          </div>
          
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-800/30">
            <Shield className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-white">Secure & Reliable</h3>
            <p className="text-sm text-gray-400">Bank-level security and encryption</p>
          </div>

          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-800/30">
            <Zap className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-white">Fast Payouts</h3>
            <p className="text-sm text-gray-400">Automatic daily payouts to your bank</p>
          </div>
        </div>

        {/* Connection Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create New Account */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Create New Stripe Account</CardTitle>
              <CardDescription className="text-gray-400">
                Set up a new Stripe account with guided onboarding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Quick 5-minute setup process</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">2.9% + 30¢ per successful charge</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Automatic daily payouts to your bank</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Built-in fraud protection</span>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Create Stripe Account
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                You'll be redirected to Stripe to complete the setup process
              </p>
            </CardContent>
          </Card>

          {/* Connect Existing Account */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Connect Existing Account</CardTitle>
              <CardDescription className="text-gray-400">
                Securely link your existing Stripe account via OAuth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Secure OAuth 2.0 connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">No manual account IDs needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Stripe handles all verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">Keep your existing settings</span>
                </div>
              </div>
              
              <Button 
                onClick={handleOAuthConnect}
                disabled={loading}
                variant="outline"
                className="w-full border-green-600/50 text-green-400 hover:bg-green-900/40 py-3"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Connect with Stripe
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Stripe will securely authenticate and connect your account
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-gray-800/30 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">How It Works</CardTitle>
            <CardDescription className="text-gray-400">Simple 3-step process to start earning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Choose Your Option</h3>
                <p className="text-gray-400 text-sm">Create a new account or connect an existing one</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Complete Setup</h3>
                <p className="text-gray-400 text-sm">Follow Stripe's secure onboarding process</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">Start Earning</h3>
                <p className="text-gray-400 text-sm">Begin accepting payments immediately</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
