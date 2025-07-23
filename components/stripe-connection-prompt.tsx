"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface ApiResponse {
  success?: boolean
  error?: string
  details?: string
  oauthUrl?: string
  onboardingUrl?: string
  alreadySetup?: boolean
  message?: string
  baseUrl?: string
  callbackUrl?: string
  [key: string]: any
}

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
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isConnectingAccount, setIsConnectingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const { user } = useFirebaseAuth()

  const callStripeAPI = async (endpoint: string, buttonType: string) => {
    try {
      console.log(`🚀 [${buttonType}] Starting Stripe API call to ${endpoint}`)
      setError(null)
      setDebugInfo(null)

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get Firebase ID token
      const idToken = await user.getIdToken()
      console.log(`🔑 [${buttonType}] Got Firebase ID token`)

      // Call the API endpoint
      console.log(`📡 [${buttonType}] Making request to ${endpoint}`)
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      console.log(`📊 [${buttonType}] Response status: ${response.status}`)
      console.log(`📊 [${buttonType}] Response headers:`, Object.fromEntries(response.headers.entries()))

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error(`❌ [${buttonType}] Non-JSON response:`, textResponse)
        throw new Error(`Server returned ${contentType} instead of JSON. Check server logs.`)
      }

      const data: ApiResponse = await response.json()
      console.log(`📦 [${buttonType}] Response data:`, data)

      // Store debug info
      setDebugInfo({
        endpoint,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        timestamp: new Date().toISOString(),
      })

      if (!response.ok) {
        console.error(`❌ [${buttonType}] API Error:`, data)
        throw new Error(data.details || data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        if (data.alreadySetup) {
          console.log(`✅ [${buttonType}] Account already set up:`, data.message)
          setError(`✅ ${data.message}`)
          return
        }

        const redirectUrl = data.oauthUrl || data.onboardingUrl
        if (redirectUrl) {
          console.log(`🔗 [${buttonType}] Redirecting to: ${redirectUrl}`)

          // Test the URL before redirecting
          try {
            new URL(redirectUrl)
            console.log(`✅ [${buttonType}] URL validation passed`)

            // Log environment info
            if (data.baseUrl) {
              console.log(`🌐 [${buttonType}] Base URL: ${data.baseUrl}`)
            }
            if (data.callbackUrl) {
              console.log(`🔄 [${buttonType}] Callback URL: ${data.callbackUrl}`)
            }

            window.location.href = redirectUrl
          } catch (urlError) {
            console.error(`❌ [${buttonType}] Invalid URL:`, redirectUrl)
            throw new Error(`Invalid redirect URL generated: ${redirectUrl}`)
          }
        } else {
          throw new Error("No redirect URL provided in response")
        }
      } else {
        throw new Error(data.error || "Unknown error occurred")
      }
    } catch (err: any) {
      console.error(`❌ [${buttonType}] Error:`, err)
      setError(err.message || "An unexpected error occurred")

      // Add network debugging info
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError(`Network Error: ${err.message}. Check your internet connection.`)
      }
    }
  }

  const handleCreateAccount = async () => {
    setIsCreatingAccount(true)
    try {
      await callStripeAPI("/api/stripe/onboard-url", "Create Account")
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleConnectExisting = async () => {
    setIsConnectingAccount(true)
    try {
      await callStripeAPI("/api/stripe/connect-url", "Connect Existing")
    } finally {
      setIsConnectingAccount(false)
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
                  <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                ) : (
                  <span className="w-4 h-4 bg-red-500 rounded-full"></span>
                )}
                <span className="text-sm text-zinc-300">Accept Payments</span>
              </div>
              <div className="flex items-center gap-2">
                {existingStatus.capabilities?.payouts_enabled ? (
                  <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                ) : (
                  <span className="w-4 h-4 bg-red-500 rounded-full"></span>
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
              disabled={isCreatingAccount}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingAccount ? (
                <>
                  <span className="w-4 h-4 bg-blue-600 rounded-full animate-spin"></span>
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
    <div className={`max-w-4xl mx-auto p-6 space-y-6 ${className}`}>
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
          <ExternalLink className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Connect Your Stripe Account</h1>
        <p className="text-muted-foreground">Start accepting payments and track your earnings</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-bold">$</span>
          </div>
          <h3 className="font-semibold">Accept Payments</h3>
          <p className="text-sm text-muted-foreground">Process payments from customers worldwide</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-bold">🌍</span>
          </div>
          <h3 className="font-semibold">Global Reach</h3>
          <p className="text-sm text-muted-foreground">Supported in 40+ countries</p>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white font-bold">🔒</span>
          </div>
          <h3 className="font-semibold">Secure & Reliable</h3>
          <p className="text-sm text-muted-foreground">Bank-level security and encryption</p>
        </div>
      </div>

      {error && (
        <Alert variant={error.startsWith("✅") ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {debugInfo && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="p-0 h-auto font-normal"
                >
                  {showDebug ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide technical details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show technical details
                    </>
                  )}
                </Button>
                {showDebug && (
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Create New Stripe Account
            </CardTitle>
            <CardDescription>Set up a new Stripe account to start accepting payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Quick 5-minute setup
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                2.9% + 30¢ per transaction
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Automatic payouts to your bank
              </div>
            </div>
            <Button onClick={handleCreateAccount} disabled={isCreatingAccount} className="w-full" size="lg">
              <ExternalLink className="w-4 h-4 mr-2" />
              {isCreatingAccount ? "Creating Account..." : "Create Stripe Account"}
            </Button>
            <p className="text-xs text-muted-foreground">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <ExternalLink className="w-5 h-5" />
              Already Have a Stripe Account?
            </CardTitle>
            <CardDescription>Securely connect your existing Stripe account through Stripe Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Secure OAuth connection
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                No manual account IDs needed
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Stripe handles account verification
              </div>
            </div>
            <Button
              onClick={handleConnectExisting}
              disabled={isConnectingAccount}
              variant="outline"
              className="w-full border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {isConnectingAccount ? "Connecting..." : "Connect with Stripe"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Stripe will detect your existing account and connect it securely
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-semibold">Connect Account</h4>
              <p className="text-muted-foreground">
                Choose to create a new Stripe account or connect your existing one
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-semibold">Complete Setup</h4>
              <p className="text-muted-foreground">
                Provide your business information and verify your identity with Stripe
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-semibold">Start Earning</h4>
              <p className="text-muted-foreground">Begin accepting payments and track your earnings in real-time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
