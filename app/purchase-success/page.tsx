"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Eye, RefreshCw, AlertCircle, CreditCard, Calendar, User, Package } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import Link from "next/link"

interface PurchaseData {
  success: boolean
  session: {
    id: string
    amount: number
    currency: string
    payment_status: string
    customerEmail: string
    created: string
  }
  purchase: {
    userId: string
    userEmail: string
    userName: string
    itemId: string
    amount: number
    currency: string
    type: string
    status: string
  }
  item: {
    id: string
    title: string
    description: string
    thumbnailUrl: string
    creator: {
      id: string
      name: string
      username: string
    }
  }
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()

  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = searchParams.get("session_id")

  const verifyPurchase = async () => {
    if (!sessionId) {
      setError("No session ID provided")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Purchase Success] Starting verification for session:", sessionId)

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      })

      console.log("🔍 [Purchase Success] Verification response status:", response.status)

      const data = await response.json()
      console.log("🔍 [Purchase Success] Verification response:", data)

      if (!response.ok) {
        throw new Error(data.details || data.error || "Verification failed")
      }

      if (data.success) {
        setPurchaseData(data)
        console.log("✅ [Purchase Success] Verification successful")
      } else {
        throw new Error(data.error || "Verification failed")
      }
    } catch (err: any) {
      console.error("❌ [Purchase Success] Verification failed:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      verifyPurchase()
    }
  }, [sessionId, authLoading])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    verifyPurchase()
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Your Purchase</h3>
            <p className="text-sm text-gray-600 text-center">
              Please wait while we confirm your payment and set up your access...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Verification Failed</CardTitle>
            <CardDescription className="text-red-700">Failed to verify session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Details:</strong> {error}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Try Again
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-700 hover:bg-red-50 bg-transparent"
                asChild
              >
                <Link href="/dashboard/purchases">
                  <Package className="h-4 w-4 mr-2" />
                  View My Purchases
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!purchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Purchase Data</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              We couldn't find any purchase information for this session.
            </p>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { session, purchase, item } = purchaseData

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Header */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Purchase Successful!</CardTitle>
              <CardDescription className="text-green-700 text-lg">
                Thank you for your purchase. Your content is now available.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Purchase Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Information */}
              <div className="flex gap-4">
                {item?.thumbnailUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={item.thumbnailUrl || "/placeholder.svg"}
                      alt={item?.title || "Purchase item"}
                      className="w-20 h-20 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{item?.title || "Purchased Item"}</h3>
                  {item?.description && <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>}
                  {item?.creator?.name && (
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        by {item.creator.name}
                        {item.creator.username && <span className="text-gray-400"> (@{item.creator.username})</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Amount Paid
                    </span>
                    <span className="font-semibold text-lg">{formatAmount(session.amount, session.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Status</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {session.payment_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Content Type</span>
                    <Badge variant="outline">{purchase.type === "bundle" ? "Bundle" : "Product Box"}</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Purchase Date
                    </span>
                    <span className="text-sm font-medium">{formatDate(session.created)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Transaction ID</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{session.id.slice(-8)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Access Status</span>
                    <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/${purchase?.type === "bundle" ? "bundles" : "product-box"}/${item?.id}/content`}>
                <Eye className="h-4 w-4 mr-2" />
                View Content
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/purchases">
                <Package className="h-4 w-4 mr-2" />
                My Purchases
              </Link>
            </Button>
          </div>

          {/* Additional Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your content is now available in your purchases</li>
                    <li>• You can access it anytime from your dashboard</li>
                    <li>
                      • A confirmation email has been sent to{" "}
                      {session?.customerEmail || purchase?.userEmail || "your email"}
                    </li>
                    <li>• Need help? Contact our support team</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
