"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  HardDrive,
} from "lucide-react"
import Link from "next/link"

interface BundleData {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  fileSize: number
  duration?: number
  fileType: string
  downloadCount: number
  creatorId: string
  createdAt: any
  downloadUrl: string
}

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
  bundleId?: string
  itemId?: string
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
  bundleData?: BundleData
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPurchases()
  }, [user])

  const fetchBundleData = async (bundleId: string): Promise<BundleData | null> => {
    try {
      console.log(`🔍 [Purchases] Fetching bundle data for: ${bundleId}`)

      const response = await fetch(`/api/bundles/${bundleId}`, {
        credentials: "include",
      })

      if (response.ok) {
        const bundleData = await response.json()
        console.log(`✅ [Purchases] Bundle data fetched:`, bundleData)
        return bundleData
      } else {
        console.warn(`⚠️ [Purchases] Failed to fetch bundle data for ${bundleId}:`, response.status)
        return null
      }
    } catch (error) {
      console.error(`❌ [Purchases] Error fetching bundle data for ${bundleId}:`, error)
      return null
    }
  }

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 [Purchases] Fetching purchases...")

      // Try to fetch anonymous purchases first (no auth required)
      const anonymousResponse = await fetch("/api/user/anonymous-purchases", {
        credentials: "include",
      })

      if (anonymousResponse.ok) {
        const anonymousData = await anonymousResponse.json()
        console.log("📦 [Purchases] Anonymous purchases response:", anonymousData)

        if (anonymousData.purchases && anonymousData.purchases.length > 0) {
          // The anonymous API now returns fully enriched purchases with bundle data
          setPurchases(anonymousData.purchases)
          setLoading(false)
          return
        }
      }

      // If user is authenticated, try to fetch authenticated purchases
      if (user) {
        console.log("👤 [Purchases] Fetching authenticated purchases...")
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
        console.log("📦 [Purchases] Authenticated purchases response:", data)

        // Process and enrich authenticated purchases with bundle data
        const enrichedPurchases = await Promise.all(
          (data.purchases || []).map(async (purchase: Purchase) => {
            const bundleId = purchase.bundleId || purchase.itemId || purchase.productBoxId

            if (bundleId && !purchase.bundleData) {
              const bundleData = await fetchBundleData(bundleId)

              if (bundleData) {
                purchase.bundleData = bundleData
                purchase.productBoxTitle = bundleData.title || purchase.productBoxTitle
                purchase.productBoxDescription = bundleData.description || purchase.productBoxDescription
                purchase.productBoxThumbnail = bundleData.thumbnailUrl || purchase.productBoxThumbnail
                purchase.totalItems = 1
                purchase.totalSize = bundleData.fileSize || 0

                if (bundleData.downloadUrl) {
                  const contentType = getContentTypeFromFileType(bundleData.fileType)
                  purchase.items = [
                    {
                      id: bundleData.id,
                      title: bundleData.title,
                      fileUrl: bundleData.downloadUrl,
                      thumbnailUrl: bundleData.thumbnailUrl,
                      fileSize: bundleData.fileSize,
                      duration: bundleData.duration,
                      contentType: contentType,
                    },
                  ]
                }
              }
            }

            return purchase
          }),
        )

        setPurchases(enrichedPurchases)
      } else {
        // No user and no anonymous purchases
        setPurchases([])
      }
    } catch (err: any) {
      console.error("❌ [Purchases] Error fetching purchases:", err)
      setError(err.message)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const getContentTypeFromFileType = (fileType: string): "video" | "audio" | "image" | "document" => {
    if (!fileType) return "document"

    const type = fileType.toLowerCase()
    if (type.includes("video") || type.includes("mp4") || type.includes("mov") || type.includes("avi")) {
      return "video"
    } else if (type.includes("audio") || type.includes("mp3") || type.includes("wav")) {
      return "audio"
    } else if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("gif")) {
      return "image"
    }
    return "document"
  }

  const togglePurchaseExpansion = (purchaseId: string) => {
    setExpandedPurchases((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(purchaseId)) {
        newSet.delete(purchaseId)
      } else {
        newSet.add(purchaseId)
      }
      return newSet
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return ""
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

  const getFileTypeIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type.includes("video")) return <Video className="h-4 w-4 text-blue-500" />
    if (type.includes("audio")) return <Music className="h-4 w-4 text-green-500" />
    if (type.includes("image")) return <ImageIcon className="h-4 w-4 text-purple-500" />
    return <FileText className="h-4 w-4 text-gray-500" />
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
        {purchases.map((purchase, index) => {
          const isExpanded = expandedPurchases.has(purchase.id)
          const bundleData = purchase.bundleData

          return (
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
                    {purchase.productBoxThumbnail || bundleData?.thumbnailUrl ? (
                      <img
                        src={purchase.productBoxThumbnail || bundleData?.thumbnailUrl || "/placeholder.svg"}
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
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                          {bundleData?.title || purchase.productBoxTitle}
                        </h3>
                        <p className="text-white/70 text-sm mb-2 line-clamp-2">
                          {bundleData?.description || purchase.productBoxDescription}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-white/60">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {purchase.creatorName || "Unknown Creator"}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)}{" "}
                            {purchase.currency.toUpperCase()}
                          </span>
                          {purchase.anonymousAccess && (
                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                              Anonymous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {purchase.totalItems || purchase.items?.length || 1}
                    </div>
                    <div className="text-sm text-white/60">Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {formatFileSize(bundleData?.fileSize || purchase.totalSize || 0)}
                    </div>
                    <div className="text-sm text-white/60">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">∞</div>
                    <div className="text-sm text-white/60">Lifetime</div>
                  </div>
                </div>

                {/* Enhanced Bundle Details */}
                {bundleData && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-white flex items-center">
                        {getFileTypeIcon(bundleData.fileType)}
                        <span className="ml-2">Bundle Details</span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center text-white/80">
                          <FileText className="h-4 w-4 mr-2" />
                          <span className="font-medium">Type:</span>
                          <span className="ml-1 text-white/60">{bundleData.fileType}</span>
                        </div>
                        {bundleData.duration && (
                          <div className="flex items-center text-white/80">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-medium">Duration:</span>
                            <span className="ml-1 text-white/60">{formatDuration(bundleData.duration)}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-white/80">
                          <HardDrive className="h-4 w-4 mr-2" />
                          <span className="font-medium">Size:</span>
                          <span className="ml-1 text-white/60">{formatFileSize(bundleData.fileSize)}</span>
                        </div>
                        <div className="flex items-center text-white/80">
                          <Download className="h-4 w-4 mr-2" />
                          <span className="font-medium">Downloads:</span>
                          <span className="ml-1 text-white/60">{bundleData.downloadCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsible Content Items */}
                {purchase.items && purchase.items.length > 0 && (
                  <Collapsible open={isExpanded} onOpenChange={() => togglePurchaseExpansion(purchase.id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-0 h-auto text-white/80 hover:text-white hover:bg-white/5 mb-2"
                      >
                        <h4 className="text-sm font-semibold flex items-center">
                          <Package className="h-4 w-4 mr-1" />
                          Content ({purchase.items.length} items)
                        </h4>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mb-4">
                      <div className="max-h-48 overflow-y-auto">
                        {purchase.items.map((item) => (
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
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10 flex-1"
                  >
                    <Link href={`/product-box/${purchase.bundleId || purchase.productBoxId}/content`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Content
                    </Link>
                  </Button>
                  {purchase.creatorUsername && (
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
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
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
