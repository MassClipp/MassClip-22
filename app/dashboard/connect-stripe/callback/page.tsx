"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <h2 className="text-lg font-semibold">Processing Connection</h2>
              <p className="text-sm text-gray-600 text-center">
                We're setting up your Stripe connection. This will only take a moment...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success === "true") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Connection Successful!</CardTitle>
            <CardDescription>Your Stripe account has been successfully connected to MassClip.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>You can now start receiving payments for your premium content.</AlertDescription>
            </Alert>
            <Button onClick={handleDashboard} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  const getErrorMessage = (errorCode: string | null, description: string | null) => {
    switch (errorCode) {
      case "invalid_state":
        return {
          title: "Invalid state parameter - session may have expired",
          description: "The OAuth state was not found in our database. Please try connecting again.",
          suggestion:
            "This usually happens if you took too long to complete the connection or if there was a browser issue.",
        }
      case "expired_state":
        return {
          title: "Session Expired",
          description: "Your connection session has expired. Please start the connection process again.",
          suggestion: "For security reasons, connection sessions expire after 15 minutes.",
        }
      case "used_state":
        return {
          title: "Connection Already Processed",
          description: "This connection has already been completed.",
          suggestion: "If you need to reconnect, please start a new connection process.",
        }
      case "token_exchange_failed":
        return {
          title: "Token Exchange Failed",
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Connection Failed</CardTitle>
          <CardDescription>There was an issue connecting your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorInfo.title}</AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-3 rounded-md">
            <h4 className="font-medium text-sm mb-1">Error Details:</h4>
            <p className="text-sm text-gray-600 mb-2">{errorInfo.description}</p>
            <p className="text-xs text-gray-500">{errorInfo.suggestion}</p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <h4 className="font-medium text-sm mb-1 text-yellow-800">Debug Info:</h4>
              <p className="text-xs text-yellow-700">Error: {error}</p>
              <p className="text-xs text-yellow-700">Description: {errorDescription}</p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleRetry} className="flex-1">
              Try Again
            </Button>
            <Button onClick={handleDashboard} variant="outline" className="flex-1 bg-transparent">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
