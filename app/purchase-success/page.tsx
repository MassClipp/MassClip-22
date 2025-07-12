"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Play, User, Package, ArrowRight, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface PurchaseData {
  id: string
  sessionId: string
  userId: string
  bundleId?: string
  productBoxId?: string
  amount: number
  currency: string
  status: string
  createdAt: string
  bundleData?: {
    title: string
    description: string
    price: number
    contentItems: Array<{
      id: string
      title: string
      type: string
      duration?: number
      fileSize?: number
    }>
    creatorData?: {
      displayName: string
      username: string
    }
  }
  productBoxData?: {
    title: string
    description: string
    price: number
    contentItems: Array<{
      id: string
      title: string
      type: string
      duration?: number
      fileSize?: number
    }>
    creatorData?: {
      displayName: string
      username: string
    }
  }
}

function PurchaseSuccessContent() {
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshAuth } = useAuth()

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    const verifyAndGrantAccess = async () => {
      if (!sessionId) {
        setError("No session ID provided")
        setLoading(false)
        setVerifying(false)
        return
      }

      try {
        console.log("🔍 Verifying purchase and granting access...")

        // First refresh auth to ensure we have the latest session
        await refreshAuth()

        const response = await fetch("/api/purchase/verify-and-grant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to verify purchase")
        }

        if (data.success && data.purchase) {
          setPurchaseData(data.purchase)
          console.log("✅ Purchase verified and access granted!")
        } else {
          throw new Error("Purchase verification failed")
        }
      } catch (err: any) {
        console.error("❌ Purchase verification error:", err)
        setError(err.message || "Failed to verify purchase")
      } finally {
        setLoading(false)
        setVerifying(false)
      }
    }

    verifyAndGrantAccess()
  }, [sessionId, refreshAuth])

  const handleAccessPurchases = () => {
    router.push("/dashboard/purchases")
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown duration"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {verifying ? "Verifying Your Purchase..." : "Loading..."}
              </h2>
              <p className="text-gray-600">
                {verifying
                  ? "Please wait while we confirm your payment and grant access to your content."
                  : "Setting up your account..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="text-gray-600">{error}</p>
              <Button onClick={() => router.push("/dashboard")} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">No Purchase Data Found</h2>
            <p className="text-gray-600 mt-2">Unable to retrieve purchase information.</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const contentData = purchaseData.bundleData || purchaseData.productBoxData
  const contentType = purchaseData.bundleId ? "Bundle" : "Product Box"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">🎉 Purchase Successful!</CardTitle>
          <p className="text-lg text-gray-600">
            Your payment has been processed and you now have lifetime access to your content.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Purchase Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Purchase Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Content Type:</span>
                  <Badge variant="secondary">{contentType}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold text-green-600">
                    ${(purchaseData.amount / 100).toFixed(2)} {purchaseData.currency.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Purchase Date:</span>
                  <span className="font-medium">{new Date(purchaseData.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {purchaseData.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Content Details */}
          {contentData && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{contentData.title}</h3>
                  {contentData.description && <p className="text-gray-600 mt-1">{contentData.description}</p>}
                </div>
                {contentData.creatorData && (
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-1" />
                      {contentData.creatorData.displayName}
                    </div>
                    <div className="text-xs text-gray-500">@{contentData.creatorData.username}</div>
                  </div>
                )}
              </div>

              {/* Content Items */}
              {contentData.contentItems && contentData.contentItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Included Content ({contentData.contentItems.length} items):
                  </h4>
                  <div className="space-y-2">
                    {contentData.contentItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {item.type === "video" ? (
                            <Play className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Download className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium text-gray-900">{item.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-x-2">
                          {item.duration && <span>{formatDuration(item.duration)}</span>}
                          {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success Checklist */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">✅ What's Next?</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Payment processed successfully</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Content added to your account</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Lifetime access granted</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Ready to download and enjoy!</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={handleAccessPurchases}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Package className="h-5 w-5 mr-2" />
              Access My Purchases
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 font-medium py-3 px-6 rounded-lg transition-all duration-200"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>Need help? Contact our support team or visit your dashboard to manage your purchases.</p>
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
