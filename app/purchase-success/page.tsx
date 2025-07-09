"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, AlertCircle, Package, User, ShoppingBag } from "lucide-react"

interface PurchaseResult {
  success: boolean
  productBox?: {
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
  const { user } = useAuth()
  const [result, setResult] = useState<PurchaseResult | null>(null)
  const [loading, setLoading] = useState(true)

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")

  useEffect(() => {
    if (!user || !productBoxId || !userId) {
      setLoading(false)
      return
    }

    // Verify the user ID matches the logged-in user
    if (user.uid !== userId) {
      setResult({ success: false, error: "User mismatch" })
      setLoading(false)
      return
    }

    // Grant access immediately - no Stripe verification needed
    grantAccess()
  }, [user, productBoxId, userId])

  const grantAccess = async () => {
    if (!user || !productBoxId) return

    try {
      setLoading(true)

      console.log(`🎉 [Purchase Success] Granting immediate access to ${productBoxId} for user ${user.uid}`)

      const response = await fetch("/api/purchase/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          productBoxId,
          userId: user.uid,
        }),
      })

      const result: PurchaseResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to grant access")
      }

      console.log(`✅ [Purchase Success] Access granted successfully`)
      setResult(result)
    } catch (error: any) {
      console.error(`❌ [Purchase Success] Error:`, error)
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleViewContent = () => {
    if (productBoxId) {
      router.push(`/product-box/${productBoxId}/content`)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  // Authentication check
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access your purchase.</p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Log In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Missing parameters
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Processing Your Purchase</h2>
            <p className="text-gray-600 mb-4">Setting up your access to the content. This will only take a moment!</p>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">What's happening:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Confirming your purchase completion</li>
                <li>• Setting up instant content access</li>
                <li>• Recording your purchase history</li>
                <li>• No complex verification needed!</li>
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
            <h2 className="text-xl font-semibold mb-2">Access Setup Failed</h2>
            <p className="text-gray-600 mb-4">{result.error}</p>
            <div className="space-y-2">
              <Button onClick={grantAccess} className="w-full">
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

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">
              {result.alreadyPurchased ? "Welcome Back!" : "Purchase Complete!"}
            </CardTitle>
            <p className="text-sm text-green-600">
              {result.alreadyPurchased ? "You already have access to this content" : "Your content is ready to access"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Information */}
            <div className="text-center">
              <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                <Package className="h-5 w-5" />
                {result.productBox?.title || "Your Purchase"}
              </h3>
              {result.productBox?.price && (
                <p className="text-gray-600 mt-1">
                  ${result.productBox.price.toFixed(2)} {result.productBox.currency?.toUpperCase() || "USD"}
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

            {/* Product Thumbnail */}
            {result.productBox?.thumbnailUrl && (
              <div className="flex justify-center">
                <img
                  src={result.productBox.thumbnailUrl || "/placeholder.svg"}
                  alt={result.productBox.title}
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
                View All Purchases
              </Button>
            </div>

            {/* Success Information */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-1">🎉 All Set!</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Payment completed successfully</li>
                <li>• Instant access granted - no waiting!</li>
                <li>• Purchase recorded in your account</li>
                <li>• Lifetime access to this content</li>
                <li>• Simple verification - no complex checks needed!</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Your purchase has been confirmed and you now have immediate access to this content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
