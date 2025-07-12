"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Package,
  Download,
  Eye,
  User,
  Calendar,
  DollarSign,
  FileText,
  Video,
  Music,
  ImageIcon,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
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
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  items: PurchaseItem[]
  totalItems: number
  totalSize: number
  purchasedAt: string
  status: string
  accessGranted: boolean
  anonymousAccess?: boolean
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

      // Try to fetch anonymous purchases first (no auth required)
      const anonymousResponse = await fetch("/api/user/anonymous-purchases", {
        credentials: "include",
      })

      if (anonymousResponse.ok) {
        const anonymousData = await anonymousResponse.json()
        if (anonymousData.purchases && anonymousData.purchases.length > 0) {
          setPurchases(anonymousData.purchases)
          setLoading(false)
          return
        }
      }

      // If no anonymous purchases, try authenticated purchases
      const authResponse = await fetch("/api/user/purchases", {
        credentials: "include",
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        setPurchases(authData.purchases || [])
      } else {
        // If both fail, show empty state
        setPurchases([])
      }
    } catch (err: any) {
      console.error("Error fetching purchases:", err)
      setError(err.message || "Failed to load purchases")
      setPurchases([])
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
        return <Video className="h-4 w-4 text-blue-500" />
      case "audio":
        return <Music className="h-4 w-4 text-green-500" />
      case "image":
        return <ImageIcon className="h-4 w-4 text-purple-500" />
      case "document":
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, accessGranted: boolean) => {
    if (accessGranted && status === "completed") {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading purchases: {error}</AlertDescription>
        </Alert>
        <Button onClick={fetchPurchases} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Purchases</h1>
          <p className="text-gray-600">Manage and access your purchased content</p>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No purchases yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              When you purchase content, it will appear here for easy access and management.
            </p>
            <Button asChild>
              <Link href="/dashboard/explore">
                <Package className="h-4 w-4 mr-2" />
                Explore Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Purchases</h1>
        <p className="text-gray-600">
          {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
        </p>
      </div>

      <div className="grid gap-6">
        {purchases.map((purchase) => (
          <Card key={purchase.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* Thumbnail */}
                <div className="lg:w-48 h-48 lg:h-auto relative bg-gray-100">
                  <img
                    src={purchase.productBoxThumbnail || "/placeholder.svg?height=200&width=200"}
                    alt={purchase.productBoxTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">{getStatusBadge(purchase.status, purchase.accessGranted)}</div>
                  {purchase.anonymousAccess && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                        Guest Access
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                    <div className="flex-1 mb-4 lg:mb-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{purchase.productBoxTitle}</h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">{purchase.productBoxDescription}</p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {purchase.creatorName}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(purchase.purchasedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center font-semibold text-green-600">
                          <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)}{" "}
                          {purchase.currency.toUpperCase()}
                        </span>
                      </div>

                      {/* Content Summary */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{purchase.totalItems}</div>
                          <div className="text-xs text-gray-600">Items</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{formatFileSize(purchase.totalSize)}</div>
                          <div className="text-xs text-gray-600">Total Size</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">∞</div>
                          <div className="text-xs text-gray-600">Lifetime</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:ml-6 flex flex-col space-y-2 lg:w-48">
                      <Button asChild className="w-full">
                        <Link href={`/product-box/${purchase.productBoxId}/content`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Content
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full bg-transparent">
                        <Link href={`/creator/${purchase.creatorUsername}`}>
                          <User className="h-4 w-4 mr-2" />
                          Creator Profile
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Content Items Preview */}
                  {purchase.items && purchase.items.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Content ({purchase.items.length} items)</h4>
                      <div className="space-y-2">
                        {purchase.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                            <div className="flex-shrink-0">{getContentIcon(item.contentType)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.title}</p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{formatFileSize(item.fileSize)}</span>
                                {item.duration && item.duration > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{formatDuration(item.duration)}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="capitalize">{item.contentType}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" asChild>
                              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        ))}
                        {purchase.items.length > 3 && (
                          <div className="text-center text-sm text-gray-500 py-2">
                            +{purchase.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Lifetime Access Guaranteed</h4>
            <p className="text-sm text-blue-700 mt-1">
              All your purchases include lifetime access. You can download and re-download your content anytime.
              {purchases.some((p) => p.anonymousAccess) && " Guest purchases are automatically saved for easy access."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
