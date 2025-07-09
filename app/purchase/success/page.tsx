"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, RefreshCw, ExternalLink, ShoppingBag } from "lucide-react"

interface PurchaseVerificationResult {
  success: boolean
  purchase?: any
  session?: {
    id: string
    amount: number
    currency: string
    payment_status: string
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

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verificationResult, setVerificationResult] = useState<PurchaseVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!user || !sessionId) {
      setLoading(false)
      return
    }

    verifyPurchase()
  }, [user, sessionId])

  const verifyPurchase = async () => {
    if (!user || !sessionId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`🔍 [Purchase Success] Verifying purchase for session: ${sessionId}`)

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: user.uid,
        }),
      })

      const result: PurchaseVerificationResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Verification failed")
      }

      console.log(`✅ [Purchase Success] Verification successful:`, result)
      setVerificationResult(result)
    } catch (err: any) {
      console.error(`❌ [Purchase Success] Verification error:`, err)
      setError(err.message || "Failed to verify purchase")
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
    // You can implement your support contact method here
    window.open(
      "mailto:support@massclip.com?subject=Purchase Verification Issue&body=Session ID: " + sessionId,
      "_blank",
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to verify your purchase.</p>
            <Button onClick={() => router.push("/login")}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Purchase Link</h2>
            <p className="text-gray-600 mb-4">This purchase link is missing the session ID or is invalid.</p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
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
            <h2 className="text-xl font-semibold mb-2">Verifying Purchase</h2>
            <p className="text-gray-600 mb-4">
              We're confirming your purchase with Stripe. This should only take a moment.
            </p>
            <div className="space-y-2">
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Retrieving your payment details from Stripe</li>
                <li>• Validating payment completion</li>
                <li>• Setting up your content access</li>
                <li>• This is much faster than waiting for webhooks!</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-4">Session ID: {sessionId.slice(-8)}</p>
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
            <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={verifyPurchase} className="w-full">
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
                <li>• If you were charged, your purchase is valid</li>
                <li>• Try refreshing or contact support</li>
                <li>• We'll resolve this quickly!</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-4">Session ID: {sessionId.slice(-8)}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationResult?.success) {
    const { purchase, session, productBox, creator, alreadyProcessed } = verificationResult

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              {alreadyProcessed ? "Purchase Confirmed!" : "Purchase Successful!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">{productBox?.title || "Your Purchase"}</h3>
              <p className="text-gray-600">
                ${session?.amount?.toFixed(2) || "0.00"} {session?.currency?.toUpperCase() || "USD"}
              </p>
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
                <span className="text-gray-600">Session ID:</span>
                <span className="font-mono text-xs">{sessionId.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Status:</span>
                <span className="text-green-600 font-medium">{session?.payment_status || "Paid"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Verification:</span>
                <span className="text-green-600 font-medium">
                  {alreadyProcessed ? "Previously Verified" : "Instantly Verified"}
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
                <li>• Payment verified instantly with Stripe</li>
                <li>• Content access activated immediately</li>
                <li>• Receipt sent to your email</li>
                <li>• No waiting for webhooks!</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your purchase has been verified and recorded. You now have lifetime access to this content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
