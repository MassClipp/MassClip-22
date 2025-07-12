"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingBag,
  Eye,
  Calendar,
  DollarSign,
  Package,
  User,
  FileText,
  Video,
  Music,
  ImageIcon,
  AlertTriangle,
  RefreshCw,
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

interface Purchase {
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
  status: string
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/unified-purchases")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch purchases")
      }

      // Ensure we always have an array
      const purchasesArray = Array.isArray(data.purchases) ? data.purchases : []
      setPurchases(purchasesArray)
    } catch (err: any) {
      console.error("Error fetching purchases:", err)
      setError(err.message || "Failed to load purchases")
      setPurchases([]) // Always set to empty array on error
    } finally {
      setLoading(false)
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

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <div className="grid gap-6">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-16 h-16 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4 bg-white/10" />
                    <Skeleton className="h-4 w-1/2 bg-white/10" />
                    <Skeleton className="h-4 w-1/4 bg-white/10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Empty state
  if (purchases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Purchases Yet</h3>
            <p className="text-white/60 mb-6">
              You haven't made any purchases yet. Explore our content library to find premium content.
            </p>
            <div className="space-y-3">
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link href="/dashboard/explore">
                  <Package className="w-4 h-4 mr-2" />
                  Explore Content
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
                <Link href="/dashboard">
                  <Eye className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Purchases list
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
        <p className="text-white/70">Access your purchased content and downloads ({purchases.length} items)</p>
      </div>

      <div className="grid gap-6">
        {purchases.map((purchase) => (
          <Card
            key={purchase.id}
            className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                {purchase.productBoxThumbnail && (
                  <img
                    src={purchase.productBoxThumbnail || "/placeholder.svg"}
                    alt={purchase.productBoxTitle}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{purchase.productBoxTitle}</h3>
                      <p className="text-white/70 text-sm mb-2">{purchase.productBoxDescription}</p>
                      <div className="flex items-center space-x-4 text-sm text-white/60">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          by {purchase.creatorName}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)}{" "}
                          {purchase.currency.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-200 border-green-500/30">
                      {String(purchase.status || "completed")
                        .charAt(0)
                        .toUpperCase() + String(purchase.status || "completed").slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-black/20 rounded-lg mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{purchase.totalItems || 0}</div>
                  <div className="text-sm text-white/60">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{formatFileSize(purchase.totalSize || 0)}</div>
                  <div className="text-sm text-white/60">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">∞</div>
                  <div className="text-sm text-white/60">Lifetime Access</div>
                </div>
              </div>

              {/* Content Items Preview */}
              {purchase.items && purchase.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/80 mb-2">Content Items</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {purchase.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {getContentIcon(item.contentType)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{item.title}</p>
                          <div className="flex items-center space-x-2 text-xs text-white/60">
                            <span>{formatFileSize(item.fileSize)}</span>
                            {item.duration && item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                            <span>• {item.contentType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {purchase.items.length > 3 && (
                      <div className="text-center text-white/60 text-xs py-1">
                        +{purchase.items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button asChild className="bg-red-600 hover:bg-red-700 flex-1">
                  <Link href={`/product-box/${purchase.productBoxId}/content`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Access Content
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href={`/creator/${purchase.creatorUsername}`}>
                    <User className="w-4 h-4 mr-2" />
                    Creator Profile
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-white/50 text-sm">
          Need help with your purchases?{" "}
          <Link href="/support" className="text-red-400 hover:text-red-300">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}
