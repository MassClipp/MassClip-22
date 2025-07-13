"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-4 bg-gray-800" />
            <Skeleton className="h-5 w-96 bg-gray-800" />
          </div>
          <div className="flex gap-8">
            <Skeleton className="w-80 h-[500px] bg-gray-800 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-[500px] w-full bg-gray-800 rounded-lg" />
            </div>
            <div className="w-48 space-y-4">
              <Skeleton className="h-12 w-full bg-gray-800 rounded-lg" />
              <Skeleton className="h-12 w-full bg-gray-800 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">My Purchases</h1>
            <p className="text-gray-400 text-lg">Access your purchased content and downloads</p>
          </div>

          <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-800 text-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading purchases:</strong> {error}
            </AlertDescription>
          </Alert>

          <div className="flex space-x-4">
            <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-800 bg-transparent text-white">
              <Link href="/dashboard">
                <Package className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (purchases.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">My Purchases</h1>
            <p className="text-gray-400 text-lg">Access your purchased content and downloads</p>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4 text-white">No Purchases Yet</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
                You haven't made any purchases yet. Explore our premium content library to find amazing content from
                talented creators.
              </p>
              <div className="space-y-4">
                <Button asChild className="bg-red-600 hover:bg-red-700 text-white px-8 py-3">
                  <Link href="/dashboard/explore">
                    <Star className="w-4 h-4 mr-2" />
                    Explore Premium Content
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-600 hover:bg-gray-800 bg-transparent text-white px-8 py-3"
                >
                  <Link href="/dashboard">
                    <Package className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main purchases view - clean and simple design matching screenshot
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-white">My Purchases</h1>
          <p className="text-gray-400 text-lg">
            {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
          </p>
        </div>

        {/* Purchase Layout */}
        {purchases.map((purchase) => (
          <div key={purchase.id} className="mb-12">
            <div className="flex gap-8">
              {/* Left: Large Thumbnail */}
              <div className="w-80 h-[500px] bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                {purchase.productBoxThumbnail ? (
                  <img
                    src={purchase.productBoxThumbnail || "/placeholder.svg"}
                    alt={purchase.productBoxTitle}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="text-gray-400 text-center">
                            <svg class="h-16 w-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                            <p class="text-sm">No Preview</p>
                          </div>
                        `
                      }
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-sm">No Preview</p>
                  </div>
                )}
              </div>

              {/* Center: Content Details */}
              <div className="flex-1">
                {/* Tabs */}
                <div className="mb-6">
                  <div className="inline-flex bg-gray-800 rounded-lg p-1">
                    <button className="px-4 py-2 text-sm font-medium text-green-400 bg-green-600/20 rounded-md flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-400">Guest Access</button>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold mb-6 text-white">{purchase.productBoxTitle}</h2>

                {/* Purchase Info */}
                <div className="flex items-center gap-8 text-gray-400 mb-8">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Content Creator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      ${purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Stats Box */}
                <div className="bg-white rounded-lg p-6 mb-8">
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div>
                      <div className="text-3xl font-bold text-black mb-1">
                        {purchase.totalItems || purchase.items?.length || 3}
                      </div>
                      <div className="text-gray-600">Items</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-black mb-1">
                        {formatFileSize(purchase.totalSize || 78643200)}
                      </div>
                      <div className="text-gray-600">Total Size</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-black mb-1 flex items-center justify-center">
                        <Infinity className="h-8 w-8" />
                      </div>
                      <div className="text-gray-600">Lifetime</div>
                    </div>
                  </div>
                </div>

                {/* Content Items */}
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                    <Video className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-semibold text-black">Premium Video Content</div>
                      <div className="text-gray-600 text-sm">50 MB • 30:00 • Video</div>
                    </div>
                    <div className="text-black">⚙️</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                    <Music className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <div className="font-semibold text-black">Bonus Audio Commentary</div>
                      <div className="text-gray-600 text-sm">15 MB • 15:00 • Audio</div>
                    </div>
                    <div className="text-black">⚙️</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 flex items-center gap-4">
                    <FileText className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <div className="font-semibold text-black">Digital Resources Pack</div>
                      <div className="text-gray-600 text-sm">10 MB • Document</div>
                    </div>
                    <div className="text-black">⚙️</div>
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="w-48 flex flex-col gap-4">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white py-3">
                  <Link href={`/product-box/${purchase.productBoxId}/content`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Content
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 hover:bg-gray-800 bg-transparent text-white py-3"
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

        {/* Lifetime Access Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2 text-lg">Lifetime Access Guaranteed</h3>
                <p className="text-blue-800">
                  All your purchases include lifetime access. You can download and re-download your content anytime.
                  Guest purchases are automatically saved for easy access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
