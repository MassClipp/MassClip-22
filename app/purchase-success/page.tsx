"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Package, User, DollarSign, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface PurchaseData {
  sessionId: string
  bundleId: string
  bundleTitle: string
  bundleDescription: string
  bundleThumbnail: string
  bundlePrice: number
  bundleCurrency: string
  creatorUsername: string
  creatorDisplayName: string
  contentCount: number
  totalSizeFormatted: string
  purchaseAmount: number
  paymentStatus: string
  timestamp: any
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    if (sessionId) {
      fetchPurchaseDetails()
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const fetchPurchaseDetails = async () => {
    try {
      const response = await fetch(`/api/purchase/verify-session?session_id=${sessionId}`)
      if (!response.ok) {
        throw new Error("Failed to verify purchase")
      }
      const data = await response.json()
      setPurchaseData(data)
    } catch (error) {
      console.error("Error fetching purchase details:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getBundleThumbnail = () => {
    if (!purchaseData?.bundleThumbnail) {
      return "/placeholder.svg?height=200&width=200&text=Bundle"
    }
    return purchaseData.bundleThumbnail
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-48 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!sessionId || !purchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Purchase Not Found</h1>
          <p className="text-gray-400 mb-6">We couldn't find your purchase details.</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Purchase Successful!</h1>
          <p className="text-gray-400">Thank you for your purchase. Your content is now available.</p>
        </div>

        {/* Purchase Details Card */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Bundle Thumbnail */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
                  <Image
                    src={getBundleThumbnail() || "/placeholder.svg"}
                    alt={purchaseData.bundleTitle}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=128&width=128&text=Bundle"
                    }}
                  />
                </div>
              </div>

              {/* Purchase Info */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-white mb-2">{purchaseData.bundleTitle}</h2>

                {purchaseData.bundleDescription && (
                  <p className="text-gray-300 mb-4 line-clamp-2">{purchaseData.bundleDescription}</p>
                )}

                {/* Creator Info */}
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">by {purchaseData.creatorDisplayName}</span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-2xl font-bold text-green-400">
                    {formatPrice(purchaseData.purchaseAmount, purchaseData.bundleCurrency)}
                  </span>
                </div>

                {/* Bundle Stats */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-6">
                  <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                    <Package className="w-3 h-3 mr-1" />
                    {purchaseData.contentCount} item{purchaseData.contentCount !== 1 ? "s" : ""}
                  </Badge>
                  {purchaseData.totalSizeFormatted && (
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      {purchaseData.totalSizeFormatted}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                    {purchaseData.paymentStatus === "paid" ? "Paid" : "Processing"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button
                onClick={() => router.push(`/bundles/${purchaseData.bundleId}/content`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Access Content
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => router.push("/dashboard/purchases")}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                View All Purchases
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="mt-8 text-center">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">What's Next?</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• Your content is now available in your purchases</li>
              <li>• You can access it anytime from your dashboard</li>
              <li>• Download links are ready for immediate use</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
