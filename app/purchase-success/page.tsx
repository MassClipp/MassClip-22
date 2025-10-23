"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Eye, RefreshCw, AlertCircle, CreditCard, Calendar, User, Package, Download } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import Link from "next/link"

interface PurchaseData {
  success: boolean
  session?: {
    id: string
    amount: number
    currency: string
    payment_status: string
    customerEmail?: string
    created: string
  }
  purchase?: {
    userId: string
    userEmail: string
    userName: string
    itemId: string
    amount: number
    currency: string
    type: string
    status: string
  }
  item?: {
    id: string
    title?: string
    description?: string
    thumbnailUrl?: string
    creator?: {
      id: string
      name?: string
      username?: string
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
  const [downloading, setDownloading] = useState(false)
  const sessionId = searchParams?.get("session_id")

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
        throw new Error(data?.details || data?.error || "Verification failed")
      }

      if (data?.success) {
        setPurchaseData(data)
        console.log("✅ [Purchase Success] Verification successful")

        if (typeof window !== "undefined" && (window as any).fbq) {
          const amount = data.session?.amount || 0
          const currency = data.session?.currency || "USD"
          const itemTitle = data.item?.title || "Bundle"
          ;(window as any).fbq("track", "Purchase", {
            value: amount / 100, // Convert cents to dollars
            currency: currency.toUpperCase(),
            content_name: itemTitle,
            content_type: "bundle",
            content_ids: [data.item?.id || ""],
            num_items: 1,
          })
        }
      } else {
        throw new Error(data?.error || "Verification failed")
      }
    } catch (err: any) {
      console.error("❌ [Purchase Success] Verification failed:", err)
      setError(err?.message || "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && sessionId) {
      verifyPurchase()
    }
  }, [sessionId, authLoading])

  useEffect(() => {
    if (sessionId && typeof window !== "undefined") {
      localStorage.setItem("lastPurchaseSessionId", sessionId)
    }
  }, [sessionId])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    verifyPurchase()
  }

  const handleDownloadZip = async () => {
    if (!itemId || !sessionId) {
      alert("Missing required information to download")
      return
    }

    try {
      setDownloading(true)
      console.log("[v0] Starting ZIP download for bundle:", itemId)

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // Add auth token if user is logged in
      if (user) {
        const token = await user.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(`/api/bundles/${itemId}/download-zip-buyer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to download ZIP")
      }

      // Download the ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${itemTitle.replace(/[^\w\s-]/gi, "")}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log("[v0] ZIP download completed successfully")
    } catch (error) {
      console.error("[v0] ZIP download failed:", error)
      alert(error instanceof Error ? error.message : "Failed to download ZIP")
    } finally {
      setDownloading(false)
    }
  }

  const formatAmount = (amount = 0, currency = "usd") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100)
    } catch {
      return `$${(amount / 100).toFixed(2)}`
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Unknown date"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/20 shadow-2xl bg-white/5 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Verifying Your Purchase</h3>
            <p className="text-sm text-gray-400 text-center">
              Please wait while we confirm your payment and set up your access...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/50 shadow-2xl bg-white/5 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-white">Verification Failed</CardTitle>
            <CardDescription className="text-gray-400">Failed to verify session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-300">
                <strong>Details:</strong> {error}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRetry}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Try Again
              </Button>
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl bg-white/5 backdrop-blur-xl border-white/20">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Purchase Data</h3>
            <p className="text-sm text-gray-400 text-center mb-4">
              We couldn't find any purchase information for this session.
            </p>
            <Button
              onClick={handleRetry}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Safely extract data with fallbacks
  const session = purchaseData.session || {}
  const purchase = purchaseData.purchase || {}
  const item = purchaseData.item || {}
  const creator = item.creator || {}

  const itemTitle = item.title || "Purchased Item"
  const itemDescription = item.description || ""
  const itemThumbnailUrl = item.thumbnailUrl || "/placeholder.svg"
  const creatorName = creator.name || "Creator"
  const creatorUsername = creator.username || ""
  const sessionAmount = session.amount || 0
  const sessionCurrency = session.currency || "usd"
  const sessionPaymentStatus = session.payment_status || "unknown"
  const sessionCreated = session.created || ""
  const itemId = item.id || ""

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Header */}
          <Card className="border-white/20 bg-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-teal-400" />
              </div>
              <CardTitle className="text-2xl text-white">Purchase Successful!</CardTitle>
              <CardDescription className="text-gray-400 text-lg">
                Thank you for your purchase. Your content is now available.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Purchase Details */}
          <Card className="shadow-2xl bg-white/5 backdrop-blur-xl border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="h-5 w-5" />
                Purchase Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Information */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img
                    src={itemThumbnailUrl || "/placeholder.svg"}
                    alt={itemTitle}
                    className="w-20 h-20 rounded-lg object-cover border border-white/20"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-white">{itemTitle}</h3>
                  {itemDescription && <p className="text-gray-400 text-sm mt-1 line-clamp-2">{itemDescription}</p>}
                  {creatorName && (
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-400">
                        by {creatorName}
                        {creatorUsername && <span className="text-gray-500"> (@{creatorUsername})</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="bg-white/20" />

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Amount Paid
                    </span>
                    <span className="font-semibold text-lg text-white">
                      {formatAmount(sessionAmount, sessionCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Payment Status</span>
                    <Badge variant="secondary" className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                      {sessionPaymentStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Content Type</span>
                    <Badge variant="outline" className="border-white/30 text-gray-300">
                      {purchase.type === "bundle" ? "Bundle" : "Product Box"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Purchase Date
                    </span>
                    <span className="text-sm font-medium text-white">{formatDate(sessionCreated)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Transaction ID</span>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded border border-white/20 text-gray-300">
                      {sessionId ? sessionId.slice(-8) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Access Status</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itemId && (
              <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg">
                <Link href={`/${purchase.type === "bundle" ? "bundles" : "product-box"}/${itemId}/content`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Content
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent shadow-lg"
            >
              <Link href="/dashboard/purchases">
                <Package className="h-4 w-4 mr-2" />
                My Purchases
              </Link>
            </Button>
          </div>

          {/* Download ZIP Button */}
          {purchase.type === "bundle" && itemId && (
            <Button
              onClick={handleDownloadZip}
              disabled={downloading}
              size="lg"
              variant="outline"
              className="w-full border-teal-500/50 text-teal-400 hover:bg-teal-500/10 bg-transparent shadow-lg"
            >
              {downloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Download...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download All as ZIP
                </>
              )}
            </Button>
          )}

          {/* Additional Information */}
          <Card className="bg-white/5 border-white/20 shadow-2xl backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-500/30">
                  <CheckCircle className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">What's Next?</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Your content is now available in your purchases</li>
                    <li>• You can access it anytime from your dashboard</li>
                    <li>
                      • A confirmation email has been sent to{" "}
                      {session.customerEmail || purchase.userEmail || "your email"}
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
