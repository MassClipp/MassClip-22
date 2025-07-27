"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink, Copy, AlertTriangle, Clock, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PurchaseDetails {
  session: {
    id: string
    amount: number
    currency: string
    status: string
    customerEmail?: string
    created?: string
  }
  purchase: {
    id: string
    productBoxId?: string
    bundleId?: string
    itemId: string
    itemType: string
    userId: string
    amount: number
  }
  item: {
    title: string
    description?: string
    type: string
  }
  alreadyProcessed?: boolean
}

interface ErrorDetails {
  error: string
  details?: string
  type?: string
  sessionId?: string
  currentMode?: string
  sessionMode?: string
  suggestion?: string
}

export default function PurchaseSuccessPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [productBoxId, setProductBoxId] = useState<string | null>(null)
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)

  const verifyPurchase = async (sessionId: string, isRetry = false) => {
    try {
      console.log("🔍 [Purchase Success] Starting verification...")
      console.log("   Session ID:", sessionId)
      console.log("   Current domain:", window.location.origin)
      console.log("   Full URL:", window.location.href)
      console.log("   User authenticated:", !!user)
      console.log("   Is retry:", isRetry)
      console.log("   Retry count:", retryCount)

      if (!isRetry) {
        setVerificationStatus("loading")
        setErrorDetails(null)
      }

      // Get auth token if user is available
      let idToken = null
      if (user) {
        try {
          idToken = await user.getIdToken(true)
          console.log("🔐 [Purchase Success] Auth token obtained")
        } catch (error) {
          console.error("❌ [Purchase Success] Failed to get auth token:", error)
        }
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
        setErrorDetails(null)
        toast({
          title: data.alreadyProcessed ? "Purchase Already Processed" : "Purchase Verified!",
          description: "Your access has been granted successfully.",
        })
      } else {
        setVerificationStatus("error")
        setErrorDetails(data)
        console.error("❌ [Purchase Success] Verification failed:", data)

        // Show specific error messages based on error type
        if (data.error === "Session mode mismatch") {
          toast({
            title: "Configuration Issue",
            description: "There's a mismatch between test and live modes. Please contact support.",
            variant: "destructive",
          })
        } else if (data.error === "Session not found") {
          toast({
            title: "Session Expired",
            description: "This checkout session has expired. Please try making a new purchase.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Verification Failed",
            description: data.details || data.error || "Unknown error occurred",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setVerificationStatus("error")
      setErrorDetails({
        error: "Network Error",
        details: "Failed to verify purchase. Please check your connection and try again.",
        type: "NetworkError",
      })
      toast({
        title: "Network Error",
        description: "Failed to connect to verification service. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRetry = async () => {
    if (!sessionId || retryCount >= maxRetries) return

    setIsRetrying(true)
    setRetryCount((prev) => prev + 1)

    // Add delay before retry
    await new Promise((resolve) => setTimeout(resolve, 1000))

    await verifyPurchase(sessionId, true)
    setIsRetrying(false)
  }

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId)
      toast({
        title: "Copied",
        description: "Session ID copied to clipboard",
      })
    }
  }

  const copyErrorDetails = () => {
    if (errorDetails) {
      const errorText = JSON.stringify(errorDetails, null, 2)
      navigator.clipboard.writeText(errorText)
      toast({
        title: "Copied",
        description: "Error details copied to clipboard",
      })
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getContentUrl = () => {
    if (!purchaseDetails) return "/dashboard"

    const { purchase } = purchaseDetails
    if (purchase.productBoxId) {
      return `/product-box/${purchase.productBoxId}/content`
    } else if (purchase.bundleId) {
      return `/bundle/${purchase.bundleId}/content`
    }
    return "/dashboard/purchases"
  }

  useEffect(() => {
    console.log("🔗 [Purchase Success] Page loaded, extracting URL parameters...")
    console.log("   Full URL:", window.location.href)
    console.log("   Search params:", window.location.search)

    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const sessionIdFromUrl = urlParams.get("session_id")
    const productBoxIdFromUrl = urlParams.get("product_box_id")

    console.log("   Session ID from URL:", sessionIdFromUrl)
    console.log("   Product Box ID from URL:", productBoxIdFromUrl)

    if (!sessionIdFromUrl) {
      console.error("❌ [Purchase Success] No session ID found in URL")
      setVerificationStatus("error")
      setErrorDetails({
        error: "Invalid URL",
        details: "No session ID found in URL. This link may be invalid or expired.",
        suggestion: "Please try making a new purchase or contact support if you believe this is an error.",
      })
      return
    }

    setSessionId(sessionIdFromUrl)
    setProductBoxId(productBoxIdFromUrl)

    // Start verification (works with or without user authentication)
    verifyPurchase(sessionIdFromUrl)
  }, []) // Remove user dependency to start verification immediately

  // Handle user authentication changes
  useEffect(() => {
    if (user && sessionId && verificationStatus === "error" && retryCount < maxRetries) {
      console.log("👤 [Purchase Success] User authenticated, retrying verification...")
      verifyPurchase(sessionId, true)
    }
  }, [user, sessionId, verificationStatus])

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Invalid Purchase Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">This purchase verification link is invalid or expired.</p>
            <div className="text-sm text-gray-500">
              <div>Current URL: {typeof window !== "undefined" ? window.location.href : "Loading..."}</div>
            </div>
            <Button onClick={() => (window.location.href = "/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {verificationStatus === "loading" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Verifying Purchase
              </>
            )}
            {verificationStatus === "success" && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Purchase Verified!
              </>
            )}
            {verificationStatus === "error" && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Verification Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {verificationStatus === "loading" && "Please wait while we verify your payment with Stripe..."}
            {verificationStatus === "success" && "Your purchase has been confirmed and access granted."}
            {verificationStatus === "error" && "There was an issue verifying your purchase."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationStatus === "loading" && (
            <div className="text-center space-y-4">
              <div className="animate-pulse text-gray-600">Processing your payment verification...</div>
              <div className="text-sm text-gray-500 space-y-1">
                <div>Session: {sessionId}</div>
                <div>Domain: {typeof window !== "undefined" ? window.location.origin : "Loading..."}</div>
                <div>User: {user ? "Authenticated" : "Not authenticated"}</div>
                <div>Attempt: {retryCount + 1}</div>
              </div>
            </div>
          )}

          {verificationStatus === "success" && purchaseDetails && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-green-600 font-medium text-lg">
                  🎉 {purchaseDetails.alreadyProcessed ? "Purchase Confirmed!" : "Payment Successful!"}
                </p>
                <p className="text-gray-600 mt-2">You now have access to your purchased content.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Purchase Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Item:</span>{" "}
                      <span className="font-medium">{purchaseDetails.item.title}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>{" "}
                      <span className="font-medium capitalize">{purchaseDetails.item.type.replace("_", " ")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>{" "}
                      <span className="font-medium">
                        {formatAmount(purchaseDetails.session.amount, purchaseDetails.session.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>{" "}
                      <span className="font-medium text-green-600">{purchaseDetails.session.status}</span>
                    </div>
                    {purchaseDetails.session.customerEmail && (
                      <div>
                        <span className="text-gray-600">Email:</span>{" "}
                        <span className="font-medium">{purchaseDetails.session.customerEmail}</span>
                      </div>
                    )}
                    {purchaseDetails.session.created && (
                      <div>
                        <span className="text-gray-600">Date:</span>{" "}
                        <span className="font-medium">
                          {new Date(purchaseDetails.session.created).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Session Info</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Purchase ID:</span>{" "}
                      <span className="font-mono text-xs">{purchaseDetails.purchase.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Session ID:</span>
                      <Button variant="ghost" size="sm" onClick={copySessionId} className="h-6 px-2">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-mono text-xs text-gray-500 break-all">{sessionId}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => (window.location.href = getContentUrl())} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Content
                </Button>
                <Button
                  onClick={() => (window.location.href = "/dashboard/purchases")}
                  variant="outline"
                  className="flex-1"
                >
                  My Purchases
                </Button>
              </div>
            </div>
          )}

          {verificationStatus === "error" && errorDetails && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-600 font-medium">{errorDetails.error}</p>
                    {errorDetails.details && <p className="text-red-600 text-sm mt-1">{errorDetails.details}</p>}
                    {errorDetails.suggestion && (
                      <p className="text-red-700 text-sm mt-2 font-medium">{errorDetails.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode mismatch specific help */}
              {errorDetails.error === "Session mode mismatch" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 font-medium">Configuration Issue Detected</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Your session is from {errorDetails.sessionMode} mode but the API is in{" "}
                        {errorDetails.currentMode} mode. This usually happens during development or deployment
                        transitions.
                      </p>
                      <p className="text-yellow-700 text-sm mt-2">
                        Please contact support with your session ID for assistance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Session expired specific help */}
              {errorDetails.error === "Session not found" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-blue-800 font-medium">Session Expired</p>
                      <p className="text-blue-700 text-sm mt-1">
                        Checkout sessions expire after 24 hours for security reasons. If you completed your payment
                        recently, it may still be processing.
                      </p>
                      <p className="text-blue-700 text-sm mt-2">
                        Try refreshing the page or check your email for a confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Debug Information</h3>
                  <Button variant="ghost" size="sm" onClick={copyErrorDetails} className="h-6 px-2">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Current Domain: {typeof window !== "undefined" ? window.location.origin : "Loading..."}</div>
                  <div>User Authenticated: {user ? "Yes" : "No"}</div>
                  <div>Error Type: {errorDetails.type || "Unknown"}</div>
                  <div>
                    Retry Count: {retryCount}/{maxRetries}
                  </div>
                  {productBoxId && <div>Product Box ID: {productBoxId}</div>}
                  <div className="flex items-center gap-2">
                    <span>Session ID:</span>
                    <Button variant="ghost" size="sm" onClick={copySessionId} className="h-6 px-2">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-mono text-xs break-all">{sessionId}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying || retryCount >= maxRetries}
                  className="flex-1"
                  variant="outline"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : retryCount >= maxRetries ? (
                    "Max Retries Reached"
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Verification ({retryCount}/{maxRetries})
                    </>
                  )}
                </Button>
                <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
                  Go to Dashboard
                </Button>
              </div>

              {!user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-600 text-sm">
                    💡 <strong>Tip:</strong> If you're not logged in, try logging in first and then retry verification.
                    Your purchase is still valid.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
