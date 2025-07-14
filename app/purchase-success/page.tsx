"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Eye, User, ShoppingBag } from "lucide-react"

export default function PurchaseSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")

  useEffect(() => {
    if (!sessionId || !productBoxId) {
      setError("Missing purchase information")
      setVerificationStatus("error")
      return
    }

    verifyAndCompletePurchase()
  }, [sessionId, productBoxId, user])

  const verifyAndCompletePurchase = async () => {
    try {
      console.log("🔍 [Purchase Success] Verifying purchase:", { sessionId, productBoxId })

      // Get auth token if user is authenticated
      const authToken = user ? await user.getIdToken() : null

      const headers: any = {
        "Content-Type": "application/json",
      }

      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }

      const response = await fetch("/api/purchase/verify-and-complete-bundle", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId,
          productBoxId,
          forceComplete: true, // Force completion to fix any missing data
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPurchaseData(result.purchase)
        setVerificationStatus("success")
        console.log("✅ [Purchase Success] Purchase verified successfully:", {
          contentCount: result.purchase.contentCount,
          bundleTitle: result.purchase.bundleTitle,
          buyerUid: result.purchase.buyerUid,
        })
      } else {
        throw new Error(result.error || "Purchase verification failed")
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setError(error.message)
      setVerificationStatus("error")
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

  const handleViewCreatorProfile = () => {
    if (purchaseData?.creatorUsername) {
      router.push(`/creator/${purchaseData.creatorUsername}`)
    }
  }

  if (authLoading || verificationStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Purchase</h2>
            <p className="text-gray-600 text-center">Verifying your purchase and setting up access...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Purchase Error</h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8">
          {/* Success Header */}
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Granted!</h1>
            <p className="text-gray-600">Your premium content is now available</p>
            {user && <p className="text-sm text-gray-500 mt-2">Welcome, {user.email}</p>}
          </div>

          {/* Purchase Details */}
          {purchaseData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-4">
                {purchaseData.thumbnailUrl && (
                  <img
                    src={purchaseData.thumbnailUrl || "/placeholder.svg"}
                    alt={purchaseData.bundleTitle}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{purchaseData.bundleTitle}</h3>
                  {purchaseData.creatorName && <p className="text-sm text-gray-600">by {purchaseData.creatorName}</p>}
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>{purchaseData.contentCount || 0} Items</span>
                    <span>{purchaseData.totalSize ? formatFileSize(purchaseData.totalSize) : "0 B"} Total Size</span>
                    <span>Lifetime</span>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              {purchaseData.itemNames && purchaseData.itemNames.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Content Included:</p>
                  <div className="space-y-1">
                    {purchaseData.itemNames.slice(0, 3).map((itemName: string, index: number) => (
                      <p key={index} className="text-sm text-gray-600 truncate">
                        • {itemName}
                      </p>
                    ))}
                    {purchaseData.itemNames.length > 3 && (
                      <p className="text-sm text-gray-500">+ {purchaseData.itemNames.length - 3} more items</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button onClick={handleViewContent} className="w-full" size="lg">
              <Eye className="h-4 w-4 mr-2" />
              View Content
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleViewPurchases} variant="outline" size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                My Purchases
              </Button>

              {purchaseData?.creatorUsername && (
                <Button onClick={handleViewCreatorProfile} variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Creator Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
