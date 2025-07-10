"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle, Zap } from "lucide-react"
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
  const [accessGranted, setAccessGranted] = useState(false)

  // Get URL parameters - using product_box_id as bundleId
  const bundleId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  // Auto-grant access on page load
  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      bundleId,
      userId,
      creatorId,
      testMode,
      currentUser: user?.uid,
      authLoading,
    })

    // If we have bundle and user info, grant access immediately
    if (bundleId && userId) {
      autoGrantAccess()
    } else if (bundleId && user) {
      // Use current user if no userId in URL
      autoGrantAccessWithAuth()
    } else {
      console.log(`❌ [Purchase Success] Missing required parameters`)
      setError("Missing purchase information")
      setLoading(false)
    }
  }, [bundleId, userId, user, authLoading])

  const autoGrantAccess = async () => {
    if (!bundleId || !userId) {
      console.error("❌ [Auto Grant] Missing bundleId or userId")
      setError("Missing purchase information")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(`🚀 [Auto Grant] Processing automatic access grant`)
      console.log(`📦 Bundle ID: ${bundleId}`)
      console.log(`👤 User ID: ${userId}`)
      console.log(`🧪 Test Mode: ${testMode}`)

      // Call auto-grant API (no auth required)
      const response = await fetch("/api/bundle/auto-grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bundleId: bundleId,
          userId: userId,
          creatorId: creatorId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to grant access: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setBundle(data.bundle)
        setCreator(data.creator)
        setAlreadyPurchased(data.alreadyPurchased)
        setAccessGranted(true)
        console.log(`✅ [Auto Grant] Access granted successfully!`)
      } else {
        throw new Error(data.error || "Failed to grant access")
      }
    } catch (error: any) {
      console.error("❌ [Auto Grant] Error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const autoGrantAccessWithAuth = async () => {
    if (!user || !bundleId) {
      console.error("❌ [Auth Grant] Missing user or bundleId")
      return
    }

    try {
      setLoading(true)
      console.log(`🚀 [Auth Grant] Processing with authentication`)
      console.log(`📦 Bundle ID: ${bundleId}`)
      console.log(`👤 User: ${user.uid}`)

      const idToken = await user.getIdToken()

      const response = await fetch("/api/bundle/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId: bundleId,
          creatorId: creatorId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to grant access: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setBundle(data.bundle)
        setCreator(data.creator)
        setAlreadyPurchased(data.alreadyPurchased)
        setAccessGranted(true)
        console.log(`✅ [Auth Grant] Access granted successfully!`)
      } else {
        throw new Error(data.error || "Failed to grant access")
      }
    } catch (error: any) {
      console.error("❌ [Auth Grant] Error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    const currentUrl = window.location.href
    localStorage.setItem("redirectAfterLogin", currentUrl)
    router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
  }

  // Show loading while processing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">
              {testMode ? "🧪 Processing Test Purchase" : "⚡ Processing Your Purchase"}
            </h2>
            <p className="text-gray-600 mb-4">Automatically granting access to your bundle...</p>

            {testMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>TEST MODE:</strong> Using Stripe test cards - no real charges
                </p>
              </div>
            )}

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">⚡ Auto-Grant Process:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Payment completed successfully</li>
                <li>🔍 Fetching bundle details from Firestore</li>
                <li>⚡ Automatically granting access</li>
                <li>📝 Recording your purchase</li>
                <li>🎯 No login required!</li>
              </ul>
            </div>
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
              <Button onClick={() => window.location.reload()} className="w-full">
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
  if (accessGranted && bundle) {
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
