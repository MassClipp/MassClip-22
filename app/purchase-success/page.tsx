"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Eye, ShoppingBag, User, Calendar, CreditCard, Package, AlertCircle } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { toast } from "sonner"

interface PurchaseDetails {
  sessionId: string
  bundleId?: string
  productBoxId?: string
  bundleTitle: string
  bundleDescription?: string
  thumbnailUrl?: string
  amount: number
  currency: string
  purchasedAt: string
  status: string
  type: string
  creatorName?: string
  creatorUsername?: string
  items?: any[]
  itemNames?: string[]
  totalItems?: number
  totalSize?: number
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided")
      setLoading(false)
      return
    }

    verifyPurchase()
  }, [sessionId, user])

  const verifyPurchase = async () => {
    try {
      console.log("🔍 [Purchase Success] Starting verification for session:", sessionId)

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: user?.uid || "anonymous",
        }),
      })

      const data = await response.json()
      console.log("📋 [Purchase Success] Verification response:", data)

      if (data.success) {
        setPurchase(data.purchase)
        toast.success("Purchase verified successfully!")
      } else {
        setError(data.error || "Failed to verify purchase")
        toast.error(data.error || "Failed to verify purchase")
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setError("Failed to verify purchase")
      toast.error("Failed to verify purchase")
    } finally {
      setLoading(false)
    }
  }

  const handleViewContent = () => {
    if (purchase?.bundleId) {
      router.push(`/bundles/${purchase.bundleId}/content`)
    } else if (purchase?.productBoxId) {
      router.push(`/product-box/${purchase.productBoxId}/content`)
    }
  }

  const handleViewPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying your purchase...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Purchase Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find your purchase details.</p>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Successful!</h1>
          <p className="text-gray-600">Thank you for your purchase. Your content is now available.</p>
        </div>

        {/* Purchase Details Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item Info */}
            <div className="flex items-start gap-4">
              {purchase.thumbnailUrl && (
                <img
                  src={purchase.thumbnailUrl || "/placeholder.svg"}
                  alt={purchase.bundleTitle}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{purchase.bundleTitle}</h3>
                {purchase.bundleDescription && (
                  <p className="text-gray-600 text-sm mt-1">{purchase.bundleDescription}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{purchase.type === "bundle" ? "Bundle" : "Product Box"}</Badge>
                  <Badge variant="outline">{purchase.status}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Purchase Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">by {user?.email || "oilei"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">
                    ${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(purchase.purchasedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Transaction ID: {purchase.sessionId.slice(-8)}</p>
                </div>
              </div>
            </div>

            {/* Content Summary */}
            {(purchase.totalItems || purchase.itemNames?.length) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Content Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium">{purchase.totalItems || purchase.itemNames?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Size</p>
                      <p className="font-medium">{purchase.totalSize ? formatFileSize(purchase.totalSize) : "0 B"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Access</p>
                      <p className="font-medium text-green-600">Lifetime</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Item Names */}
            {purchase.itemNames && purchase.itemNames.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Included Content</h4>
                  <ul className="space-y-1">
                    {purchase.itemNames.slice(0, 5).map((name, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        {name}
                      </li>
                    ))}
                    {purchase.itemNames.length > 5 && (
                      <li className="text-sm text-gray-500">+{purchase.itemNames.length - 5} more items</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleViewContent} className="flex-1" size="lg">
            <Eye className="h-4 w-4 mr-2" />
            View Content
          </Button>
          <Button onClick={handleViewPurchases} variant="outline" className="flex-1 bg-transparent" size="lg">
            <ShoppingBag className="h-4 w-4 mr-2" />
            My Purchases
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>You can access your purchased content anytime from your dashboard.</p>
          <p className="mt-1">Need help? Contact support for assistance.</p>
        </div>
      </div>
    </div>
  )
}
