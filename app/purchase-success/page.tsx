"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, User, Package } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface PurchaseData {
  bundleId: string
  bundleTitle: string
  bundleDescription: string
  contentCount: number
  totalSize: number
  items: Array<{
    id: string
    title: string
    fileUrl: string
    fileSize: number
    contentType: string
  }>
  creatorName: string
  amount: number
  currency: string
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")

  useEffect(() => {
    const completePurchase = async () => {
      if (!sessionId || !productBoxId) {
        setError("Missing purchase information")
        setLoading(false)
        return
      }

      try {
        console.log("🔄 [Purchase Success] Completing purchase:", {
          sessionId,
          productBoxId,
          userId: user?.uid,
          userEmail: user?.email,
        })

        // First, complete the purchase with comprehensive data
        const completionResponse = await fetch("/api/purchase/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buyerUid: user?.uid || "anonymous",
            productBoxId,
            sessionId,
            userEmail: user?.email || "",
            userName: user?.displayName || user?.email?.split("@")[0] || "Anonymous User",
          }),
        })

        if (!completionResponse.ok) {
          throw new Error(`Purchase completion failed: ${completionResponse.statusText}`)
        }

        const completionResult = await completionResponse.json()
        console.log("✅ [Purchase Success] Purchase completed:", completionResult)

        // Then fetch the purchase data to display
        const purchaseResponse = await fetch(`/api/user/purchases/${sessionId}`, {
          headers: {
            Authorization: user ? `Bearer ${await user.getIdToken()}` : "",
          },
        })

        if (purchaseResponse.ok) {
          const purchase = await purchaseResponse.json()
          setPurchaseData(purchase)
          console.log("✅ [Purchase Success] Purchase data loaded:", purchase)
        } else {
          // Fallback: use the completion result data
          if (completionResult.purchase) {
            const fallbackData: PurchaseData = {
              bundleId: completionResult.purchase.productBoxId || completionResult.purchase.bundleId,
              bundleTitle:
                completionResult.purchase.productTitle || completionResult.purchase.bundleTitle || "Your Purchase",
              bundleDescription:
                completionResult.purchase.productDescription || completionResult.purchase.bundleDescription || "",
              contentCount: completionResult.purchase.items?.length || completionResult.purchase.contentCount || 0,
              totalSize: completionResult.purchase.totalSize || 0,
              items: completionResult.purchase.items || [],
              creatorName: completionResult.purchase.creatorName || "Creator",
              amount: completionResult.purchase.amount || 0,
              currency: completionResult.purchase.currency || "usd",
            }
            setPurchaseData(fallbackData)
            console.log("✅ [Purchase Success] Using fallback data:", fallbackData)
          }
        }
      } catch (error) {
        console.error("❌ [Purchase Success] Error:", error)
        setError(error instanceof Error ? error.message : "Failed to complete purchase")
      } finally {
        setLoading(false)
      }
    }

    completePurchase()
  }, [sessionId, productBoxId, user])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Processing Your Purchase</h2>
            <p className="text-gray-600">Please wait while we set up your access...</p>
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
            <div className="text-red-600 mb-4">
              <Package className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-800">Purchase Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="text-green-600 mb-6">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Granted!</h1>
          <p className="text-gray-600 mb-6">Your premium content is now available</p>

          {/* User Info */}
          <div className="text-sm text-gray-500 mb-6">Welcome, {user?.email || "valued customer"}</div>

          {/* Purchase Details */}
          {purchaseData && (
            <div className="bg-white rounded-lg p-4 mb-6 border">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-gray-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{purchaseData.bundleTitle}</h3>
                  <p className="text-sm text-gray-600">by {purchaseData.creatorName}</p>
                  <p className="text-sm font-medium text-green-600">
                    ${purchaseData.amount.toFixed(2)} {purchaseData.currency.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Content Stats */}
              <div className="grid grid-cols-3 gap-4 text-center py-4 border-t">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{purchaseData.contentCount}</div>
                  <div className="text-sm text-gray-600">Items</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatFileSize(purchaseData.totalSize)}</div>
                  <div className="text-sm text-gray-600">Total Size</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">∞</div>
                  <div className="text-sm text-gray-600">Lifetime</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full bg-red-600 hover:bg-red-700">
              <Link href={`/product-box/${productBoxId}/content`}>
                <Download className="h-4 w-4 mr-2" />
                View Content
              </Link>
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/purchases">
                  <Package className="h-4 w-4 mr-2" />
                  My Purchases
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href={`/creator/${purchaseData?.creatorName || "creator"}`}>
                  <User className="h-4 w-4 mr-2" />
                  Creator Profile
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
