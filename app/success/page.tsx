"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, RefreshCw, ExternalLink, ShoppingBag, CreditCard } from "lucide-react"

interface PaymentVerificationResult {
  success: boolean
  purchase?: any
  paymentIntent?: {
    id: string
    amount: number
    amountReceived: number
    currency: string
    status: string
  }
  productBox?: {
    id: string
    title: string
    description?: string
    thumbnailUrl?: string
  }
  creator?: {
    id: string
    name: string
    username: string
  }
  error?: string
  alreadyProcessed?: boolean
}

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verificationResult, setVerificationResult] = useState<PaymentVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      console.log(`🔍 [Success Page] Verifying payment intent: ${paymentIntentId}`)

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
        throw new Error(result.error || "Verification failed")
      }

      console.log(`✅ [Success Page] Verification successful:`, result)
      setVerificationResult(result)
    } catch (err: any) {
      console.error(`❌ [Success Page] Verification error:`, err)
      setError(err.message || "Failed to verify payment")
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
      `Payment Intent ID: ${paymentIntentId}\nConnected Account: ${connectedAccountId || "N/A"}\nUser ID: ${user?.uid}`,
    )
    window.open(`mailto:support@massclip.com?subject=${subject}&body=${body}`, "_blank")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to verify your payment.</p>
            <Button onClick={() => router.push("/login")}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!paymentIntentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 mb-4">This payment link is missing the payment intent ID or is invalid.</p>
            <div className="space-y-2">
              <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                <li>• Retrieving payment details directly from Stripe</li>
                <li>• Validating payment completion status</li>
                <li>• Setting up your content access</li>
                <li>• No webhook delays - direct verification!</li>
              </ul>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-gray-400">Payment Intent: {paymentIntentId.slice(-8)}</p>
              {connectedAccountId && (
                <p className="text-xs text-gray-400">Connected Account: {connectedAccountId.slice(-8)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={verifyPayment} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
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
                <li>• If you were charged, your payment is valid</li>
                <li>• Try refreshing or contact support</li>
                <li>• We'll resolve this quickly!</li>
              </ul>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-gray-400">Payment Intent: {paymentIntentId.slice(-8)}</p>
              {connectedAccountId && (
                <p className="text-xs text-gray-400">Connected Account: {connectedAccountId.slice(-8)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationResult?.success) {
    const { purchase, paymentIntent, productBox, creator, alreadyProcessed } = verificationResult

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              {alreadyProcessed ? "Payment Confirmed!" : "Payment Successful!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">{productBox?.title || "Your Purchase"}</h3>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <CreditCard className="h-4 w-4" />
                <span>
                  ${paymentIntent?.amount?.toFixed(2) || "0.00"} {paymentIntent?.currency?.toUpperCase() || "USD"}
                </span>
              </div>
              {paymentIntent?.amountReceived !== paymentIntent?.amount && (
                <p className="text-sm text-gray-500">
                  (Received: ${paymentIntent?.amountReceived?.toFixed(2) || "0.00"})
                </p>
              )}
              {creator && (
                <p className="text-sm text-gray-500 mt-1">
                  by {creator.name} (@{creator.username})
                </p>
              )}
            </div>

            {productBox?.thumbnailUrl && (
              <div className="flex justify-center">
                <img
                  src={productBox.thumbnailUrl || "/placeholder.svg"}
                  alt={productBox.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Intent:</span>
                <span className="font-mono text-xs">{paymentIntentId.slice(-8)}</span>
              </div>
              {connectedAccountId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Connected Account:</span>
                  <span className="font-mono text-xs">{connectedAccountId.slice(-8)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Status:</span>
                <span className="text-green-600 font-medium">{paymentIntent?.status || "Succeeded"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verification:</span>
                <span className="text-green-600 font-medium">
                  {alreadyProcessed ? "Previously Verified" : "Direct API Verified"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Access:</span>
                <span className="text-green-600 font-medium">Lifetime</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handleViewContent} className="w-full">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Access Your Content
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View All Purchases
              </Button>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">✅ All Set!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Payment verified directly with Stripe API</li>
                <li>• Content access activated immediately</li>
                <li>• Receipt sent to your email</li>
                <li>• No webhook dependencies!</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your payment has been verified using the Payment Intent and recorded. You now have lifetime access to this
              content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
