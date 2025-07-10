"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle, LogIn } from "lucide-react"
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
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)
  const [authRetryCount, setAuthRetryCount] = useState(0)

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  // Wait longer for auth to stabilize after redirect
  useEffect(() => {
    console.log(`🔍 [Purchase Success] Auth state check:`, {
      user: user?.uid,
      authLoading,
      productBoxId,
      userId,
      authRetryCount,
    })

    // If auth is still loading, wait
    if (authLoading) {
      console.log(`⏳ [Purchase Success] Auth still loading...`)
      return
    }

    // If no user but we expect one, retry a few times
    if (!user && userId && authRetryCount < 5) {
      console.log(`🔄 [Purchase Success] No user yet, retrying... (${authRetryCount + 1}/5)`)
      setTimeout(() => {
        setAuthRetryCount((prev) => prev + 1)
      }, 1000)
      return
    }

    // If we have user and required data, proceed
    if (user && productBoxId) {
      // Verify user matches if userId provided
      if (userId && user.uid !== userId) {
        console.error(`❌ [Purchase Success] User mismatch: ${user.uid} vs ${userId}`)
        setError("User verification failed")
        setLoading(false)
        return
      }

      console.log(`✅ [Purchase Success] Auth verified, granting access`)
      grantAccess()
      return
    }

    // If no user after retries, show login
    if (!authLoading && !user) {
      console.log(`❌ [Purchase Success] No user after retries, showing login`)
      setLoading(false)
    }
  }, [user, authLoading, productBoxId, userId, authRetryCount])

  const grantAccess = async () => {
    if (!user || !productBoxId) return

    try {
      setLoading(true)
      console.log(`🎉 [Purchase Success] Processing ${testMode ? "TEST MODE" : "LIVE"} purchase`)
      console.log(`📦 Product Box: ${productBoxId}`)
      console.log(`👤 User: ${user.uid}`)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/purchase/grant-immediate-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId: productBoxId,
          creatorId: creatorId,
          verificationMethod: testMode ? "test_mode" : "stripe_success",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to grant access: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setBundle(data.bundle)
        setCreator(data.creator)
        setAlreadyPurchased(data.alreadyPurchased)
        console.log(`✅ [Purchase Success] Access granted successfully!`)
      } else {
        throw new Error(data.error || "Failed to grant access")
      }
    } catch (error: any) {
      console.error("❌ [Purchase Success] Error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    // Store current URL for redirect after login
    const currentUrl = window.location.href
    localStorage.setItem("redirectAfterLogin", currentUrl)
    router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
  }

  // Show loading while auth is stabilizing
  if (authLoading || (loading && authRetryCount < 5)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">
              {testMode ? "🧪 Processing Test Purchase" : "🎉 Processing Your Purchase"}
            </h2>
            <p className="text-gray-600 mb-4">
              {authRetryCount > 0 ? "Verifying your authentication..." : "Setting up your access..."}
            </p>
            {testMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>TEST MODE:</strong> This is a test purchase using Stripe test cards.
                </p>
              </div>
            )}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🔐 {authRetryCount > 0 ? "Verifying authentication..." : "Checking login status"}</li>
                <li>🚀 Preparing immediate access</li>
                <li>📝 Setting up your purchase</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login prompt if no user after retries
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">🎉 Purchase Complete!</h2>
            <p className="text-gray-600 mb-4">Your payment was successful. Please sign in to access your content.</p>

            <Button onClick={handleLogin} className="w-full mb-4">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In to Access Content
            </Button>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">Why do I need to sign in?</h3>
              <p className="text-sm text-blue-800">
                Your purchase was successful, but we need to verify your identity to grant access to your content.
                You'll be redirected back here after signing in.
              </p>
            </div>

            {testMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>TEST MODE:</strong> This was a test purchase using Stripe test cards.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-2">
              <Button onClick={grantAccess} className="w-full">
                Try Again
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show processing state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">
              {testMode ? "🧪 Processing Test Purchase" : "🎉 Processing Your Purchase"}
            </h2>
            <p className="text-gray-600 mb-4">Setting up your access...</p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🚀 Granting immediate access</li>
                <li>📝 Recording your purchase</li>
                <li>🎯 No complex verification needed!</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show success state
  if (bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            {/* Success Header */}
            <div className="text-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {testMode ? "🧪 Test Purchase Complete!" : "🎉 You're Good to Go!"}
              </h1>
              <p className="text-gray-600">
                {alreadyPurchased
                  ? "Welcome back! You already have access to this content."
                  : "Your purchase is complete and ready!"}
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
                <Link href={`/product-box/${bundle.id}/content`}>📱 Access Your Content Now</Link>
              </Button>

              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/dashboard/purchases">My Purchases</Link>
              </Button>
            </div>

            {/* Success Checklist */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">🎉 All Set!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ {testMode ? "Test payment" : "Payment"} completed successfully</li>
                <li>🚀 Instant access granted - no waiting!</li>
                <li>📝 Purchase recorded in your account</li>
                <li>🔄 Lifetime access to this content</li>
                {testMode && <li>🧪 Test mode - no real charges applied</li>}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Your purchase is confirmed. You reached this page = verification complete!
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Processing...</h2>
          <p className="text-gray-600">Please wait while we set up your purchase.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchaseSuccessContent />
    </Suspense>
  )
}
