"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  User,
  Package,
} from "lucide-react"

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
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const paymentIntentId = searchParams.get("payment_intent")
  const connectedAccountId = searchParams.get("account_id")

  useEffect(() => {
    if (!user || !paymentIntentId) {
      setLoading(false)
      return
    }

    verifyPayment()
  }, [user, paymentIntentId])

  const verifyPayment = async () => {
    if (!user || !paymentIntentId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Payment Success] Verifying payment intent: ${paymentIntentId}`)
      console.log(`🔍 [Payment Success] User: ${user.uid}`)
      if (connectedAccountId) {
        console.log(`🔍 [Payment Success] Connected account: ${connectedAccountId}`)
      }

      const response = await fetch("/api/purchase/verify-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId,
          connectedAccountId,
          userId: user.uid,
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
    if (verificationResult?.productBox?.id) {
      router.push(`/product-box/${verificationResult.productBox.id}/content`)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Payment Verification Issue")
    const body = encodeURIComponent(
      `Payment Intent ID: ${paymentIntentId}\nConnected Account: ${connectedAccountId || "N/A"}\nUser ID: ${user?.uid || "N/A"}\nError: ${error || "Unknown"}\nRetry Count: ${retryCount}`,
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

  // Payment Intent ID validation
  if (!paymentIntentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 mb-4">
              This payment verification link is missing the payment intent ID or is invalid.
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
              <h3 className="font-medium text-yellow-900 mb-1">Expected URL format:</h3>
              <p className="text-sm text-yellow-800 font-mono">
                /payment-success?payment_intent=pi_xxx&account_id=acct_yyy
              </p>
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
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600 mb-4">
              We're confirming your payment with Stripe using the Payment Intent. This should only take a moment.
            </p>
            <div className="space-y-2">
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Retrieving payment details directly from Stripe API</li>
                <li>• Validating payment completion status</li>
                <li>• Setting up your content access instantly</li>
                <li>• Recording purchase in our database</li>
                <li>• No webhook delays - direct verification!</li>
              </ul>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Payment Intent:</span> ...{paymentIntentId.slice(-8)}
                </p>
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
              <Button onClick={verifyPayment} className="w-full" disabled={retryCount >= 3}>
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
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Payment Intent:</span> ...{paymentIntentId.slice(-8)}
                </p>
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
    const { purchase, paymentIntent, productBox, creator, verificationDetails, alreadyProcessed } = verificationResult

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              {alreadyProcessed ? "Purchase Confirmed!" : "Payment Successful!"}
            </CardTitle>
            {alreadyProcessed && <p className="text-sm text-green-600">This purchase was previously verified</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Information */}
            <div className="text-center">
              <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                <Package className="h-5 w-5" />
                {productBox?.title || "Your Purchase"}
              </h3>
              <div className="flex items-center justify-center gap-2 text-gray-600 mt-1">
                <CreditCard className="h-4 w-4" />
                <span>
                  ${paymentIntent?.amount?.toFixed(2) || "0.00"} {paymentIntent?.currency?.toUpperCase() || "USD"}
                </span>
              </div>
              {paymentIntent?.amountReceived !== paymentIntent?.amount && (
                <p className="text-sm text-gray-500">
                  (Amount Received: ${paymentIntent?.amountReceived?.toFixed(2) || "0.00"})
                </p>
              )}
              {creator && (
                <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-1">
                  <User className="h-4 w-4" />
                  <span>
                    by {creator.name} (@{creator.username})
                  </span>
                </div>
              )}
            </div>

            {/* Product Thumbnail */}
            {productBox?.thumbnailUrl && (
              <div className="flex justify-center">
                <img
                  src={productBox.thumbnailUrl || "/placeholder.svg"}
                  alt={productBox.title}
                  className="w-24 h-24 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                  }}
                />
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Intent:</span>
                <span className="font-mono text-xs">...{paymentIntentId.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Status:</span>
                <span className="text-green-600 font-medium">{paymentIntent?.status || "Succeeded"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verification Method:</span>
                <span className="text-green-600 font-medium">
                  {verificationDetails?.method === "payment_intent_direct" ? "Direct API" : "Standard"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Access Level:</span>
                <span className="text-green-600 font-medium">Lifetime</span>
              </div>
              {connectedAccountId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Creator Account:</span>
                  <span className="font-mono text-xs">...{connectedAccountId.slice(-8)}</span>
                </div>
              )}
              {paymentIntent?.receiptEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receipt Email:</span>
                  <span className="text-xs">{paymentIntent.receiptEmail}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={handleViewContent} className="w-full">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Access Your Content
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View All Purchases
              </Button>
            </div>

            {/* Success Information */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">✅ All Set!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Payment verified instantly via Stripe Payment Intent API</li>
                <li>• Content access activated immediately</li>
                <li>• Purchase recorded in multiple database locations</li>
                <li>• Receipt sent to your email address</li>
                <li>• No webhook dependencies - direct verification!</li>
              </ul>
            </div>

            {/* Technical Details */}
            {verificationDetails && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-1">🔧 Technical Details</h3>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>Verified: {new Date(verificationDetails.verifiedAt).toLocaleString()}</p>
                  <p>Method: {verificationDetails.method}</p>
                  {verificationDetails.connectedAccount && (
                    <p>Connected Account: ...{verificationDetails.connectedAccount.slice(-8)}</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Your payment has been verified using the Payment Intent and securely recorded. You now have lifetime
              access to this content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
