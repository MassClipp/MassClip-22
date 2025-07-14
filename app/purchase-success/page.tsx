"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Package, Eye, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface Purchase {
  id: string
  bundleId: string
  bundleTitle: string
  description: string
  thumbnailUrl: string
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  contentCount: number
  totalSize: number
  buyerUid: string
  itemNames: string[]
  contents: any[]
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [authRetryCount, setAuthRetryCount] = useState(0)

  // Extract parameters from URL
  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const buyerUid = searchParams.get("buyer_uid")

  console.log("🔍 [Purchase Success] URL Parameters:", {
    sessionId,
    productBoxId,
    creatorId,
    buyerUid,
    hasUser: !!user,
    userUid: user?.uid,
  })

  useEffect(() => {
    // Wait for auth to initialize, then process purchase
    if (!authLoading) {
      processPurchase()
    }
  }, [authLoading, user, sessionId, productBoxId])

  // Retry auth state if needed
  useEffect(() => {
    if (!authLoading && !user && authRetryCount < 3) {
      console.log(`🔄 [Purchase Success] Retrying auth state check (${authRetryCount + 1}/3)`)
      const timer = setTimeout(() => {
        setAuthRetryCount((prev) => prev + 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [authLoading, user, authRetryCount])

  const processPurchase = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 [Purchase Success] Processing purchase...")

      // Validate required parameters
      if (!sessionId && !productBoxId) {
        throw new Error("Missing purchase information. Please check your email for purchase confirmation.")
      }

      // If we have sessionId, use the comprehensive verification
      if (sessionId) {
        await verifyWithSessionId()
      } else if (productBoxId) {
        // Fallback: try to verify with product box ID and buyer UID
        await verifyWithProductBoxId()
      } else {
        throw new Error("Insufficient purchase information")
      }
    } catch (err: any) {
      console.error("❌ [Purchase Success] Error processing purchase:", err)
      setError(err.message || "Failed to process purchase")
    } finally {
      setLoading(false)
    }
  }

  const verifyWithSessionId = async () => {
    console.log("🔍 [Purchase Success] Verifying with session ID:", sessionId)

    // Prepare headers
    const headers: any = {
      "Content-Type": "application/json",
    }

    // Add auth token if user is available
    if (user) {
      try {
        const idToken = await user.getIdToken()
        headers["Authorization"] = `Bearer ${idToken}`
        console.log("🔐 [Purchase Success] Added auth token for user:", user.uid)
      } catch (tokenError) {
        console.warn("⚠️ [Purchase Success] Failed to get ID token:", tokenError)
      }
    }

    const response = await fetch("/api/purchase/verify-and-complete-bundle", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId,
        productBoxId,
        forceComplete: true,
      }),
    })

    const data = await response.json()
    console.log("📡 [Purchase Success] API response:", data)

    if (!response.ok) {
      throw new Error(data.error || `API request failed with status ${response.status}`)
    }

    if (data.success && data.purchase) {
      setPurchase(data.purchase)
      console.log("✅ [Purchase Success] Purchase verified successfully:", {
        bundleTitle: data.purchase.bundleTitle,
        contentCount: data.purchase.contentCount,
        buyerUid: data.purchase.buyerUid,
      })
    } else {
      throw new Error("Invalid response from server")
    }
  }

  const verifyWithProductBoxId = async () => {
    console.log("🔍 [Purchase Success] Verifying with product box ID:", productBoxId)

    // This is a fallback method when we don't have session_id
    // We'll try to find a recent purchase for this product box
    const headers: any = {
      "Content-Type": "application/json",
    }

    if (user) {
      try {
        const idToken = await user.getIdToken()
        headers["Authorization"] = `Bearer ${idToken}`
      } catch (tokenError) {
        console.warn("⚠️ [Purchase Success] Failed to get ID token:", tokenError)
      }
    }

    const response = await fetch("/api/purchase/verify-recent-purchase", {
      method: "POST",
      headers,
      body: JSON.stringify({
        productBoxId,
        buyerUid: user?.uid || buyerUid,
        creatorId,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to verify purchase")
    }

    if (data.success && data.purchase) {
      setPurchase(data.purchase)
    } else {
      throw new Error("No recent purchase found for this product")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Loader2 className="h-16 w-16 text-red-500 mx-auto animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Processing Purchase</h1>
            <p className="text-white/70">Verifying your purchase and setting up access...</p>
            {user && <p className="text-white/50 text-sm mt-2">User: {user.email}</p>}
            {!user && authRetryCount > 0 && (
              <p className="text-white/50 text-sm mt-2">Checking authentication... ({authRetryCount}/3)</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Purchase Error</h1>
            <Alert className="bg-red-500/10 border-red-500/20 mb-6">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Button onClick={processPurchase} className="w-full bg-red-600 hover:bg-red-700">
                Try Again
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
            {/* Debug info */}
            <div className="mt-4 text-xs text-white/40">
              <p>Session ID: {sessionId || "Not provided"}</p>
              <p>Product Box ID: {productBoxId || "Not provided"}</p>
              <p>User: {user?.uid || "Not authenticated"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (purchase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-8">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="mb-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Access Granted!</h1>
              <p className="text-white/70">Your premium content is now available</p>
              {user && <p className="text-white/50 text-sm mt-1">Welcome, {user.email}</p>}
            </div>

            {/* Purchase Details */}
            <div className="bg-white/5 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  {purchase.thumbnailUrl ? (
                    <img
                      src={purchase.thumbnailUrl || "/placeholder.svg"}
                      alt={purchase.bundleTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=64&width=64&text=Bundle"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Bundle Info */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{purchase.bundleTitle}</h3>
                  <p className="text-white/70 text-sm mb-2">{purchase.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {purchase.creatorName}
                    </span>
                    <span>
                      ${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{purchase.contentCount}</div>
                  <div className="text-sm text-white/60">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{formatFileSize(purchase.totalSize)}</div>
                  <div className="text-sm text-white/60">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">∞</div>
                  <div className="text-sm text-white/60">Lifetime</div>
                </div>
              </div>

              {/* Content Preview */}
              {purchase.itemNames && purchase.itemNames.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-white/80 mb-2">Content Included:</p>
                  <div className="space-y-1">
                    {purchase.itemNames.slice(0, 3).map((itemName: string, index: number) => (
                      <p key={index} className="text-sm text-white/60 truncate">
                        • {itemName}
                      </p>
                    ))}
                    {purchase.itemNames.length > 3 && (
                      <p className="text-sm text-white/50">+ {purchase.itemNames.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                <Link href={`/product-box/${purchase.bundleId}/content`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Content
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/dashboard/purchases">
                    <Package className="w-4 h-4 mr-2" />
                    My Purchases
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href={`/creator/${purchase.creatorUsername}`}>
                    <User className="w-4 h-4 mr-2" />
                    Creator Profile
                  </Link>
                </Button>
              </div>
            </div>

            {/* Debug info for development */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 bg-white/5 rounded text-xs text-white/40">
                <p>Purchase ID: {purchase.id}</p>
                <p>Bundle ID: {purchase.bundleId}</p>
                <p>Session ID: {sessionId}</p>
                <p>User ID: {user?.uid || "anonymous"}</p>
                <p>Buyer UID: {purchase.buyerUid}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
