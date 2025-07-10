"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, Package, User, ShoppingBag, LogIn } from "lucide-react"

interface PurchaseResult {
  success: boolean
  bundle?: {
    id: string
    title: string
    description?: string
    thumbnailUrl?: string
    price?: number
    currency?: string
  }
  creator?: {
    id: string
    name: string
    username: string
  }
  error?: string
  alreadyPurchased?: boolean
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRetryCount, setAuthRetryCount] = useState(0)

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")

  // Wait for auth to stabilize before proceeding
  useEffect(() => {
    console.log(`🔍 [Purchase Success] Auth state:`, {
      user: user?.uid,
      authLoading,
      productBoxId,
      userId,
      authRetryCount,
    })

    // If auth is still loading, wait
    if (authLoading) {
      console.log(`⏳ [Purchase Success] Waiting for auth to load...`)
      return
    }

    // If no user but we have a userId from URL, try to wait a bit more
    if (!user && userId && authRetryCount < 3) {
      console.log(`🔄 [Purchase Success] No user yet, retrying... (${authRetryCount + 1}/3)`)
      setTimeout(() => {
        setAuthRetryCount((prev) => prev + 1)
      }, 1000)
      return
    }

    // If we have all required data, proceed
    if (user && productBoxId && userId) {
      if (user.uid !== userId) {
        console.error(`❌ [Purchase Success] User mismatch: ${user.uid} vs ${userId}`)
        setResult({ success: false, error: "User verification failed" })
        setLoading(false)
        return
      }

      console.log(`✅ [Purchase Success] All data available, granting access`)
      grantImmediateAccess()
      return
    }

    // If missing required data after auth loaded
    if (!authLoading) {
      console.log(`❌ [Purchase Success] Missing required data after auth loaded`)
      setLoading(false)
    }
  }, [user, authLoading, productBoxId, userId, authRetryCount])

  const grantImmediateAccess = async () => {
    if (!user || !productBoxId) return

    try {
      console.log(`🚀 [Purchase Success] Granting IMMEDIATE access`)
      console.log(`📦 Bundle: ${productBoxId}`)
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
          userId: user.uid,
          creatorId,
          verificationMethod: "landing_page",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to grant access")
      }

      console.log(`✅ [Purchase Success] Access granted immediately!`)
      setResult(data)
    } catch (error: any) {
      console.error(`❌ [Purchase Success] Error:`, error)
      setResult({
        success: false,
        error: error.message || "Failed to grant access",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    const currentUrl = window.location.href
    localStorage.setItem("redirectAfterLogin", currentUrl)
    router.push("/login")
  }

  const handleViewContent = () => {
    if (productBoxId) {
      router.push(`/product-box/${productBoxId}/content`)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  // Auth loading state
  if (authLoading || (loading && authRetryCount < 3)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">🎉 Purchase Complete!</h2>
            <p className="text-gray-600 mb-4">Verifying your authentication...</p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🔐 Verifying your login status</li>
                <li>🚀 Preparing immediate access</li>
                <li>📝 Setting up your purchase</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not authenticated - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Purchase Link</h2>
            <p className="text-gray-600 mb-4">Please log in to access your purchase.</p>
            <div className="space-y-2">
              <Button onClick={handleLogin} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900 mb-1">Why do I need to log in?</h3>
              <p className="text-sm text-yellow-800">
                Your purchase was successful, but we need to verify your identity to grant access to your content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Missing required parameters
  if (!productBoxId || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Purchase Link</h2>
            <p className="text-gray-600 mb-4">This purchase link is missing required information.</p>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Processing state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">🎉 Purchase Complete!</h2>
            <p className="text-gray-600 mb-4">Setting up your instant access...</p>
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

  // Error state
  if (result && !result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup Issue</h2>
            <p className="text-gray-600 mb-4">{result.error}</p>
            <div className="space-y-2">
              <Button onClick={grantImmediateAccess} className="w-full">
                Try Again
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                My Purchases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">🎉 You're Good to Go!</CardTitle>
            <p className="text-sm text-green-600">
              {result.alreadyPurchased
                ? "Welcome back! You already have access"
                : "Your purchase is complete and ready!"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bundle Information */}
            <div className="text-center">
              <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                <Package className="h-5 w-5" />
                {result.bundle?.title || "Your Bundle"}
              </h3>
              {result.bundle?.price && (
                <p className="text-gray-600 mt-1">
                  ${result.bundle.price.toFixed(2)} {result.bundle.currency?.toUpperCase() || "USD"}
                </p>
              )}
              {result.creator && (
                <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mt-1">
                  <User className="h-4 w-4" />
                  <span>
                    by {result.creator.name} (@{result.creator.username})
                  </span>
                </div>
              )}
            </div>

            {/* Bundle Thumbnail */}
            {result.bundle?.thumbnailUrl && (
              <div className="flex justify-center">
                <img
                  src={result.bundle.thumbnailUrl || "/placeholder.svg"}
                  alt={result.bundle.title}
                  className="w-24 h-24 object-cover rounded-lg border"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                  }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={handleViewContent} className="w-full">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Access Your Content Now
              </Button>
              <Button onClick={handleViewPurchases} variant="outline" className="w-full bg-transparent">
                My Purchases
              </Button>
            </div>

            {/* Success Information */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">🎉 All Set!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🚀 Instant access granted - no waiting!</li>
                <li>📝 Purchase recorded in your account</li>
                <li>🔒 Lifetime access to this content</li>
                <li>🎯 Simple verification - you made it here!</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your purchase is confirmed. You reached this page = verification complete!
            </p>
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
