"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"

interface PurchaseData {
  productBoxId: string
  sessionId: string
  amount: number
  currency: string
  status: string
  itemTitle: string
  itemDescription?: string
  thumbnailUrl?: string
  purchasedAt: any
  isTestPurchase?: boolean
  stripeAccount?: string
  connectedAccountId?: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 12 // 12 attempts over ~60 seconds

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!user || !sessionId) {
      setLoading(false)
      return
    }

    const checkPurchaseStatus = async () => {
      try {
        console.log(`🔍 [Purchase Success] Checking purchase status for session: ${sessionId}`)

        // Query all purchases to find the one with this session ID
        const userPurchasesRef = db.collection("users").doc(user.uid).collection("purchases")
        const purchasesSnapshot = await userPurchasesRef.where("sessionId", "==", sessionId).limit(1).get()

        if (!purchasesSnapshot.empty) {
          const purchaseDoc = purchasesSnapshot.docs[0]
          const data = purchaseDoc.data() as PurchaseData

          console.log("✅ [Purchase Success] Purchase found:", data)
          setPurchaseData(data)
          setLoading(false)
          return true
        } else {
          console.log(`❌ [Purchase Success] Purchase not found for session: ${sessionId}`)
          return false
        }
      } catch (err) {
        console.error("❌ [Purchase Success] Error checking purchase:", err)
        setError("Failed to verify purchase")
        return false
      }
    }

    const pollForPurchase = async () => {
      const found = await checkPurchaseStatus()

      if (!found && retryCount < maxRetries) {
        console.log(`🔄 [Purchase Success] Retrying... (${retryCount + 1}/${maxRetries})`)
        setRetryCount((prev) => prev + 1)
        setTimeout(pollForPurchase, 5000) // Retry every 5 seconds
      } else if (!found) {
        console.log("⏰ [Purchase Success] Max retries reached")
        setError(
          "Purchase verification is taking longer than expected. Please check your purchases or contact support.",
        )
        setLoading(false)
      }
    }

    pollForPurchase()
  }, [user, sessionId, retryCount])

  const handleRetry = () => {
    setRetryCount(0)
    setError(null)
    setLoading(true)
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const handleViewContent = () => {
    if (purchaseData?.productBoxId) {
      router.push(`/product-box/${purchaseData.productBoxId}/content`)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to view your purchase.</p>
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
            <p className="text-gray-600 mb-4">This purchase link is invalid or expired.</p>
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
            <h2 className="text-xl font-semibold mb-2">Purchase Verification Delayed</h2>
            <p className="text-gray-600 mb-4">
              Purchase verification is taking longer than expected. Your payment was likely successful - please check
              your purchases or contact support.
            </p>
            <p className="text-sm text-gray-500 mb-4">Checked {retryCount} times • Auto-retrying every 5 seconds</p>
            <div className="space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
              <Button onClick={handleViewPurchases} className="w-full">
                My Purchases
              </Button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your payment was processed by Stripe</li>
                <li>• Our system is recording your purchase</li>
                <li>• This usually takes 5-10 seconds</li>
                <li>• You'll get access once processing completes</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              If this persists, your payment was likely successful. Check your purchases or contact support.
            </p>
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
            <h2 className="text-xl font-semibold mb-2">Verification Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View My Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (purchaseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Purchase Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold text-lg">{purchaseData.itemTitle}</h3>
              <p className="text-gray-600">
                ${purchaseData.amount.toFixed(2)} {purchaseData.currency.toUpperCase()}
              </p>
              {purchaseData.isTestPurchase && (
                <p className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded mt-2">Test Purchase</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Session ID:</span>
                <span className="font-mono text-xs">{purchaseData.sessionId.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">Complete</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Purchased:</span>
                <span>{new Date(purchaseData.purchasedAt.toDate()).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handleViewContent} className="w-full">
                Access Your Content
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                View All Purchases
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              You now have lifetime access to this content. Check your email for a receipt.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
