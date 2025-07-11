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
  Download,
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
  displaySize: string
  displayDuration?: string
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
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      const idToken = await user?.getIdToken()
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Please log in to view your purchases</h2>
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
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
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load purchases: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-muted-foreground">Access all your purchased content and download your files</p>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No purchases yet</h2>
            <p className="text-muted-foreground mb-6">
              When you purchase content, it will appear here for easy access.
            </p>
            <Button asChild>
              <Link href="/dashboard/explore">Explore Content</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {purchase.productBoxThumbnail ? (
                      <img
                        src={purchase.productBoxThumbnail || "/placeholder.svg"}
                        alt={purchase.productBoxTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Purchase Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 truncate">{purchase.productBoxTitle}</h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{purchase.productBoxDescription}</p>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {purchase.creatorName}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)}{" "}
                        {purchase.currency.toUpperCase()}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Content Summary */}
                    <div className="flex items-center space-x-4 text-sm">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Package className="h-3 w-3" />
                        <span>{purchase.totalItems} items</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Download className="h-3 w-3" />
                        <span>{Math.round(purchase.totalSize / (1024 * 1024))} MB</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <Button asChild size="sm">
                      <Link href={`/product-box/${purchase.productBoxId}/content`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Content
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Content Items Preview */}
                {purchase.items.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Content Items ({purchase.items.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {purchase.items.slice(0, 6).map((item) => (
                        <div key={item.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded text-sm">
                          <div className="flex-shrink-0 text-gray-400">{getContentIcon(item.contentType)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{item.displaySize}</span>
                              {item.displayDuration && (
                                <>
                                  <span>•</span>
                                  <span>{item.displayDuration}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {purchase.items.length > 6 && (
                        <div className="flex items-center justify-center p-2 bg-gray-50 rounded text-sm text-gray-500">
                          +{purchase.items.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
