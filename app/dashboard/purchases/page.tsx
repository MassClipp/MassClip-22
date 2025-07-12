"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
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
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Star,
  CheckCircle,
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
  source?: string
  anonymousAccess?: boolean
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchases()
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

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

      // If user is authenticated, try to fetch authenticated purchases
      if (user) {
        const idToken = await user.getIdToken()
        const response = await fetch("/api/user/unified-purchases", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch purchases")
        }

        const data = await response.json()
        setPurchases(data.purchases || [])
      } else {
        // No user and no anonymous purchases
        setPurchases([])
      }
    } catch (err: any) {
      console.error("Error fetching purchases:", err)
      setError(err.message)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return ""
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes === 0) return `${remainingSeconds}s`
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
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-200 border-green-500/30">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-500/30">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-20 h-20 rounded-lg bg-white/10" />
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
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4">
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
            <Link href="/dashboard">
              <Package className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
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
            <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              You haven't made any purchases yet. Explore our premium content library to find amazing content from
              talented creators.
            </p>
            <div className="space-y-3">
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link href="/dashboard/explore">
                  <Star className="w-4 h-4 mr-2" />
                  Explore Premium Content
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
                <Link href="/dashboard">
                  <Package className="w-4 h-4 mr-2" />
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
        <p className="text-white/70">
          {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
        </p>
      </div>

      {/* Purchases Grid */}
      <div className="grid gap-6">
        {purchases.map((purchase, index) => (
          <Card
            key={purchase.id}
            className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: "fadeInUp 0.6s ease-out forwards",
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  {purchase.productBoxThumbnail ? (
                    <img
                      src={purchase.productBoxThumbnail || "/placeholder.svg"}
                      alt={purchase.productBoxTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=80&width=80&text=No+Image"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Purchase Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{purchase.productBoxTitle}</h3>
                      <p className="text-white/70 text-sm mb-2 line-clamp-2">{purchase.productBoxDescription}</p>
                      <div className="flex items-center space-x-4 text-sm text-white/60">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {purchase.creatorName}
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
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(purchase.status)}
                      {purchase.anonymousAccess && (
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-200 bg-blue-500/10">
                          Guest Access
                        </Badge>
                      )}
                      {purchase.source && (
                        <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                          {purchase.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg mb-4">
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
                  <div className="text-sm text-white/60">Lifetime</div>
                </div>
              </div>

              {/* Content Items Preview */}
              {purchase.items && purchase.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/80 mb-2 flex items-center">
                    <Package className="h-4 w-4 mr-1" />
                    Content ({purchase.items.length} items)
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {purchase.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {getContentIcon(item.contentType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{item.title}</p>
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
                    View Content
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
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href={`/purchase-success?session_id=${purchase.id}`}>
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-200">Lifetime Access Guaranteed</h4>
            <p className="text-sm text-blue-200/80 mt-1">
              All your purchases include lifetime access. You can download and re-download your content anytime.
              {purchases.some((p) => p.anonymousAccess) && " Guest purchases are automatically saved for easy access."}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
       @keyframes fadeInUp {
         from {
           opacity: 0;
           transform: translateY(20px);
         }
         to {
           opacity: 1;
           transform: translateY(0);
         }
       }
     `}</style>
    </div>
  )
}
