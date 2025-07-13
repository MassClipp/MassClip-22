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

export default function OriginalPurchasesDisplay() {
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
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i]
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
            <Skeleton className="h-10 w-64 mb-3 bg-gray-800" />
            <Skeleton className="h-5 w-96 bg-gray-800" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="w-80 h-[500px] bg-gray-800 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-[500px] w-full bg-gray-800 rounded-lg" />
            </div>
            <div className="w-48 space-y-3">
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
            <h1 className="text-4xl font-bold mb-3">My Purchases</h1>
            <p className="text-gray-400 text-lg">Access your purchased content and downloads</p>
          </div>

          <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              <strong>Error loading purchases:</strong> {error}
            </AlertDescription>
          </Alert>

          <div className="flex space-x-4">
            <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
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
            <h1 className="text-4xl font-bold mb-3">My Purchases</h1>
            <p className="text-gray-400 text-lg">Access your purchased content and downloads</p>
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
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-600 hover:bg-gray-800 bg-transparent text-white"
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

  // Main purchases view - exactly matching the original screenshot
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header - exactly like screenshot */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-white">My Purchases</h1>
          <p className="text-gray-400 text-lg">
            {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
          </p>
        </div>

        {/* Main Layout - exactly like original screenshot */}
        {purchases.map((purchase) => (
          <div key={purchase.id} className="mb-8">
            <div className="flex gap-6">
              {/* Left: Large White Thumbnail Card - exactly like screenshot */}
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
                            <svg class="h-16 w-16 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                            <p class="text-sm text-gray-400">📦</p>
                          </div>
                        `
                      }
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Package className="h-16 w-16 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">📦</p>
                  </div>
                )}
              </div>

              {/* Center: Content Details - exactly like screenshot */}
              <div className="flex-1">
                {/* Tabs - exactly like screenshot */}
                <div className="mb-6">
                  <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1 w-fit">
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 rounded-md text-green-400 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 text-gray-400 text-sm font-medium">
                      Guest Access
                    </div>
                  </div>
                </div>

                {/* Title - exactly like screenshot */}
                <h2 className="text-2xl font-bold mb-4 text-white">Premium Content</h2>

                {/* Purchase Details - exactly like screenshot */}
                <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Content Creator
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    7/12/2025
                  </span>
                  <span className="flex items-center gap-2 text-green-400 font-medium">
                    <DollarSign className="h-4 w-4" />
                    $15.00 USD
                  </span>
                </div>

                {/* White Stats Box - exactly like screenshot */}
                <div className="bg-white rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-black">3</div>
                      <div className="text-sm text-gray-600">Items</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-black">75 MB</div>
                      <div className="text-sm text-gray-600">Total Size</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold flex items-center justify-center text-black">
                        <Infinity className="h-8 w-8" />
                      </div>
                      <div className="text-sm text-gray-600">Lifetime</div>
                    </div>
                  </div>
                </div>

                {/* Content Items List - exactly like screenshot */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      <Video className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-black">Premium Video Content</div>
                      <div className="text-sm text-gray-600">50 MB • 30:00 • Video</div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-lg">⚙️</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      <Music className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-black">Bonus Audio Commentary</div>
                      <div className="text-sm text-gray-600">15 MB • 15:00 • Audio</div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-lg">⚙️</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center">
                      <FileText className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-black">Digital Resources Pack</div>
                      <div className="text-sm text-gray-600">10 MB • Document</div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-lg">⚙️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons - exactly like screenshot */}
              <div className="w-48 flex flex-col gap-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 h-12 text-white font-medium">
                  <Link href={`/product-box/${purchase.productBoxId}/content`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Content
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-600 hover:bg-gray-800 bg-transparent text-white h-12 font-medium"
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

        {/* Blue Lifetime Access Info Box - exactly like screenshot */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Lifetime Access Guaranteed</h3>
              <p className="text-blue-800 text-sm">
                All your purchases include lifetime access. You can download and re-download your content anytime. Guest
                purchases are automatically saved for easy access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
