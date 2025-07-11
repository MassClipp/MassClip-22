"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Bundle {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  price: number
  currency: string
}

interface Creator {
  id: string
  name: string
  username: string
}

function PurchaseSuccessContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)

  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      productBoxId,
      creatorId,
      testMode,
      currentUser: user?.uid,
    })

    if (!user || !productBoxId || !creatorId) {
      setIsProcessing(false)
      return
    }

    verifyPurchase()
  }, [user, productBoxId, creatorId])

  const verifyPurchase = async () => {
    try {
      // First, try to verify purchase without authentication using session storage
      const sessionPurchaseData = sessionStorage.getItem("pendingPurchase")
      if (sessionPurchaseData) {
        const purchaseInfo = JSON.parse(sessionPurchaseData)
        console.log("🔍 [Purchase Success] Found session purchase data:", purchaseInfo)

        // Try to grant access using session data
        const response = await fetch("/api/purchase/grant-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(user && { Authorization: `Bearer ${await user.getIdToken()}` }),
          },
          body: JSON.stringify({
            productBoxId: purchaseInfo.productBoxId || productBoxId,
            creatorId: purchaseInfo.creatorId || creatorId,
            sessionId: purchaseInfo.sessionId,
          }),
        })

        const result = await response.json()

        if (response.ok) {
          setBundle(result.productBox)
          setCreator(result.creator)
          setAlreadyPurchased(result.alreadyPurchased)
          setAccessGranted(true)
          setSuccess(true)

          // Clear session data after successful verification
          sessionStorage.removeItem("pendingPurchase")
          return
        }
      }

      // If user is authenticated, try normal verification
      if (user) {
        const response = await fetch("/api/purchase/grant-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({
            productBoxId,
            creatorId,
            userId: user.uid,
          }),
        })

        const result = await response.json()

        if (response.ok) {
          setBundle(result.productBox)
          setCreator(result.creator)
          setAlreadyPurchased(result.alreadyPurchased)
          setAccessGranted(true)
          setSuccess(true)
          return
        }
      }

      // If no user and no session data, store purchase info and redirect to login
      if (!user) {
        const purchaseInfo = {
          productBoxId,
          creatorId,
          timestamp: Date.now(),
        }
        sessionStorage.setItem("pendingPurchase", JSON.stringify(purchaseInfo))

        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.href)
        router.push(`/login?redirect=${returnUrl}`)
        return
      }

      throw new Error("Purchase verification failed")
    } catch (err: any) {
      console.error("❌ [Purchase Success] Verification error:", err)
      setError(err.message || "Failed to verify purchase")
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
      }, 1500)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  // Handle returning from login
  useEffect(() => {
    if (user && !success && !error) {
      const sessionPurchaseData = sessionStorage.getItem("pendingPurchase")
      if (sessionPurchaseData) {
        console.log("🔄 [Purchase Success] User returned from login, retrying verification")
        verifyPurchase()
      }
    }
  }, [user])

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Please log in to continue</p>
            <Button onClick={() => router.push("/login")} className="w-full bg-red-600 hover:bg-red-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parameter validation
  if (!productBoxId || !creatorId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Invalid purchase link</p>
            <Button onClick={() => router.push("/dashboard")} className="w-full bg-red-600 hover:bg-red-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state with three dots animation
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">Something went wrong</p>
            <Button onClick={handleViewPurchases} className="w-full bg-red-600 hover:bg-red-700">
              My Purchases
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success && bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {/* Success Header */}
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {testMode ? "🧪 Test Purchase Complete!" : "⚡ Access Granted Instantly!"}
              </h1>
              <p className="text-gray-600">
                {alreadyPurchased
                  ? "Welcome back! You already have access to this bundle."
                  : "Your purchase is complete and access granted automatically!"}
              </p>
            </div>

            {/* Test Mode Warning */}
            {testMode && (
              <Alert className="mb-6 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>TEST MODE:</strong> This was a test purchase using Stripe test cards. No real money was
                  charged.
                </AlertDescription>
              </Alert>
            )}

            {/* Bundle Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{bundle.title}</p>
                  <p className="text-sm text-gray-500">{bundle.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">
                    ${bundle.price.toFixed(2)} {bundle.currency.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">{testMode ? "Test payment" : "Payment completed"}</p>
                </div>
              </div>

              {creator && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">by {creator.name}</p>
                    {creator.username && <p className="text-sm text-gray-500">@{creator.username}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href={`/product-box/${bundle.id}/content`}>⚡ Access Your Bundle Now</Link>
              </Button>

              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/dashboard/purchases">My Purchases</Link>
              </Button>
            </div>

            {/* Success Checklist */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">⚡ Auto-Grant Complete!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ {testMode ? "Test payment" : "Payment"} completed successfully</li>
                <li>⚡ Access granted automatically - no waiting!</li>
                <li>🔐 No login required - instant access</li>
                <li>📝 Purchase recorded in your account</li>
                <li>🔄 Lifetime access to this bundle</li>
                {testMode && <li>🧪 Test mode - no real charges applied</li>}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              ⚡ Automatic access granted - no complex verification needed!
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
