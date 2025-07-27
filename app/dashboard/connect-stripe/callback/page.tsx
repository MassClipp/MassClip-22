"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2, Clock, AlertTriangle, RefreshCw, Info, Copy } from "lucide-react"
import { getAuth } from "firebase/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const success = searchParams.get("success")
  const completed = searchParams.get("completed")
  const refresh = searchParams.get("refresh")
  const recovered = searchParams.get("recovered")
  const alreadyConnected = searchParams.get("already_connected")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const debugInfoParam = searchParams.get("debug_info")

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

      const idToken = await currentUser.getIdToken()

      // Use the fixed API endpoint that works with Firebase auth
      const response = await fetch(`/api/stripe/account-status-fixed?userId=${currentUser.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
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
    })

    const processCallback = async () => {
      if (success === "true" || completed === "true" || refresh === "true") {
        // Simulate processing time for better UX
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setIsProcessing(false)

        // Fetch account status with retry logic
        await fetchAccountStatus(1)
      } else {
        setIsProcessing(false)
      }
    }

    processCallback()
  }, [success, completed, refresh, error, errorDescription])

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
    router.push("/dashboard")
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

  if (success === "true" || completed === "true" || refresh === "true") {
    const isFullySetup = accountStatus?.isFullyEnabled && !accountStatus?.actionsRequired
    const hasRequirements = accountStatus?.actionsRequired
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
    })

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="relative max-w-2xl w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg blur-xl" />
          <div className="relative bg-black border border-white/10 rounded-lg p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-6">
              {/* Status icon */}
              <div className="relative">
                {isFullySetup ? (
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
                        : isFullySetup
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
                        : isFullySetup
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
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state (when URL params indicate an error)
  const getErrorMessage = (errorCode: string | null, description: string | null) => {
    switch (errorCode) {
      case "invalid_state":
        return {
          title: "Session Issue",
          description: description || "Your connection session was invalid or corrupted.",
          suggestion: "This can happen if you took too long or if there was a browser issue. Try connecting again.",
        }
      case "expired_state":
        return {
          title: "Session Expired",
          description: description || "Your connection session has expired.",
          suggestion:
            "For security reasons, connection sessions expire after 30 minutes. Please start a new connection.",
        }
      case "used_state":
        return {
          title: "Already Processed",
          description: description || "This connection has already been completed.",
          suggestion: "If you need to reconnect, please start a new connection process from the dashboard.",
        }
      case "token_exchange_failed":
        return {
          title: "Connection Failed",
          description: description || "Failed to complete the connection with Stripe.",
          suggestion: "This is usually a temporary issue with Stripe's servers. Please try connecting again.",
        }
      case "processing_failed":
        return {
          title: "Processing Error",
          description: description || "An error occurred while processing your connection.",
          suggestion: "Please try connecting again. If the problem persists, contact support.",
        }
      case "profile_update_failed":
        return {
          title: "Save Failed",
          description: description || "Failed to save your Stripe connection to your profile.",
          suggestion: "Your Stripe account was connected but we couldn't save it. Please try again.",
        }
      case "access_denied":
        return {
          title: "Access Denied",
          description: "You denied access to connect your Stripe account.",
          suggestion: "To use premium features, you need to connect your Stripe account.",
        }
      default:
        return {
          title: "Connection Failed",
          description: description || "An unexpected error occurred during the connection process.",
          suggestion: "Please try connecting again. If the problem persists, contact support.",
        }
    }
  }

  const errorInfo = getErrorMessage(error, errorDescription)

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="relative max-w-2xl w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-lg blur-xl" />
        <div className="relative bg-black border border-white/10 rounded-lg p-8 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-6">
            {/* Error icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />
              <div className="relative bg-red-500/10 rounded-full p-4 border border-red-500/20">
                <XCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title and description */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-light text-white tracking-wide">{errorInfo.title}</h1>
              <p className="text-sm text-white/70 font-light leading-relaxed max-w-sm">{errorInfo.description}</p>
            </div>

            {/* Error details */}
            <div className="w-full bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div className="space-y-1 flex-1">
                  <p className="text-xs text-white/80 font-light">{errorInfo.suggestion}</p>
                  {process.env.NODE_ENV === "development" && (
                    <div className="text-xs text-white/50 font-mono">
                      {error} • {errorDescription}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Debug info section for errors */}
            {debugInfo && (
              <Card className="w-full bg-zinc-900/60 border-zinc-800/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-light text-zinc-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Error Debug Information
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
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
                        <span className="text-xs text-zinc-400">Error Time:</span>
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

                      <p className="text-xs text-zinc-400">
                        Copy this information if you need to contact support about this error.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex space-x-3 w-full">
              <Button
                onClick={handleRetry}
                className="flex-1 bg-white text-black hover:bg-white/90 font-light tracking-wide transition-all duration-200 border-0"
              >
                Try Again
              </Button>
              <Button
                onClick={handleDashboard}
                variant="outline"
                className="flex-1 bg-transparent border-white/20 text-white/80 hover:bg-white/5 font-light tracking-wide transition-all duration-200"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
