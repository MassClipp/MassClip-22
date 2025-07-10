"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  useEffect(() => {
    const grantAccess = async () => {
      if (!user || !productBoxId) {
        if (!authLoading && !user) {
          // Store the current URL for redirect after login
          const currentUrl = window.location.href
          localStorage.setItem("redirectAfterLogin", currentUrl)
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`
        }
        return
      }

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
          throw new Error(`Failed to grant access: ${response.status}`)
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

    grantAccess()
  }, [user, authLoading, productBoxId, userId, creatorId, testMode])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">
              {testMode ? "🧪 Processing Test Purchase" : "🎉 Processing Your Purchase"}
            </h2>
            <p className="text-gray-600 mb-4">Setting up your access...</p>
            {testMode && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>TEST MODE:</strong> This is a test purchase using Stripe test cards.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Purchase Link</h2>
            <p className="text-gray-600 mb-4">Please log in to access your purchase.</p>
            <Button asChild className="w-full">
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/dashboard/purchases">View My Purchases</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Purchase Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't find the details for this purchase.</p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                <strong>TEST MODE:</strong> This was a test purchase using Stripe test cards. No real money was charged.
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
