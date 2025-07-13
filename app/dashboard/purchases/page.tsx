"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingBag,
  Eye,
  DollarSign,
  Package,
  User,
  FileText,
  Video,
  Music,
  ImageIcon,
  AlertCircle,
  RefreshCw,
  Star,
  CheckCircle,
  Infinity,
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
        return <FileText className="h-4 w-4 text-orange-500" />
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          <Card>
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
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
          <p className="text-muted-foreground">Access your purchased content and downloads</p>
        </div>

        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4">
          <Button onClick={fetchPurchases}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline">
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
          <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
          <p className="text-muted-foreground">Access your purchased content and downloads</p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Purchases Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't made any purchases yet. Explore our premium content library to find amazing content from
              talented creators.
            </p>
            <div className="space-y-3">
              <Button asChild>
                <Link href="/dashboard/explore">
                  <Star className="w-4 h-4 mr-2" />
                  Explore Premium Content
                </Link>
              </Button>
              <Button asChild variant="outline">
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
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-muted-foreground">
          {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
        </p>
      </div>

      {/* Purchases */}
      <div className="space-y-6">
        {purchases.map((purchase) => (
          <div key={purchase.id} className="flex gap-6">
            {/* Thumbnail */}
            <div className="w-64 h-48 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {purchase.productBoxThumbnail ? (
                <img
                  src={purchase.productBoxThumbnail || "/placeholder.svg"}
                  alt={purchase.productBoxTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=192&width=256&text=No+Image"
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <Card>
                <CardContent className="p-6">
                  {/* Tabs */}
                  <Tabs defaultValue="active" className="mb-6">
                    <TabsList className="grid w-fit grid-cols-2">
                      <TabsTrigger value="active" className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </TabsTrigger>
                      <TabsTrigger value="guest">Guest Access</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Purchase Info */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{purchase.productBoxTitle}</h2>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {purchase.creatorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />${purchase.amount.toFixed(2)}{" "}
                        {purchase.currency.toUpperCase()}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{purchase.totalItems || purchase.items?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{formatFileSize(purchase.totalSize || 0)}</div>
                        <div className="text-sm text-muted-foreground">Total Size</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold flex items-center justify-center">
                          <Infinity className="h-6 w-6" />
                        </div>
                        <div className="text-sm text-muted-foreground">Lifetime</div>
                      </div>
                    </div>

                    {/* Content Items */}
                    {purchase.items && purchase.items.length > 0 && (
                      <div className="space-y-2 mb-6">
                        {purchase.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-muted">
                              {getContentIcon(item.contentType)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 w-48">
              <Button asChild className="w-full">
                <Link href={`/product-box/${purchase.productBoxId}/content`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Content
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href={`/creator/${purchase.creatorUsername}`}>
                  <User className="w-4 h-4 mr-2" />
                  Creator Profile
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Lifetime Access Info */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Lifetime Access Guaranteed</h3>
              <p className="text-blue-800 text-sm">
                All your purchases include lifetime access. You can download and re-download your content anytime. Guest
                purchases are automatically saved for easy access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
