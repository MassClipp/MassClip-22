"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PurchaseDetails {
  session: {
    id: string
    amount: number
    currency: string
    status: string
    customerEmail?: string
  }
  purchase: {
    id: string
    bundleId?: string
    itemId?: string
    userId: string
    amount: number
  }
  item: {
    id?: string
    title: string
    description?: string
  }
  alreadyProcessed?: boolean
}

export default function PurchaseSuccessPage() {
  const { user, loading, authChecked } = useAuth()
  const { toast } = useToast()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false)

  const verifyPurchase = async (sessionId: string, isManualRetry = false) => {
    try {
      console.log("🔍 [Purchase Success] Starting verification...")
      console.log("   Session ID:", sessionId)
      console.log("   Current domain:", window.location.origin)
      console.log("   Full URL:", window.location.href)
      console.log("   User authenticated:", !!user)
      console.log("   User ID:", user?.uid || "none")
      console.log("   Is manual retry:", isManualRetry)
      console.log("   Retry count:", retryCount)

      setVerificationStatus("loading")

      // Get auth token if user is available
      let idToken = null
      if (user) {
        try {
          console.log("🔐 [Purchase Success] Getting fresh auth token...")
          idToken = await user.getIdToken(true) // Force refresh
          console.log("✅ [Purchase Success] Auth token obtained")
        } catch (error) {
          console.error("❌ [Purchase Success] Failed to get auth token:", error)
        }
      } else {
        console.log("⚠️ [Purchase Success] No authenticated user, proceeding anonymously")
      }

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          idToken,
        }),
      })

      console.log("📊 [Purchase Success] Verification response status:", response.status)

      const data = await response.json()
      console.log("📊 [Purchase Success] Verification response:", data)

      if (data.success) {
        setVerificationStatus("success")
        setPurchaseDetails(data)
        setRetryCount(0) // Reset retry count on success
        toast({
          title: data.alreadyProcessed ? "Purchase Already Processed" : "Purchase Verified!",
          description: user
            ? "Your access has been granted to your account."
            : "Your purchase has been verified. Sign in to access from your account.",
        })
      } else {
        setVerificationStatus("error")
        setErrorMessage(data.error || data.message || "Verification failed")

        // Increment retry count only for manual retries
        if (isManualRetry) {
          setRetryCount((prev) => prev + 1)
        }

        console.error("❌ [Purchase Success] Verification failed:", data)
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setVerificationStatus("error")
      setErrorMessage("Network error: Failed to verify purchase. Please check your connection and try again.")

      // Increment retry count only for manual retries
      if (isManualRetry) {
        setRetryCount((prev) => prev + 1)
      }
    }
  }

  const handleRetry = async () => {
    if (!sessionId || retryCount >= 5) return

    setIsRetrying(true)
    await verifyPurchase(sessionId, true) // Mark as manual retry
    setIsRetrying(false)
  }

  const getContentUrl = () => {
    if (!purchaseDetails) return "/dashboard"

    // Get bundle ID from purchase details (from session metadata)
    const bundleId = purchaseDetails.purchase.bundleId || purchaseDetails.purchase.itemId || purchaseDetails.item.id

    console.log("🔗 [Purchase Success] Determining content URL...")
    console.log("   Bundle ID from purchase.bundleId:", purchaseDetails.purchase.bundleId)
    console.log("   Item ID from purchase.itemId:", purchaseDetails.purchase.itemId)
    console.log("   Item ID from item.id:", purchaseDetails.item.id)
    console.log("   Final selected ID:", bundleId)

    if (!bundleId || bundleId === "null") {
      console.error("❌ [Purchase Success] No valid bundle ID found")
      return "/dashboard/purchases"
    }

    // For bundles, redirect to the bundle content page
    return `/product-box/${bundleId}/content`
  }

  // Extract URL parameters and start verification when auth is ready
  useEffect(() => {
    console.log("🔗 [Purchase Success] Page loaded, extracting URL parameters...")
    console.log("   Full URL:", window.location.href)
    console.log("   Search params:", window.location.search)
    console.log("   Auth loading:", loading)
    console.log("   Auth checked:", authChecked)
    console.log("   User:", user ? "authenticated" : "not authenticated")

    // Get session ID from URL - this is the only parameter we need
    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")

    console.log("   Session ID from URL:", sessionIdFromUrl)

    if (!sessionIdFromUrl) {
      console.error("❌ [Purchase Success] No session ID found in URL")
      setVerificationStatus("error")
      setErrorMessage("No session ID found in URL. This link may be invalid or expired.")
      return
    }

    setSessionId(sessionIdFromUrl)

    // Wait for auth to finish loading before starting verification
    if (loading || !authChecked) {
      console.log("⏳ [Purchase Success] Waiting for auth to finish loading...")
      return
    }

    // Start verification only once auth is ready and we haven't attempted yet
    if (!hasAttemptedVerification) {
      console.log("🚀 [Purchase Success] Auth is ready, starting verification...")
      console.log("   User status:", user ? `authenticated (${user.uid})` : "not authenticated")
      setHasAttemptedVerification(true)
      verifyPurchase(sessionIdFromUrl, false) // Not a manual retry
    }
  }, [loading, authChecked, user, hasAttemptedVerification]) // Add auth dependencies

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-light text-white">Invalid Link</h1>
              <p className="text-sm text-gray-400 font-light">This purchase verification link is invalid or expired.</p>
            </div>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full bg-white text-black hover:bg-gray-100 font-light"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while auth is initializing
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-light text-white">Initializing</h1>
              <p className="text-sm text-gray-400 font-light">Preparing to verify your purchase...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-8">
          {verificationStatus === "loading" && (
            <>
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-light text-white">Verifying Purchase</h1>
                <p className="text-sm text-gray-400 font-light">Please wait while we confirm your payment...</p>
              </div>
            </>
          )}

          {verificationStatus === "success" && purchaseDetails && (
            <>
              <div className="flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-light text-white">Purchase Complete</h1>
                <p className="text-sm text-gray-400 font-light">{purchaseDetails.item.title}</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => (window.location.href = getContentUrl())}
                  className="w-full bg-white text-black hover:bg-gray-100 font-light"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Bundle
                </Button>
                <Button
                  onClick={() => (window.location.href = "/dashboard/purchases")}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white hover:bg-white/5 font-light"
                >
                  View All Purchases
                </Button>
              </div>
            </>
          )}

          {verificationStatus === "error" && (
            <>
              <div className="flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-red-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-light text-white">Verification Failed</h1>
                <p className="text-sm text-gray-400 font-light">{errorMessage}</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying || retryCount >= 5}
                  className="w-full bg-white text-black hover:bg-gray-100 font-light"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : retryCount >= 5 ? (
                    "Max Retries Reached"
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again ({retryCount}/5)
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => (window.location.href = "/dashboard")}
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white hover:bg-white/5 font-light"
                >
                  Return to Dashboard
                </Button>
              </div>
              {!user && (
                <div className="text-xs text-gray-500 font-light">💡 Try logging in first, then retry verification</div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
