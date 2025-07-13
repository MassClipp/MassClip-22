"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  Package,
  User,
  DollarSign,
  Clock,
  AlertTriangle,
  ShoppingBag,
  Download,
  Eye,
  ArrowRight,
} from "lucide-react"
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
  accessToken: string
}

function PurchaseSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)

  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      productBoxId,
      creatorId,
      testMode,
      fullURL: window.location.href,
    })

    if (!productBoxId) {
      setError("Invalid purchase parameters - missing product box ID")
      setIsProcessing(false)
      return
    }

    grantAccess()
  }, [productBoxId, creatorId])

  const grantAccess = async () => {
    try {
      console.log(`🔄 [Purchase Success] Granting access to content...`)

      const requestBody = {
        productBoxId,
        creatorId,
      }

      console.log(`📤 [Purchase Success] Sending request:`, requestBody)

      const response = await fetch("/api/purchase/verify-and-grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookies
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      console.log(`📥 [Purchase Success] Response:`, {
        status: response.status,
        ok: response.ok,
        result,
      })

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${result.details || "Failed to grant access"}`)
      }

      console.log(`✅ [Purchase Success] Access granted successfully:`, result)

      setPurchaseData(result.purchase)
      setSuccess(true)
    } catch (err: any) {
      console.error(`❌ [Purchase Success] Error:`, err)
      setError(err.message || "Failed to grant access")
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
    if (seconds === 0) return ""
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Loading state with animated processing
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <ShoppingBag className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Granting Access</h2>
              <p className="text-white/70 mb-6">Setting up your premium content access...</p>

              {/* Animated loading dots */}
              <div className="flex space-x-2 justify-center mb-6">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
              </div>

              <div className="text-sm text-white/50">This usually takes just a few seconds...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600 hover:text-red-500 transition-colors">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-red-500/20">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Access Grant Failed</h1>
              <p className="text-white/70 mb-6">{error}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Try Again
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 transition-colors"
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

  // Success state with comprehensive purchase details
  if (success && purchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600 hover:text-red-500 transition-colors">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
          <Card className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8">
              {/* Success Header */}
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <CheckCircle className="h-14 w-14 text-green-400" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">
                  {testMode ? "🧪 Test Access Granted!" : "🎉 Access Granted!"}
                </h1>
                <p className="text-xl text-green-400 mb-2 font-semibold">✨ Content Unlocked Instantly ✨</p>
                <p className="text-white/70 text-lg max-w-2xl mx-auto">
                  Your premium content has been automatically unlocked and is ready to access immediately.
                  <strong className="text-green-400"> No login required!</strong>
                </p>
              </div>

              {/* Test Mode Warning */}
              {testMode && (
                <Alert className="mb-8 bg-yellow-500/10 border-yellow-500/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    <strong>TEST MODE:</strong> This is a test access grant. No payment was processed.
                  </AlertDescription>
                </Alert>
              )}

              {/* Purchase Summary Card */}
              <div className="bg-white/5 rounded-xl p-8 mb-8 border border-white/10">
                <div className="flex items-start space-x-6 mb-6">
                  {purchaseData.productBoxThumbnail && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={purchaseData.productBoxThumbnail || "/placeholder.svg"}
                        alt={purchaseData.productBoxTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{purchaseData.productBoxTitle}</h3>
                    <p className="text-white/80 mb-4 text-lg">{purchaseData.productBoxDescription}</p>
                    <div className="flex items-center space-x-6 text-white/70">
                      <span className="flex items-center text-lg">
                        <User className="h-5 w-5 mr-2" />
                        by {purchaseData.creatorName}
                      </span>
                      <span className="flex items-center text-lg font-semibold text-green-400">
                        <DollarSign className="h-5 w-5 mr-1" />${purchaseData.amount.toFixed(2)}{" "}
                        {purchaseData.currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Summary Grid */}
                <div className="grid grid-cols-3 gap-6 p-6 bg-black/20 rounded-xl">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{purchaseData.totalItems}</div>
                    <div className="text-white/60">Content Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{formatFileSize(purchaseData.totalSize)}</div>
                    <div className="text-white/60">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">∞</div>
                    <div className="text-white/60">Lifetime Access</div>
                  </div>
                </div>
              </div>

              {/* Content Preview */}
              {purchaseData.items && purchaseData.items.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Your Content ({purchaseData.items.length} items)
                  </h4>
                  <div className="grid gap-4">
                    {purchaseData.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.contentType === "video" && <Eye className="h-6 w-6 text-blue-400" />}
                          {item.contentType === "audio" && <Download className="h-6 w-6 text-green-400" />}
                          {(item.contentType === "image" || item.contentType === "document") && (
                            <Package className="h-6 w-6 text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-lg">{item.title}</p>
                          <div className="flex items-center space-x-4 text-sm text-white/60">
                            <span>{formatFileSize(item.fileSize)}</span>
                            {item.duration && item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                            <span>• {item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)}</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-white/30">{String(index + 1).padStart(2, "0")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="space-y-4 mb-8">
                <Button
                  asChild
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-xl font-semibold transition-colors"
                >
                  <Link href="/dashboard/purchases">
                    <ShoppingBag className="w-6 h-6 mr-3" />
                    Access My Content
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </Link>
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 py-3 text-lg transition-colors"
                  >
                    <Link href={`/product-box/${purchaseData.productBoxId}/content`}>
                      <Eye className="w-5 h-5 mr-2" />
                      View Content Now
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 py-3 text-lg transition-colors"
                  >
                    <Link href={`/creator/${purchaseData.creatorUsername}`}>
                      <User className="w-5 h-5 mr-2" />
                      Creator Profile
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Success Checklist */}
              <div className="p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                <h3 className="font-semibold text-green-200 mb-4 flex items-center text-lg">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Access Granted - Content Unlocked!
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>Content access granted successfully</span>
                  </div>
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>Content unlocked instantly</span>
                  </div>
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>No login required - access granted automatically</span>
                  </div>
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>Lifetime access to all {purchaseData.totalItems} items</span>
                  </div>
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>Download and streaming available</span>
                  </div>
                  <div className="flex items-center text-green-200/90">
                    <CheckCircle className="h-5 w-5 mr-3 text-green-400 flex-shrink-0" />
                    <span>Access record saved automatically</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-white/60 text-lg mb-2">
                  🎉 Welcome to MassClip! Your premium content is ready to enjoy.
                </p>
                <p className="text-white/40">
                  Access granted on {new Date(purchaseData.purchasedAt).toLocaleDateString()} • Access ID #
                  {purchaseData.id.slice(-8).toUpperCase()}
                </p>
                {purchaseData.accessToken && (
                  <p className="text-white/30 text-sm mt-2">
                    Access Token: {purchaseData.accessToken.slice(-8).toUpperCase()}
                  </p>
                )}
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-red-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-semibold text-white mb-2">Loading Content Access...</h2>
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
