"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Centralized API call handler
  const callStripeAPI = async (endpoint: string, action: string) => {
    if (!user) {
      console.error(`❌ [${action}] No authenticated user`)
      setError("Please log in to continue")
      return null
    }

    try {
      console.log(`🚀 [${action}] Starting ${action.toLowerCase()} flow...`)

      // Get Firebase ID token
      const idToken = await user.getIdToken()
      console.log(`✅ [${action}] Got Firebase ID token`)

      // Call the API endpoint
      console.log(`📡 [${action}] Calling ${endpoint}...`)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      console.log(`📥 [${action}] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      })

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error(`❌ [${action}] Non-JSON response:`, textResponse)
        setDebugInfo(
          `Server returned: ${response.status} ${response.statusText}\nContent: ${textResponse.substring(0, 500)}`,
        )
        throw new Error(`Server error: Expected JSON but got ${contentType}`)
      }

      const data = await response.json()
      console.log(`📋 [${action}] Response data:`, data)

      if (!response.ok) {
        console.error(`❌ [${action}] API error:`, data)
        setDebugInfo(`API Error: ${JSON.stringify(data, null, 2)}`)
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      return data
    } catch (error: any) {
      console.error(`❌ [${action}] Error:`, error)
      setError(error.message || `Failed to ${action.toLowerCase()}`)

      // Add more debug info for network errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        setDebugInfo("Network error: Unable to reach the server. Check your internet connection.")
      }

      return null
    }
  }

  // Handler for creating a new Stripe account
  const handleCreateAccount = async () => {
    setIsConnecting(true)
    setError(null)
    setDebugInfo(null)

    const data = await callStripeAPI("/api/stripe/onboard-url", "Create Account")

    if (data) {
      if (data.alreadySetup) {
        console.log("✅ [Create Account] Account already set up")
        onConnectionSuccess()
      } else if (data.onboardingUrl) {
        console.log("🔗 [Create Account] Redirecting to onboarding URL:", data.onboardingUrl)

        // Test the URL before redirecting
        try {
          new URL(data.onboardingUrl)
          console.log("✅ [Create Account] URL validation passed")
          window.location.href = data.onboardingUrl
        } catch (urlError) {
          console.error("❌ [Create Account] Invalid URL:", data.onboardingUrl)
          setError("Invalid onboarding URL received")
          setDebugInfo(`Invalid URL: ${data.onboardingUrl}`)
        }
      } else {
        console.error("❌ [Create Account] No onboarding URL in response:", data)
        setError("No onboarding URL received from server")
        setDebugInfo(`Response missing URL: ${JSON.stringify(data, null, 2)}`)
      }
    }

    setIsConnecting(false)
  }

  // Handler for connecting existing account via OAuth
  const handleConnectExisting = async () => {
    setIsConnecting(true)
    setError(null)
    setDebugInfo(null)

    const data = await callStripeAPI("/api/stripe/connect-url", "Connect Existing")

    if (data) {
      if (data.oauthUrl) {
        console.log("🔗 [Connect Existing] Redirecting to OAuth URL:", data.oauthUrl)

        // Test the URL before redirecting
        try {
          new URL(data.oauthUrl)
          console.log("✅ [Connect Existing] URL validation passed")
          window.location.href = data.oauthUrl
        } catch (urlError) {
          console.error("❌ [Connect Existing] Invalid URL:", data.oauthUrl)
          setError("Invalid OAuth URL received")
          setDebugInfo(`Invalid URL: ${data.oauthUrl}`)
        }
      } else {
        console.error("❌ [Connect Existing] No OAuth URL in response:", data)
        setError("No OAuth URL received from server")
        setDebugInfo(`Response missing OAuth URL: ${JSON.stringify(data, null, 2)}`)
      }
    }

    setIsConnecting(false)
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
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
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

  // Default connection prompt
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

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500 bg-red-500/10 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <div className="font-medium mb-1">Connection Error</div>
            <div className="text-sm">{error}</div>
            {debugInfo && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
                  Show technical details
                </summary>
                <pre className="mt-1 text-xs text-red-400 whitespace-pre-wrap bg-red-900/20 p-2 rounded border border-red-800/50 overflow-auto max-h-32">
                  {debugInfo}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Account */}
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
              disabled={isConnecting}
            >
              {isConnecting ? (
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

        {/* Connect Existing Account */}
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-green-400" />
              Already Have a Stripe Account?
            </CardTitle>
            <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span>Secure OAuth connection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span>No manual account IDs needed</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-300">
                <CheckCircle className="h-4 w-4" />
                <span>Stripe handles account verification</span>
              </div>
            </div>

            <Button
              onClick={handleConnectExisting}
              disabled={isConnecting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Connect with Stripe
                </>
              )}
            </Button>
            <p className="text-xs text-green-300 text-center">
              Stripe will detect your existing account and connect it securely
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-white mb-2">New to Stripe?</h3>
              <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1">
                <li>Click "Create Stripe Account"</li>
                <li>You'll be redirected to Stripe's secure setup</li>
                <li>Fill out your business information</li>
                <li>Verify your identity and bank details</li>
                <li>Return here automatically when complete</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">Already Have Stripe?</h3>
              <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1">
                <li>Click "Connect with Stripe"</li>
                <li>You'll be redirected to Stripe Connect</li>
                <li>Log into your existing Stripe account</li>
                <li>Authorize MassClip to connect</li>
                <li>Return here with your account connected</li>
              </ol>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Both options are secure</p>
                <p>
                  Whether you're creating a new account or connecting an existing one, Stripe handles all the security
                  and verification. You'll never need to manually enter account IDs or API keys.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
