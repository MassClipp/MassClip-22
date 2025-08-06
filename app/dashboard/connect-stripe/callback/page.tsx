"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2, Clock, AlertTriangle, RefreshCw, Info, Copy, ExternalLink, DollarSign, ArrowRight } from 'lucide-react'
import { getAuth } from "firebase/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AccountStatus {
  connected: boolean
  accountId?: string
  isFullyEnabled: boolean
  actionsRequired: boolean
  actionUrl?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: {
    currently_due: Array<{ field: string; description: string }>
    past_due: Array<{ field: string; description: string }>
    eventually_due: Array<{ field: string; description: string }>
    pending_verification: Array<{ field: string; description: string }>
  }
  disabled_reason?: string
  country?: string
  business_type?: string
  error?: string
}

interface DebugInfo {
  source: string
  timestamp: string
  [key: string]: any
}

export default function StripeCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null)
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebugDetails, setShowDebugDetails] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const success = searchParams.get("success") === "true"
  const accountId = searchParams.get("account_id")
  const chargesEnabled = searchParams.get("charges_enabled") === "true"
  const detailsSubmitted = searchParams.get("details_submitted") === "true"
  const error = searchParams.get("error")
  const completed = searchParams.get("completed")
  const refresh = searchParams.get("refresh")
  const recovered = searchParams.get("recovered")
  const alreadyConnected = searchParams.get("already_connected")
  const errorDescription = searchParams.get("error_description")
  const debugInfoParam = searchParams.get("debug_info")

  // New OAuth flow parameters
  const fullySetup = searchParams.get("fully_setup") === "true"
  const actionRequired = searchParams.get("action_required") === "true"
  const stripeAccountId = searchParams.get("stripe_account_id")
  const oauthError = searchParams.get("error")
  const oauthErrorDescription = searchParams.get("error_description")

  // Parse debug info if available
  useEffect(() => {
    if (debugInfoParam) {
      try {
        const parsed = JSON.parse(debugInfoParam)
        setDebugInfo(parsed)
        console.log("🔍 [Callback Page] Debug info:", parsed)
      } catch (e) {
        console.error("❌ [Callback Page] Failed to parse debug info:", e)
      }
    }
  }, [debugInfoParam])

  const fetchAccountStatus = async (attempt = 1) => {
    try {
      console.log(`🔍 [Callback Page] Fetching account status (attempt ${attempt})...`)

      // Get Firebase ID token for authentication
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        console.error("❌ [Callback Page] No authenticated user found")
        setStatusError("User not authenticated")
        return
      }

      const idToken = await currentUser.getIdToken(true) // Force refresh token

      // Use the fixed API endpoint that works with Firebase auth
      const response = await fetch(`/api/stripe/account-status-fixed?userId=${currentUser.uid}&t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store", // Force fresh data
      })

      console.log(`📡 [Callback Page] Response status: ${response.status}`)

      if (response.ok) {
        const status = await response.json()
        console.log("📊 [Callback Page] Account status received:", status)
        setAccountStatus(status)
        setStatusError(null)

        if (status.error && !status.connected) {
          setStatusError(status.error)
        }
      } else {
        const errorText = await response.text()
        console.error("❌ [Callback Page] Error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }

        setStatusError(errorData.error || `HTTP ${response.status} error`)

        // Set a fallback status for display purposes
        setAccountStatus({
          connected: false,
          isFullyEnabled: false,
          actionsRequired: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: [],
            pending_verification: [],
          },
          error: errorData.error,
        })
      }
    } catch (error) {
      console.error("❌ [Callback Page] Network error fetching account status:", error)
      setStatusError("Network error while fetching account status")

      // Set a fallback status for display purposes
      setAccountStatus({
        connected: false,
        isFullyEnabled: false,
        actionsRequired: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: {
          currently_due: [],
          past_due: [],
          eventually_due: [],
          pending_verification: [],
        },
        error: "Network error",
      })
    }
  }

  useEffect(() => {
    console.log("🔄 [Callback Page] Processing callback with params:", {
      success,
      completed,
      refresh,
      recovered,
      alreadyConnected,
      error,
      errorDescription,
      hasDebugInfo: !!debugInfoParam,
      fullySetup,
      actionRequired,
      stripeAccountId,
      oauthError,
      oauthErrorDescription,
    })

    const processCallback = async () => {
      if (success || completed || refresh || fullySetup || actionRequired) {
        // Simulate processing time for better UX
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setIsProcessing(false)

        // Fetch account status with retry logic
        await fetchAccountStatus(1)

        // Signal to other tabs/components that connection was updated
        try {
          localStorage.setItem("stripe_connection_updated", Date.now().toString())
          // Remove it immediately so it can be set again later
          setTimeout(() => localStorage.removeItem("stripe_connection_updated"), 100)
        } catch (e) {
          console.warn("Could not update localStorage:", e)
        }
      } else {
        setIsProcessing(false)
      }
    }

    processCallback()
  }, [success, completed, refresh, error, errorDescription, fullySetup, actionRequired, stripeAccountId, oauthError, oauthErrorDescription])

  const handleRetry = () => {
    console.log("🔄 [Callback Page] User clicked retry")
    router.push("/dashboard/connect-stripe")
  }

  const handleRefreshStatus = async () => {
    console.log("🔄 [Callback Page] User clicked refresh status")
    setRetryCount((prev) => prev + 1)
    setStatusError(null)
    await fetchAccountStatus(retryCount + 2)
  }

  const handleDashboard = () => {
    console.log("✅ [Callback Page] User returning to dashboard")

    // Signal connection update one more time before navigating
    try {
      localStorage.setItem("stripe_connection_updated", Date.now().toString())
      setTimeout(() => localStorage.removeItem("stripe_connection_updated"), 100)
    } catch (e) {
      console.warn("Could not update localStorage:", e)
    }

    router.push("/dashboard/earnings") // Go directly to earnings page
  }

  const handleActionRequired = () => {
    if (!accountStatus?.actionUrl) {
      console.error("❌ [Callback Page] No action URL available")
      return
    }

    setIsLoadingAction(true)
    console.log("🔗 [Callback Page] Redirecting to Stripe action URL:", accountStatus.actionUrl)

    // Redirect to Stripe's action URL
    window.location.href = accountStatus.actionUrl
  }

  const copyDebugInfo = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
    }
  }

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (success && countdown === 0) {
      router.push("/dashboard/earnings")
    }
  }, [success, countdown, router])

  if (oauthError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-800 bg-zinc-900 text-white">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-red-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-red-400">Connection Failed</CardTitle>
            <CardDescription className="text-zinc-400">
              There was an issue connecting your Stripe account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-zinc-800 rounded-lg border border-red-800/40">
              <p className="text-sm text-zinc-300">{decodeURIComponent(oauthErrorDescription || oauthError)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/dashboard/connect-stripe")}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Try Again
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1 text-zinc-300 border-zinc-700 hover:bg-zinc-700/20"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (fullySetup) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-green-800 bg-zinc-900 text-white">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-green-400 text-2xl">Successfully Connected!</CardTitle>
            <CardDescription className="text-zinc-400">
              Your Stripe account has been connected to MassClip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Info */}
            <div className="bg-zinc-800 p-4 rounded-lg border border-green-800/40">
              <h3 className="font-semibold mb-3 text-zinc-300">Account Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Account ID</span>
                  <Badge variant="outline" className="text-zinc-300 border-zinc-700">{stripeAccountId?.slice(-8)}</Badge>
                </div>
                {/* Removed chargesEnabled and detailsSubmitted */}
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/40">
              <h3 className="font-semibold text-blue-400 mb-2">What's Next?</h3>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• Start creating premium content and bundles</li>
                <li>• Set your pricing and payment options</li>
                <li>• Track your earnings in the dashboard</li>
                <li>• Receive automatic payouts to your bank</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/dashboard/earnings")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                View Earnings
                {countdown > 0 && (
                  <span className="ml-2 text-xs">({countdown}s)</span>
                )}
              </Button>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1 text-zinc-300 border-zinc-700 hover:bg-zinc-700/20"
              >
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Auto-redirect notice */}
            {countdown > 0 && (
              <p className="text-center text-sm text-zinc-500">
                Redirecting to earnings dashboard in {countdown} seconds...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg blur-xl" />
          <div className="relative bg-black border border-white/10 rounded-lg p-12 max-w-md w-full backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md" />
                <Loader2 className="relative h-8 w-8 animate-spin text-white" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-light text-white tracking-wide">Processing Connection</h2>
                <p className="text-sm text-white/60 font-light leading-relaxed">
                  Setting up your Stripe integration...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isFullySetup = accountStatus?.isFullyEnabled && !accountStatus?.actionsRequired
  const hasRequirements = accountStatus?.actionsRequired || actionRequired
  const hasActionUrl = accountStatus?.actionUrl
  const isRecovered = recovered === "true"
  const wasAlreadyConnected = alreadyConnected === "true"

  console.log("🔍 [Callback Page] Render conditions:", {
    accountStatus: !!accountStatus,
    isFullySetup,
    hasRequirements,
    hasActionUrl,
    statusError,
    connected: accountStatus?.connected,
    isRecovered,
    wasAlreadyConnected,
    fullySetup,
    actionRequired,
  })

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg blur-xl" />
        <div className="relative bg-black border border-white/10 rounded-lg p-8 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6">
            {/* Status icon */}
            <div className="relative">
              {isFullySetup || fullySetup ? (
                <>
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-lg" />
                  <div className="relative bg-green-500/10 rounded-full p-4 border border-green-500/20">
                    <CheckCircle className="h-8 w-8 text-green-400" strokeWidth={1.5} />
                  </div>
                </>
              ) : statusError ? (
                <>
                  <div className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />
                  <div className="relative bg-red-500/10 rounded-full p-4 border border-red-500/20">
                    <XCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-lg" />
                  <div className="relative bg-yellow-500/10 rounded-full p-4 border border-yellow-500/20">
                    <Clock className="h-8 w-8 text-yellow-400" strokeWidth={1.5} />
                  </div>
                </>
              )}
            </div>

            {/* Title and description */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-light text-white tracking-wide">
                {statusError
                  ? "Connection Issue"
                  : isRecovered
                    ? "Connection Recovered!"
                    : wasAlreadyConnected
                      ? "Already Connected!"
                      : isFullySetup || fullySetup
                        ? "Setup Complete!"
                        : "Connection Successful"}
              </h1>
              <p className="text-sm text-white/70 font-light leading-relaxed max-w-sm">
                {statusError
                  ? "There was an issue checking your account status. You can try refreshing or continue to dashboard."
                  : isRecovered
                    ? "Your existing Stripe connection was found and restored successfully."
                    : wasAlreadyConnected
                      ? "Your Stripe account was already connected to your profile."
                      : isFullySetup || fullySetup
                        ? "Your Stripe account is fully configured and ready to receive payments."
                        : "Your Stripe account has been connected, but additional setup may be required."}
              </p>
            </div>

            {/* Recovery/Already Connected Notice */}
            {(isRecovered || wasAlreadyConnected) && (
              <div className="w-full bg-blue-500/5 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div className="space-y-1">
                    <h3 className="text-sm font-light text-blue-400">
                      {isRecovered ? "Session Recovery" : "Existing Connection"}
                    </h3>
                    <p className="text-xs text-white/70 font-light">
                      {isRecovered
                        ? "Your session expired, but we found your existing Stripe connection and restored it."
                        : "This connection was already processed successfully."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status indicators */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <span className="text-xs text-white/80 font-light">Account Connected</span>
                <div className={`w-2 h-2 rounded-full ${accountStatus?.connected ? "bg-green-400" : "bg-red-400"}`} />
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <span className="text-xs text-white/80 font-light">Payments Enabled</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    accountStatus?.charges_enabled ? "bg-green-400" : "bg-yellow-400"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <span className="text-xs text-white/80 font-light">Payouts Enabled</span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    accountStatus?.payouts_enabled ? "bg-green-400" : "bg-yellow-400"
                  }`}
                />
              </div>
            </div>

            {/* Error message if status fetch failed */}
            {statusError && (
              <div className="w-full bg-red-500/5 rounded-lg p-4 border border-red-500/20">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-light text-red-400">Status Check Failed</h3>
                    <p className="text-xs text-white/70 font-light">{statusError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements section */}
            {hasRequirements && !statusError && (
              <div className="w-full bg-yellow-500/5 rounded-lg p-4 border border-yellow-500/20">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm font-light text-yellow-400">Action Required</h3>
                    <p className="text-xs text-white/70 font-light">
                      Complete your account setup to start receiving payments:
                    </p>

                    {/* Show specific requirements */}
                    <div className="space-y-1">
                      {accountStatus?.requirements.currently_due.map((req, index) => (
                        <div key={index} className="text-xs text-white/60 font-light">
                          • {req.description}
                        </div>
                      ))}
                      {accountStatus?.requirements.past_due.map((req, index) => (
                        <div key={index} className="text-xs text-red-400 font-light">
                          • {req.description} (Past Due)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Debug info section */}
            {debugInfo && (
              <Card className="w-full bg-zinc-900/60 border-zinc-800/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-light text-zinc-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Debug Information
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {debugInfo.source}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebugDetails(!showDebugDetails)}
                        className="h-6 px-2 text-xs"
                      >
                        {showDebugDetails ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {showDebugDetails && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Timestamp:</span>
                        <span className="text-xs text-zinc-300 font-mono">
                          {new Date(debugInfo.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-zinc-800/50 rounded p-3 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyDebugInfo}
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <pre className="text-xs text-zinc-300 font-mono overflow-auto max-h-32">
                          {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex flex-col space-y-3 w-full">
              {/* Refresh Status button - shows when there's an error */}
              {statusError && (
                <Button
                  onClick={handleRefreshStatus}
                  variant="outline"
                  className="w-full bg-transparent border-blue-500/20 text-blue-400 hover:bg-blue-500/5 font-light tracking-wide transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              )}

              {/* Action Required button - only shows when there are requirements and action URL */}
              {hasRequirements && hasActionUrl && !statusError && (
                <Button
                  onClick={handleActionRequired}
                  disabled={isLoadingAction}
                  className="w-full bg-red-600 text-white hover:bg-red-700 font-light tracking-wide transition-all duration-200 border-0"
                >
                  {isLoadingAction ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}

              {/* Continue to Dashboard button */}
              <Button
                onClick={handleDashboard}
                variant={hasRequirements && !statusError ? "outline" : "default"}
                className={
                  hasRequirements && !statusError
                    ? "w-full bg-transparent border-white/20 text-white/80 hover:bg-white/5 font-light tracking-wide transition-all duration-200"
                    : "w-full bg-white text-black hover:bg-white/90 font-light tracking-wide transition-all duration-200 border-0"
                }
              >
                Continue to Earnings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
