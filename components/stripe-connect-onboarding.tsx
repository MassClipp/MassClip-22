"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CreditCard, Globe, Shield, CheckCircle, ExternalLink, AlertCircle, RefreshCw, DollarSign, Users, TrendingUp, Lock, Zap, ArrowRight } from 'lucide-react'
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface StripeConnectionStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  status: string
  country?: string
  email?: string
  businessType?: string
  defaultCurrency?: string
  requirements?: {
    currently_due: string[]
    past_due: string[]
    pending_verification: string[]
  }
  livemode?: boolean
}

export function StripeConnectOnboarding() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [stripeStatus, setStripeStatus] = useState<StripeConnectionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check connection status
  const checkConnectionStatus = async (refresh = false) => {
    if (!user?.uid) return

    try {
      setChecking(true)
      setError(null)

      const response = await fetch("/api/stripe/connect/status-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId: user.uid,
          refresh 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setStripeStatus(data)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check connection status")
      }
    } catch (err) {
      console.error("Error checking connection status:", err)
      setError(err instanceof Error ? err.message : "Failed to check connection")
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "error"
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

      const response = await fetch("/api/stripe/connect/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection")
      }

      if (data.authUrl) {
        // Redirect to Stripe OAuth
        window.location.href = data.authUrl
      }
    } catch (err) {
      console.error("Error initiating OAuth:", err)
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

      const response = await fetch("/api/stripe/create-stripe-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account")
      }

      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Error creating account:", err)
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

  // Loading states
  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">
            {authLoading ? "Loading..." : "Checking connection status..."}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-gray-400">Please log in to continue</p>
        </CardContent>
      </Card>
    )
  }

  // Show connected status
  if (stripeStatus?.connected) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Connection Status Header */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-800">Stripe Account Connected</CardTitle>
                  <CardDescription className="text-green-600">
                    Account ID: {stripeStatus.accountId?.slice(-8)}
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => checkConnectionStatus(true)}
                variant="outline"
                size="sm"
                disabled={checking}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Account Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Charges Enabled</span>
                {stripeStatus.chargesEnabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Payouts Enabled</span>
                {stripeStatus.payoutsEnabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Details Submitted</span>
                {stripeStatus.detailsSubmitted ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <Badge variant={stripeStatus.status === "active" ? "default" : "secondary"}>
                  {stripeStatus.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-600" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stripeStatus.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium">{stripeStatus.email}</span>
                </div>
              )}
              {stripeStatus.country && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Country</span>
                  <span className="font-medium">{stripeStatus.country.toUpperCase()}</span>
                </div>
              )}
              {stripeStatus.defaultCurrency && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency</span>
                  <span className="font-medium">{stripeStatus.defaultCurrency.toUpperCase()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Mode</span>
                <Badge variant={stripeStatus.livemode ? "default" : "secondary"}>
                  {stripeStatus.livemode ? "Live" : "Test"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements Alert */}
        {stripeStatus.requirements && (
          stripeStatus.requirements.currently_due.length > 0 || 
          stripeStatus.requirements.past_due.length > 0
        ) && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Action Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your Stripe account needs additional information to enable full functionality.
                  </p>
                  {stripeStatus.requirements.currently_due.length > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Currently due: {stripeStatus.requirements.currently_due.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your Stripe integration</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" className="flex-1">
              <ExternalLink className="mr-2 h-4 w-4" />
              Stripe Dashboard
            </Button>
            <Button variant="outline" className="flex-1">
              <DollarSign className="mr-2 h-4 w-4" />
              View Earnings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show connection options
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Connect Your Stripe Account
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Start accepting payments and receiving payouts by connecting your Stripe account. 
          Choose to create a new account or connect an existing one.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        <div className="text-center p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Accept Payments</h3>
          <p className="text-sm text-gray-600">Process payments from customers worldwide</p>
        </div>
        
        <div className="text-center p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <Globe className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Global Reach</h3>
          <p className="text-sm text-gray-600">Supported in 40+ countries</p>
        </div>
        
        <div className="text-center p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <Shield className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Secure & Reliable</h3>
          <p className="text-sm text-gray-600">Bank-level security and encryption</p>
        </div>

        <div className="text-center p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <Zap className="w-8 h-8 text-orange-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Fast Payouts</h3>
          <p className="text-sm text-gray-600">Automatic daily payouts to your bank</p>
        </div>
      </div>

      {/* Connection Options */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Create New Account */}
        <Card className="border-blue-200 bg-blue-50/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl">Create New Stripe Account</CardTitle>
            <CardDescription>
              Set up a new Stripe account with guided onboarding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Quick 5-minute setup process</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">2.9% + 30¢ per successful charge</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Automatic daily payouts to your bank</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Built-in fraud protection</span>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 shadow-md"
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
        <Card className="border-green-200 bg-green-50/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl">Connect Existing Account</CardTitle>
            <CardDescription>
              Securely link your existing Stripe account via OAuth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Secure OAuth 2.0 connection</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Stripe handles all verification</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Keep your existing settings</span>
              </div>
            </div>
            
            <Button 
              onClick={handleOAuthConnect}
              disabled={loading}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white py-3 shadow-md"
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
      <Card className="bg-gray-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How It Works</CardTitle>
          <CardDescription>Simple 3-step process to start earning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Option</h3>
              <p className="text-gray-600 text-sm">Create a new account or connect an existing one</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Complete Setup</h3>
              <p className="text-gray-600 text-sm">Follow Stripe's secure onboarding process</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Earning</h3>
              <p className="text-gray-600 text-sm">Begin accepting payments immediately</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Connection Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
            <Button 
              onClick={() => setError(null)} 
              variant="outline" 
              size="sm" 
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
