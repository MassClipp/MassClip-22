"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle, LogIn, Zap } from "lucide-react"
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
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  // Immediate verification on page load
  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      productBoxId,
      userId,
      creatorId,
      testMode,
      currentUser: user?.uid,
      authLoading,
    })

    // If we have all required data, try immediate verification
    if (productBoxId && userId && !authLoading) {
      // Check if current user matches expected user
      if (user && user.uid === userId) {
        console.log(`✅ [Purchase Success] User matches, granting immediate access`)
        grantAccess()
      } else if (!user && verificationAttempts < 3) {
        console.log(`⏳ [Purchase Success] No user yet, waiting... (attempt ${verificationAttempts + 1}/3)`)
        setTimeout(() => {
          setVerificationAttempts((prev) => prev + 1)
        }, 1000)
      } else if (!user) {
        console.log(`❌ [Purchase Success] No user after retries, showing login`)
        setLoading(false)
      }
    }
  }, [user, authLoading, productBoxId, userId, verificationAttempts])

  const grantAccess = async () => {
    if (!user || !productBoxId) {
      console.error("❌ [Grant Access] Missing user or productBoxId")
      return
    }

    try {
      setLoading(true)
      console.log(`🚀 [Grant Access] Processing ${testMode ? "TEST MODE" : "LIVE"} purchase`)
      console.log(`📦 Product Box: ${productBoxId}`)
      console.log(`👤 User: ${user.uid}`)
      console.log(`🔍 Expected User: ${userId}`)

      // Verify user matches
      if (userId && user.uid !== userId) {
        throw new Error("User verification failed - please sign in with the correct account")
      }

      const idToken = await user.getIdToken()

      // Try the primary API route first
      let response = await fetch("/api/purchase/grant-immediate-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId: productBoxId,
          creatorId: creatorId,
          verificationMethod: testMode ? "test_mode_immediate" : "stripe_success_immediate",
        }),
      })

      // If primary route fails, try backup route
      if (!response.ok) {
        console.warn(`⚠️ [Grant Access] Primary route failed (${response.status}), trying backup route`)

        response = await fetch("/api/purchase/grant-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            productBoxId: productBoxId,
            creatorId: creatorId,
          }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to grant access: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Handle both response formats
        const bundleData = data.bundle || data.productBox
        setBundle(bundleData)
        setCreator(data.creator)
        setAlreadyPurchased(data.alreadyPurchased)
        console.log(`✅ [Grant Access] Access granted successfully!`)
        console.log(`📝 Purchase ID: ${data.purchaseId}`)
      } else {
        throw new Error(data.error || "Failed to grant access")
      }
    } catch (error: any) {
      console.error("❌ [Grant Access] Error:", error)
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

  // Show loading while processing
  if (loading || authLoading || verificationAttempts < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">
              {testMode ? "🧪 Processing Test Purchase" : "⚡ Processing Your Purchase"}
            </h2>
            <p className="text-gray-600 mb-4">
              {verificationAttempts > 0 ? "Verifying your authentication..." : "Setting up instant access..."}
            </p>

            {testMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>TEST MODE:</strong> Using Stripe test cards - no real charges
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">⚡ Instant Access Process:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🔐 {verificationAttempts > 0 ? "Verifying authentication..." : "Checking login status"}</li>
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

  // Show login prompt if no user after retries
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">🎉 Purchase Complete!</h2>
            <p className="text-gray-600 mb-4">
              Your payment was successful. Please sign in to access your content instantly.
            </p>

            <Button onClick={handleLogin} className="w-full mb-4">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In for Instant Access
            </Button>

            <div className="p-3 bg-green-50 rounded-lg mb-4">
              <h3 className="font-medium text-green-900 mb-1">✅ Payment Confirmed</h3>
              <p className="text-sm text-green-800">
                Your purchase is complete and waiting for you. Sign in to get instant access to your content.
              </p>
            </div>

            {testMode && (
              <div className="p-3 bg-yellow-50 rounded-lg">
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
                {testMode ? "🧪 Test Purchase Complete!" : "⚡ Instant Access Granted!"}
              </h1>
              <p className="text-gray-600">
                {alreadyPurchased
                  ? "Welcome back! You already have access to this content."
                  : "Your purchase is complete and ready instantly!"}
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
                <Link href={`/product-box/${bundle.id}/content`}>⚡ Access Your Content Now</Link>
              </Button>

              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/dashboard/purchases">My Purchases</Link>
              </Button>
            </div>

            {/* Success Checklist */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">⚡ Instant Access Complete!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ {testMode ? "Test payment" : "Payment"} completed successfully</li>
                <li>⚡ Instant access granted - no waiting!</li>
                <li>🔐 No login required - you stayed authenticated</li>
                <li>📝 Purchase recorded in your account</li>
                <li>🔄 Lifetime access to this content</li>
                {testMode && <li>🧪 Test mode - no real charges applied</li>}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              ⚡ Instant verification complete - no complex steps needed!
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
