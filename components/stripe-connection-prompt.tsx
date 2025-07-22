"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  ExternalLink,
  Link,
  Info,
  CheckCircle,
  Loader2,
  AlertCircle,
  DollarSign,
  Globe,
  Shield,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface ConnectionStatus {
  isConnected: boolean
  accountId: string | null
  businessType: "individual" | "company" | null
  capabilities: {
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
    currently_due: string[]
    eventually_due: string[]
    past_due: string[]
  } | null
}

interface StripeConnectionPromptProps {
  onConnectionSuccess: () => void
  className?: string
  existingStatus?: ConnectionStatus | null
}

export default function StripeConnectionPrompt({
  onConnectionSuccess,
  className,
  existingStatus,
}: StripeConnectionPromptProps) {
  const { user } = useAuth()
  const [linkingAccount, setLinkingAccount] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Handle Express account creation (replaces the old "Create New Account" flow)
  const handleCreateAccount = async () => {
    if (!user) return

    try {
      setCreatingAccount(true)
      setError(null)

      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start Stripe Connect onboarding")
      }

      const data = await response.json()

      if (data.onboardingComplete) {
        // Account is already complete
        onConnectionSuccess()
      } else if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        console.log(`🔗 ${data.resuming ? "Resuming" : "Starting"} Stripe onboarding`)
        window.location.href = data.onboardingUrl
      }
    } catch (error: any) {
      console.error("Error creating account:", error)
      setError(error.message)
    } finally {
      setCreatingAccount(false)
    }
  }

  // Handle existing account linking (now uses proper Express account flow)
  const handleLinkExistingAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter your Stripe account ID")
      return
    }

    if (!accountId.startsWith("acct_")) {
      setError('Account ID must start with "acct_"')
      return
    }

    try {
      setLinkingAccount(true)
      setError(null)

      const idToken = await user!.getIdToken()

      const response = await fetch("/api/stripe/connect/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          stripeAccountId: accountId.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to link account")
      }

      onConnectionSuccess()
    } catch (error) {
      console.error("Error linking account:", error)
      setError(error instanceof Error ? error.message : "Failed to link account")
    } finally {
      setLinkingAccount(false)
    }
  }

  // If account exists but needs completion, show continue setup UI
  if (existingStatus?.accountId && !existingStatus.isConnected) {
    const needsAction =
      existingStatus.capabilities?.currently_due?.length > 0 || existingStatus.capabilities?.past_due?.length > 0

    return (
      <div className={`space-y-8 ${className}`}>
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Complete Your Stripe Setup</h1>
            <p className="text-zinc-400 text-lg">
              Your account needs additional information to start accepting payments
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="bg-zinc-900/60 border-zinc-800/50 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                {existingStatus.capabilities?.charges_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                )}
                <span className="text-sm text-zinc-300">Accept Payments</span>
              </div>
              <div className="flex items-center gap-2">
                {existingStatus.capabilities?.payouts_enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-400" />
                )}
                <span className="text-sm text-zinc-300">Receive Payouts</span>
              </div>
            </div>

            {needsAction && existingStatus.capabilities && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                <h4 className="font-medium text-red-300 mb-2">Action Required:</h4>
                <div className="text-sm text-red-400 space-y-1">
                  {existingStatus.capabilities.past_due.length > 0 && (
                    <p>• Past due: {existingStatus.capabilities.past_due.join(", ")}</p>
                  )}
                  {existingStatus.capabilities.currently_due.length > 0 && (
                    <p>• Currently due: {existingStatus.capabilities.currently_due.join(", ")}</p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateAccount}
              disabled={creatingAccount}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {creatingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Continue Setup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default connection prompt (keeping original design)
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <CreditCard className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Connect Your Stripe Account</h1>
          <p className="text-zinc-400 text-lg">Start accepting payments and track your earnings</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Accept Payments</h3>
          <p className="text-sm text-zinc-400">Process payments from customers worldwide</p>
        </div>
        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <Globe className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Global Reach</h3>
          <p className="text-sm text-zinc-400">Supported in 40+ countries</p>
        </div>
        <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">Secure & Reliable</h3>
          <p className="text-sm text-zinc-400">Bank-level security and encryption</p>
        </div>
      </div>

      {/* Connection Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Account - Now uses Express account flow */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-400" />
              Create New Stripe Account
            </CardTitle>
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>Quick 5-minute setup</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>2.9% + 30¢ per transaction</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <CheckCircle className="h-4 w-4" />
                <span>Automatic payouts to your bank</span>
              </div>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateAccount}
              disabled={creatingAccount}
            >
              {creatingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Create Stripe Account
                </>
              )}
            </Button>
            <p className="text-xs text-blue-300 text-center">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        {/* Link Existing Account - Keeps manual input for existing accounts */}
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-green-400" />
              Link Existing Account
            </CardTitle>
            <CardDescription>Connect your existing Stripe account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountId" className="text-green-300">
                Stripe Account ID
              </Label>
              <Input
                id="accountId"
                placeholder="acct_1234567890"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-zinc-800/50 border-green-800/50 focus:border-green-600"
              />
              <p className="text-xs text-green-300">Find this in your Stripe Dashboard → Settings → Account</p>
            </div>

            {error && (
              <Alert className="border-red-500 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleLinkExistingAccount}
              disabled={linkingAccount || !accountId.trim()}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {linkingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking Account...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Link Account
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-white mb-2">Creating a New Account</h3>
              <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1">
                <li>Click "Create Stripe Account" above</li>
                <li>You'll be redirected to Stripe's secure setup</li>
                <li>Fill out your business information</li>
                <li>Verify your identity and bank details</li>
                <li>Return here automatically when complete</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">Linking Existing Account</h3>
              <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1">
                <li>Log into your Stripe Dashboard</li>
                <li>Go to Settings → Account</li>
                <li>Copy your Account ID (starts with "acct_")</li>
                <li>Paste it in the form above</li>
                <li>Note: Only use this if you have an existing Express account</li>
              </ol>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => window.open("https://dashboard.stripe.com/settings/account", "_blank")}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Stripe Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
