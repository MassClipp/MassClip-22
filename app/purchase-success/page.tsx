"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  Eye,
  User,
  Calendar,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Package,
} from "lucide-react"
import Link from "next/link"

interface VerificationResponse {
  success: boolean
  alreadyProcessed?: boolean
  session?: {
    id: string
    payment_status: string
    amount: number
    currency: string
    customerEmail?: string
    created?: string
  }
  purchase?: any
  item?: {
    id: string
    title: string
    description?: string
    thumbnailUrl?: string
    creator?: {
      id: string
      name: string
      username: string
    }
  }
  error?: string
  details?: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    console.log("🔍 [Purchase Success] Page loaded with session ID:", sessionId)

    if (!sessionId) {
      console.error("❌ [Purchase Success] No session ID found in URL")
      setVerificationStatus("error")
      setVerificationData({ success: false, error: "No session ID provided" })
      return
    }

    verifyPurchase()
  }, [sessionId, retryCount])

  const verifyPurchase = async () => {
    if (!sessionId) return

    try {
      console.log("🔄 [Purchase Success] Starting verification for session:", sessionId)
      setVerificationStatus("loading")

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: JSON.stringify({ sessionId }),
      })

      console.log("📡 [Purchase Success] Verification response status:", response.status)

      const data = await response.json()
      console.log("📋 [Purchase Success] Verification response:", data)

      if (data.success) {
        setVerificationStatus("success")
        setVerificationData(data)
        console.log("✅ [Purchase Success] Verification successful")
      } else {
        setVerificationStatus("error")
        setVerificationData(data)
        console.error("❌ [Purchase Success] Verification failed:", data.error)
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Verification error:", error)
      setVerificationStatus("error")
      setVerificationData({ success: false, error: "Network error occurred" })
    }
  }

  const handleRetry = () => {
    console.log("🔄 [Purchase Success] Manual retry triggered")
    setRetryCount((prev) => prev + 1)
  }

  const handleAccessContent = () => {
    if (verificationData?.item?.id) {
      const itemId = verificationData.item.id
      const isBundle = verificationData.purchase?.bundleId || verificationData.purchase?.type === "bundle"

      if (isBundle) {
        router.push(`/bundle/${itemId}/content`)
      } else {
        router.push(`/product-box/${itemId}/content`)
      }
    } else {
      router.push("/dashboard/purchases")
    }
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

  // Loading State
  if (verificationStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse opacity-20"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Purchase</h1>
            <p className="text-gray-600 mb-4">Please wait while we confirm your purchase...</p>
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                Retry attempt: {retryCount}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error State
  if (verificationStatus === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/90 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse opacity-20"></div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{verificationData?.error || "Unable to verify your purchase"}</p>

            {verificationData?.details && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-red-800">
                  <strong>Details:</strong> {verificationData.details}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/purchases")}
                className="w-full border-gray-300 hover:bg-gray-50"
              >
                <Package className="w-4 h-4 mr-2" />
                View My Purchases
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-xs font-semibold text-gray-700 mb-2">Debug Information:</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>
                    <strong>Session ID:</strong> {sessionId}
                  </p>
                  <p>
                    <strong>Retry Count:</strong> {retryCount}
                  </p>
                  <p>
                    <strong>Error:</strong> {verificationData?.error}
                  </p>
                  {verificationData?.details && (
                    <p>
                      <strong>Details:</strong> {verificationData.details}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success State
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/90 backdrop-blur-xl">
        <CardContent className="p-0">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Purchase Complete!</h1>
              <p className="text-emerald-100 text-lg">Your content is now available</p>
              {verificationData?.alreadyProcessed && (
                <Badge className="mt-3 bg-white/20 text-white border-white/30">Previously Processed</Badge>
              )}
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <div className="p-8">
            {/* Item Details */}
            {verificationData?.item && (
              <div className="mb-8">
                <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                  {verificationData.item.thumbnailUrl ? (
                    <img
                      src={verificationData.item.thumbnailUrl || "/placeholder.svg"}
                      alt={verificationData.item.title}
                      className="w-20 h-20 rounded-lg object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-md">
                      <Package className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{verificationData.item.title}</h2>
                    {verificationData.item.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{verificationData.item.description}</p>
                    )}
                    {verificationData.item.creator && (
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="w-4 h-4 mr-1" />
                        <span>by {verificationData.item.creator.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Details */}
            {verificationData?.session && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Purchase Details
                </h3>
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatAmount(verificationData.session.amount, verificationData.session.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {verificationData.session.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Transaction ID</p>
                      <p className="font-mono text-gray-700 break-all">{verificationData.session.id}</p>
                    </div>
                    {verificationData.session.created && (
                      <div>
                        <p className="text-gray-500 mb-1">Purchase Date</p>
                        <p className="text-gray-700 flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(verificationData.session.created)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleAccessContent}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 text-lg font-semibold shadow-lg"
              >
                <Eye className="w-5 h-5 mr-2" />
                Access Your Content
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/purchases")}
                  className="border-gray-300 hover:bg-gray-50 py-3"
                >
                  <Package className="w-4 h-4 mr-2" />
                  View All Purchases
                </Button>

                {verificationData?.item?.creator?.username && (
                  <Button variant="outline" asChild className="border-gray-300 hover:bg-gray-50 py-3 bg-transparent">
                    <Link href={`/creator/${verificationData.item.creator.username}`}>
                      <User className="w-4 h-4 mr-2" />
                      Creator Profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Success Message */}
            <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
              <div className="flex items-center text-emerald-800">
                <Sparkles className="w-5 h-5 mr-2" />
                <p className="font-medium">Congratulations! You now have lifetime access to this content.</p>
              </div>
            </div>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
