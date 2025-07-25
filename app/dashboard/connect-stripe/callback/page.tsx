"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"

export default function StripeCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)

  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  useEffect(() => {
    console.log("🔄 [Callback Page] Processing callback with params:", {
      success,
      error,
      errorDescription,
    })

    // Check localStorage for debugging info
    const debugInfo = localStorage.getItem("stripe_oauth_debug")
    const backupState = localStorage.getItem("stripe_oauth_state")

    if (debugInfo) {
      console.log("🔍 [Callback Page] Debug info from localStorage:", JSON.parse(debugInfo))
    }

    if (backupState) {
      console.log("🔍 [Callback Page] Backup state from localStorage:", backupState)
    }

    // Simulate processing time for better UX
    const timer = setTimeout(() => {
      setIsProcessing(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [success, error, errorDescription])

  const handleRetry = () => {
    console.log("🔄 [Callback Page] User clicked retry")
    router.push("/dashboard/connect-stripe")
  }

  const handleDashboard = () => {
    console.log("✅ [Callback Page] User returning to dashboard")
    router.push("/dashboard")
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          {/* Subtle gradient background */}
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

  if (success === "true") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg blur-xl" />

          <div className="relative bg-black border border-white/10 rounded-lg p-12 max-w-md w-full backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-8">
              {/* Clean checkmark with glow effect */}
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/30 rounded-full blur-lg" />
                <div className="relative bg-green-500/10 rounded-full p-4 border border-green-500/20">
                  <CheckCircle className="h-8 w-8 text-green-400" strokeWidth={1.5} />
                </div>
              </div>

              {/* Title and description */}
              <div className="text-center space-y-3">
                <h1 className="text-2xl font-light text-white tracking-wide">Connection Successful</h1>
                <p className="text-sm text-white/70 font-light leading-relaxed max-w-xs">
                  Your Stripe account has been successfully connected to MassClip.
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center space-x-3 bg-white/5 rounded-lg px-4 py-3 border border-white/10">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-white/80 font-light">Ready to receive payments</span>
              </div>

              {/* Action button */}
              <Button
                onClick={handleDashboard}
                className="w-full bg-white text-black hover:bg-white/90 font-light tracking-wide transition-all duration-200 border-0"
              >
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  const getErrorMessage = (errorCode: string | null, description: string | null) => {
    switch (errorCode) {
      case "invalid_state":
        return {
          title: "Session Expired",
          description: "Your connection session has expired. Please try connecting again.",
          suggestion: "This usually happens if you took too long to complete the connection.",
        }
      case "expired_state":
        return {
          title: "Session Expired",
          description: "Your connection session has expired. Please start the connection process again.",
          suggestion: "For security reasons, connection sessions expire after 15 minutes.",
        }
      case "used_state":
        return {
          title: "Already Connected",
          description: "This connection has already been completed.",
          suggestion: "If you need to reconnect, please start a new connection process.",
        }
      case "token_exchange_failed":
        return {
          title: "Connection Failed",
          description: "Failed to complete the connection with Stripe.",
          suggestion: "This is usually a temporary issue. Please try connecting again.",
        }
      case "processing_failed":
        return {
          title: "Processing Error",
          description: description || "An error occurred while processing your connection.",
          suggestion: "Please try connecting again. If the problem persists, contact support.",
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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-lg blur-xl" />

        <div className="relative bg-black border border-white/10 rounded-lg p-12 max-w-md w-full backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-8">
            {/* Error icon with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-lg" />
              <div className="relative bg-red-500/10 rounded-full p-4 border border-red-500/20">
                <XCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title and description */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-light text-white tracking-wide">{errorInfo.title}</h1>
              <p className="text-sm text-white/70 font-light leading-relaxed">{errorInfo.description}</p>
            </div>

            {/* Error details */}
            <div className="w-full bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <div className="space-y-1">
                  <p className="text-xs text-white/80 font-light">{errorInfo.suggestion}</p>
                  {process.env.NODE_ENV === "development" && (
                    <div className="text-xs text-white/50 font-mono">
                      {error} • {errorDescription}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
