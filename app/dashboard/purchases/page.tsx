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
  Calendar,
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
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2 bg-gray-800" />
          <Skeleton className="h-4 w-96 bg-gray-800" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="w-80 h-96 bg-gray-800" />
          <div className="flex-1">
            <Skeleton className="h-96 w-full bg-gray-800" />
          </div>
          <div className="w-48">
            <Skeleton className="h-12 w-full mb-3 bg-gray-800" />
            <Skeleton className="h-12 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
          <p className="text-gray-400">Access your purchased content and downloads</p>
        </div>

        <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4">
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-800 bg-transparent">
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
      <div className="min-h-screen bg-black text-white p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
          <p className="text-gray-400">Access your purchased content and downloads</p>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">No Purchases Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
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
              <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-800 bg-transparent">
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

  // Main purchases view - matching the original screenshot design
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-gray-400">
          {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
        </p>
      </div>

      {/* Main Layout - exactly like original screenshot */}
      {purchases.map((purchase) => (
        <div key={purchase.id} className="mb-8">
          <div className="flex gap-6">
            {/* Left: Large Thumbnail */}
            <div className="w-80 h-96 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
              {purchase.productBoxThumbnail ? (
                <img
                  src={purchase.productBoxThumbnail || "/placeholder.svg"}
                  alt={purchase.productBoxTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=384&width=320&text=No+Image"
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <Package className="h-16 w-16 mx-auto mb-2" />
                  <p className="text-sm">No Preview</p>
                </div>
              )}
            </div>

            {/* Center: Main Content */}
            <div className="flex-1">
              {/* Tabs */}
              <div className="mb-6">
                <Tabs defaultValue="active" className="w-fit">
                  <TabsList className="bg-gray-800/50 border border-gray-700">
                    <TabsTrigger
                      value="active"
                      className="flex items-center gap-2 text-green-400 data-[state=active]:bg-green-600/20"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </TabsTrigger>
                    <TabsTrigger value="guest" className="text-gray-400">
                      Guest Access
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold mb-4 text-white">{purchase.productBoxTitle}</h2>

              {/* Purchase Details */}
              <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Content Creator
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(purchase.purchasedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 text-green-400 font-medium">
                  <DollarSign className="h-4 w-4" />${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                </span>
              </div>

              {/* Stats Box */}
              <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {purchase.totalItems || purchase.items?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{formatFileSize(purchase.totalSize || 0)}</div>
                    <div className="text-sm text-gray-400">Total Size</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold flex items-center justify-center text-white">
                      <Infinity className="h-6 w-6" />
                    </div>
                    <div className="text-sm text-gray-400">Lifetime</div>
                  </div>
                </div>
              </div>

              {/* Content Items List */}
              {purchase.items && purchase.items.length > 0 && (
                <div className="space-y-3">
                  {purchase.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg bg-gray-800/20"
                    >
                      <div className="w-8 h-8 rounded flex items-center justify-center">
                        {getContentIcon(item.contentType)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{item.title}</div>
                        <div className="text-sm text-gray-400">
                          {formatFileSize(item.fileSize)}
                          {item.duration && item.duration > 0 && (
                            <>
                              {" • "}
                              {formatDuration(item.duration)}
                            </>
                          )}
                          {" • "}
                          <span className="capitalize">{item.contentType}</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center">
                        <span className="text-lg">⚙️</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="w-48 flex flex-col gap-3">
              <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                <Link href={`/product-box/${purchase.productBoxId}/content`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Content
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-800 bg-transparent text-white"
              >
                <Link href={`/creator/${purchase.creatorUsername}`}>
                  <User className="w-4 h-4 mr-2" />
                  Creator Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Lifetime Access Info Box */}
      <Card className="border-blue-600 bg-blue-900/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">Lifetime Access Guaranteed</h3>
              <p className="text-blue-200 text-sm">
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
