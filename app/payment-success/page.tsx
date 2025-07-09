"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react"

interface PaymentVerificationResult {
  success: boolean
  purchase?: any
  paymentIntent?: {
    id: string
    amount: number
    amountReceived: number
    currency: string
    status: string
    receiptEmail?: string
  }
  productBox?: {
    id: string
    title: string
    description?: string
    thumbnailUrl?: string
    price?: number
  }
  creator?: {
    id: string
    name: string
    username: string
  }
  verificationDetails?: {
    method: string
    verifiedAt: string
    connectedAccount?: string | null
    duplicateCheck: boolean
  }
  error?: string
  alreadyProcessed?: boolean
  alreadyOwned?: boolean
  message?: string
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [convertingSession, setConvertingSession] = useState(false)

  const paymentIntentId = searchParams.get("payment_intent")
  const sessionId = searchParams.get("session_id")
  const connectedAccountId = searchParams.get("account_id")
  const videoId = searchParams.get("video_id")
  const productBoxId = searchParams.get("product_box_id")

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    if (paymentIntentId) {
      // Direct payment intent verification
      verifyPaymentIntent(paymentIntentId)
    } else if (sessionId) {
      // Convert session ID to payment intent ID first
      convertSessionToPaymentIntent()
    } else {
      setError("No payment information found in URL")
      setLoading(false)
    }
  }, [user, paymentIntentId, sessionId])

  const convertSessionToPaymentIntent = async () => {
    if (!user || !sessionId) return

    try {
      setConvertingSession(true)
      console.log(`🔄 [Payment Success] Converting session ID to payment intent: ${sessionId}`)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/purchase/get-payment-intent-from-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sessionId,
          accountId: connectedAccountId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to convert session ID")
      }

      console.log(`✅ [Payment Success] Session converted to payment intent: ${result.paymentIntentId}`)

      // Now verify the payment intent
      await verifyPaymentIntent(result.paymentIntentId)
    } catch (err: any) {
      console.error(`❌ [Payment Success] Session conversion error:`, err)
      setError(err.message || "Failed to process payment session")
      setLoading(false)
    } finally {
      setConvertingSession(false)
    }
  }

  const verifyPaymentIntent = async (intentId: string) => {
    if (!user || !intentId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Payment Success] Verifying payment intent: ${intentId}`)
      console.log(`🔍 [Payment Success] User: ${user.uid}`)
      if (connectedAccountId) {
        console.log(`🔍 [Payment Success] Connected account: ${connectedAccountId}`)
      }

      const idToken = await user.getIdToken()
      const response = await fetch("/api/purchase/verify-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: intentId,
          accountId: connectedAccountId,
        }),
      })

      const result: PaymentVerificationResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Payment verification failed (${response.status})`)
      }

      console.log(`✅ [Payment Success] Payment verification successful:`, result)
      setVerificationResult(result)
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error(`❌ [Payment Success] Payment verification error:`, err)
      setError(err.message || "Failed to verify payment")
      setRetryCount((prev) => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  const handleViewContent = () => {
    if (verificationResult?.purchase?.productBoxId) {
      router.push(`/product-box/${verificationResult.purchase.productBoxId}/content`)
    } else if (verificationResult?.productBox?.id) {
      router.push(`/product-box/${verificationResult.productBox.id}/content`)
    } else if (videoId) {
      router.push(`/video/${videoId}`)
    } else if (productBoxId) {
      router.push(`/product-box/${productBoxId}/content`)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Payment Verification Issue")
    const body = encodeURIComponent(
      `Payment Intent ID: ${paymentIntentId || "N/A"}\nSession ID: ${sessionId || "N/A"}\nConnected Account: ${connectedAccountId || "N/A"}\nUser ID: ${user?.uid || "N/A"}\nError: ${error || "Unknown"}\nRetry Count: ${retryCount}`,
    )
    window.open(`mailto:support@massclip.com?subject=${subject}&body=${body}`, "_blank")
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to verify your purchase.</p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Log In to Continue
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Your payment is secure. Log in to access your purchased content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment information validation
  if (!paymentIntentId && !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 mb-4">
              This payment verification link is missing payment information or is invalid.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-1">Expected URL formats:</h3>
              <div className="text-sm text-yellow-800 space-y-1">
                <p className="font-mono text-xs">/payment-success?payment_intent=pi_xxx</p>
                <p className="font-mono text-xs">/payment-success?session_id=cs_xxx</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              If you completed a purchase, check your email for the correct verification link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading || convertingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">
              {convertingSession ? "Processing Payment Session" : "Verifying Payment"}
            </h2>
            <p className="text-gray-600 mb-4">
              {convertingSession
                ? "Converting your payment session to verify the purchase..."
                : "We're confirming your payment with Stripe. This should only take a moment."}
            </p>
            <div className="space-y-2">
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {convertingSession ? (
                  <>
                    <li>• Converting checkout session to payment intent</li>
                    <li>• Retrieving payment details from Stripe</li>
                    <li>• Preparing for instant verification</li>
                  </>
                ) : (
                  <>
                    <li>• Retrieving payment details directly from Stripe API</li>
                    <li>• Validating payment completion status</li>
                    <li>• Setting up your content access instantly</li>
                    <li>• Recording purchase in our database</li>
                    <li>• No webhook delays - direct verification!</li>
                  </>
                )}
              </ul>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="space-y-1">
                {paymentIntentId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Payment Intent:</span> ...{paymentIntentId.slice(-8)}
                  </p>
                )}
                {sessionId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Session ID:</span> ...{sessionId.slice(-8)}
                  </p>
                )}
                {connectedAccountId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Connected Account:</span> ...{connectedAccountId.slice(-8)}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  <span className="font-medium">User:</span> {user.email || user.uid.slice(-8)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button
                onClick={() =>
                  paymentIntentId ? verifyPaymentIntent(paymentIntentId) : convertSessionToPaymentIntent()
                }
                className="w-full"
                disabled={retryCount >= 3}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryCount >= 3 ? "Max Retries Reached" : `Try Again ${retryCount > 0 ? `(${retryCount}/3)` : ""}`}
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
              <Button onClick={handleContactSupport} variant="outline" size="sm" className="w-full bg-transparent">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-900 mb-1">What to do:</h3>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Check your email for a Stripe receipt</li>
                <li>• If you were charged, your purchase is valid</li>
                <li>• Try refreshing or contact support</li>
                <li>• We'll resolve this quickly!</li>
              </ul>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="space-y-1">
                {paymentIntentId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Payment Intent:</span> ...{paymentIntentId.slice(-8)}
                  </p>
                )}
                {sessionId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Session ID:</span> ...{sessionId.slice(-8)}
                  </p>
                )}
                {connectedAccountId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Connected Account:</span> ...{connectedAccountId.slice(-8)}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Retry Count:</span> {retryCount}/3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (verificationResult?.success) {
    const {
      purchase,
      paymentIntent,
      productBox,
      creator,
      verificationDetails,
      alreadyProcessed,
      alreadyOwned,
      message,
    } = verificationResult

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              \
