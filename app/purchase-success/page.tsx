"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle, ShoppingBag, Download, Eye } from "lucide-react"
import Link from "next/link"

interface PurchaseItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  fileSize: number
  duration?: number
  contentType: "video" | "audio" | "image" | "document"
}

interface PurchaseData {
  id: string
  productBoxId: string
  productBoxTitle: string
  productBoxDescription: string
  productBoxThumbnail: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  items: PurchaseItem[]
  totalItems: number
  totalSize: number
  purchasedAt: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [accessGranted, setAccessGranted] = useState(false)

  const sessionId = searchParams.get("session_id")
  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      sessionId,
      productBoxId,
      creatorId,
      testMode,
    })

    if (!sessionId && !productBoxId) {
      setError("Invalid purchase parameters")
      setIsProcessing(false)
      return
    }

    verifyAndGrantAccess()
  }, [sessionId, productBoxId, creatorId])

  const verifyAndGrantAccess = async () => {
    try {
      console.log(`🔄 [Purchase Success] Verifying purchase and granting immediate access...`)

      const response = await fetch("/api/purchase/verify-and-grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          productBoxId,
          creatorId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify purchase")
      }

      console.log(`✅ [Purchase Success] Access granted successfully:`, result)

      setPurchaseData(result.purchase)
      setAccessGranted(true)
      setSuccess(true)
    } catch (err: any) {
      console.error(`❌ [Purchase Success] Error:`, err)
      setError(err.message || "Failed to verify purchase")
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
      }, 2000)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Loading state with gradient background
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
              <ShoppingBag className="h-8 w-8 text-green-400" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Processing Your Purchase</h2>
              <p className="text-white/70 mb-4">Verifying payment and granting access...</p>
              <div className="flex space-x-2 justify-center">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Purchase Verification Failed</h1>
              <p className="text-white/70 mb-6">{error}</p>
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
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
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success state
  if (success && purchaseData) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
          <Card className="w-full max-w-2xl bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8">
              {/* Success Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-green-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {testMode ? "🧪 Test Purchase Complete!" : "🎉 Purchase Successful!"}
                </h1>
                <p className="text-xl text-white/80 mb-2">Access Granted Instantly</p>
                <p className="text-white/60">
                  Your content has been automatically added to your account and is ready to access.
                </p>
              </div>

              {/* Test Mode Warning */}
              {testMode && (
                <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    <strong>TEST MODE:</strong> This was a test purchase using Stripe test cards. No real money was
                    charged.
                  </AlertDescription>
                </Alert>
              )}

              {/* Purchase Summary */}
              <div className="bg-white/5 rounded-lg p-6 mb-6 border border-white/10">
                <div className="flex items-start space-x-4 mb-4">
                  {purchaseData.productBoxThumbnail && (
                    <img
                      src={purchaseData.productBoxThumbnail || "/placeholder.svg"}
                      alt={purchaseData.productBoxTitle}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{purchaseData.productBoxTitle}</h3>
                    <p className="text-white/70 mb-2">{purchaseData.productBoxDescription}</p>
                    <div className="flex items-center space-x-4 text-sm text-white/60">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        by {purchaseData.creatorName}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />${purchaseData.amount.toFixed(2)}{" "}
                        {purchaseData.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-black/20 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{purchaseData.totalItems}</div>
                    <div className="text-sm text-white/60">Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatFileSize(purchaseData.totalSize)}</div>
                    <div className="text-sm text-white/60">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">∞</div>
                    <div className="text-sm text-white/60">Lifetime Access</div>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              {purchaseData.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Your Content ({purchaseData.items.length} items)
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {purchaseData.items.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                          {item.contentType === "video" && <Eye className="h-5 w-5 text-white/60" />}
                          {item.contentType === "audio" && <Download className="h-5 w-5 text-white/60" />}
                          {item.contentType === "image" && <Package className="h-5 w-5 text-white/60" />}
                          {item.contentType === "document" && <Package className="h-5 w-5 text-white/60" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{item.title}</p>
                          <div className="flex items-center space-x-2 text-xs text-white/60">
                            <span>{formatFileSize(item.fileSize)}</span>
                            {item.duration && <span>• {formatDuration(item.duration)}</span>}
                            <span>• {item.contentType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {purchaseData.items.length > 5 && (
                      <div className="text-center text-white/60 text-sm py-2">
                        +{purchaseData.items.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg">
                  <Link href="/dashboard/purchases">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Access My Purchases
                  </Link>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    <Link href={`/product-box/${purchaseData.productBoxId}/content`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Content
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    <Link href="/dashboard">
                      <Package className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Success Checklist */}
              <div className="mt-8 p-6 bg-green-500/10 rounded-lg border border-green-500/20">
                <h3 className="font-semibold text-green-200 mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Purchase Complete - Access Granted!
                </h3>
                <ul className="text-sm text-green-200/80 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    {testMode ? "Test payment" : "Payment"} processed successfully
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Content automatically added to your account
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Instant access granted - no waiting required
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Lifetime access to all {purchaseData.totalItems} items
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Purchase receipt saved to your account
                  </li>
                  {testMode && (
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                      Test mode - no real charges applied
                    </li>
                  )}
                </ul>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-white/50">
                <p>🎉 Welcome to MassClip! Your content is ready to enjoy.</p>
                <p className="mt-1">
                  Purchased on {new Date(purchaseData.purchasedAt).toLocaleDateString()} • Order #
                  {purchaseData.id.slice(-8)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-red-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-semibold text-white mb-2">Loading...</h2>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
