"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  Search,
  Package,
  Calendar,
  ExternalLink,
  Play,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  FileVideo,
  Music,
  ImageIcon,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import PurchasesCollectionDisplay from "@/components/purchases-collection-display"

interface Purchase {
  id: string
  title?: string
  description?: string
  price: number
  currency: string
  status: string
  createdAt: any
  updatedAt: any
  purchasedAt?: any
  productBoxId?: string
  bundleId?: string
  creatorId?: string
  creatorUsername?: string
  type?: "product_box" | "bundle" | "subscription"
  downloadUrl?: string
  thumbnailUrl?: string
  isFavorite?: boolean
  rating?: number
  downloadProgress?: number
  lastAccessed?: Date
  metadata?: {
    title?: string
    description?: string
    contentCount?: number
    thumbnailUrl?: string
    duration?: number
    fileSize?: string
    contentType?: "video" | "audio" | "image" | "bundle"
    [key: string]: any
  }
}

type TabType = "all" | "downloads" | "favorites" | "recent"
type ViewMode = "grid" | "list"
type SortOption = "date" | "price" | "title" | "creator"
type FilterOption = "all" | "video" | "audio" | "image" | "bundle"

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("date")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")

  useEffect(() => {
    if (user) {
      fetchPurchases()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("🔄 [Purchases Page] Starting fetch...")

      if (!user) {
        console.log("❌ [Purchases Page] No user found")
        setError("Please log in to view your purchases")
        return
      }

      const token = await user.getIdToken()
      console.log("🔑 [Purchases Page] Got auth token")

      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 [Purchases Page] API response status:", response.status)

      if (!response.ok) {
        if (response.status === 404) {
          console.log("ℹ️ [Purchases Page] No purchases found (404)")
          setPurchases([])
          return
        }
        const errorText = await response.text()
        console.error("❌ [Purchases Page] API error:", errorText)
        throw new Error(`Failed to fetch purchases: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("📦 [Purchases Page] API response data:", data)

      // Handle case where API returns success but no purchases
      const purchasesArray = data.purchases || []
      console.log(`📊 [Purchases Page] Processing ${purchasesArray.length} purchases`)

      // Enhanced purchase normalization with additional fields
      const normalizedPurchases = purchasesArray.map((purchase: any) => ({
        id: purchase.id || "",
        title: purchase.title || purchase.metadata?.title || "Untitled Purchase",
        description: purchase.description || purchase.metadata?.description || "",
        price: purchase.price || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        createdAt: purchase.createdAt || purchase.purchasedAt || new Date(),
        updatedAt: purchase.updatedAt || new Date(),
        purchasedAt: purchase.purchasedAt || purchase.createdAt || new Date(),
        productBoxId: purchase.productBoxId || null,
        bundleId: purchase.bundleId || null,
        creatorId: purchase.creatorId || "",
        creatorUsername: purchase.creatorUsername || "Unknown Creator",
        type: purchase.type || "product_box",
        downloadUrl: purchase.downloadUrl || "",
        thumbnailUrl: purchase.thumbnailUrl || purchase.metadata?.thumbnailUrl || "",
        isFavorite: purchase.isFavorite || false,
        rating: purchase.rating || 0,
        downloadProgress: purchase.downloadProgress || 0,
        lastAccessed: purchase.lastAccessed ? new Date(purchase.lastAccessed) : null,
        metadata: {
          ...purchase.metadata,
          contentCount: purchase.metadata?.contentCount || 0,
          thumbnailUrl: purchase.metadata?.thumbnailUrl || purchase.thumbnailUrl || "",
          duration: purchase.metadata?.duration || 0,
          fileSize: purchase.metadata?.fileSize || "Unknown",
          contentType: purchase.metadata?.contentType || "video",
        },
      }))

      setPurchases(normalizedPurchases)
      console.log(`✅ [Purchases Page] Loaded ${normalizedPurchases.length} purchases`)
    } catch (err) {
      console.error("❌ [Purchases Page] Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (purchase: Purchase) => {
    try {
      const token = await user.getIdToken()
      const endpoint =
        purchase.type === "bundle"
          ? `/api/bundles/${purchase.bundleId}/download`
          : `/api/product-box/${purchase.productBoxId}/direct-content`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download content")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${purchase.title || "content"}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `${purchase.title} is being downloaded.`,
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleFavorite = async (purchaseId: string) => {
    setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? { ...p, isFavorite: !p.isFavorite } : p)))

    toast({
      title: "Updated favorites",
      description: "Your favorites have been updated.",
    })
  }

  const filteredAndSortedPurchases = purchases
    .filter((purchase) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        (purchase.title && purchase.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.description && purchase.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.creatorUsername && purchase.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()))

      // Tab filter
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "downloads" && purchase.status === "completed") ||
        (activeTab === "favorites" && purchase.isFavorite) ||
        (activeTab === "recent" &&
          purchase.lastAccessed &&
          new Date().getTime() - purchase.lastAccessed.getTime() < 7 * 24 * 60 * 60 * 1000)

      // Content type filter
      const matchesFilter =
        filterBy === "all" ||
        purchase.metadata?.contentType === filterBy ||
        (filterBy === "bundle" && purchase.type === "bundle")

      return matchesSearch && matchesTab && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "price":
          return b.price - a.price
        case "title":
          return (a.title || "").localeCompare(b.title || "")
        case "creator":
          return (a.creatorUsername || "").localeCompare(b.creatorUsername || "")
        default:
          return 0
      }
    })

  const getContentIcon = (type: string, contentType?: string) => {
    if (type === "bundle") return <Package className="h-4 w-4" />
    if (type === "subscription") return <Calendar className="h-4 w-4" />

    switch (contentType) {
      case "video":
        return <FileVideo className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <Play className="h-4 w-4" />
    }
  }

  const getThumbnailUrl = (purchase: Purchase) => {
    return (
      purchase.thumbnailUrl ||
      purchase.metadata?.thumbnailUrl ||
      (purchase.type === "bundle" ? `/api/bundles/${purchase.bundleId}/thumbnail` : null) ||
      (purchase.productBoxId ? `/api/product-box/${purchase.productBoxId}/thumbnail` : null)
    )
  }

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-white/10 text-white overflow-hidden">
        <div className="absolute inset-0 pt-16">
          <div className="h-full w-full overflow-y-auto">
            {/* Header Skeleton */}
            <div className="w-full px-8 py-8 border-b border-gray-700/30">
              <Skeleton className="h-12 w-80 mb-4 bg-gray-700/30" />
              <Skeleton className="h-6 w-64 mb-8 bg-gray-700/30" />
              <div className="flex gap-4 mb-8">
                <Skeleton className="h-10 w-24 bg-gray-700/30" />
                <Skeleton className="h-10 w-24 bg-gray-700/30" />
                <Skeleton className="h-10 w-24 bg-gray-700/30" />
                <Skeleton className="h-10 w-24 bg-gray-700/30" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-12 flex-1 bg-gray-700/30" />
                <Skeleton className="h-12 w-40 bg-gray-700/30" />
                <Skeleton className="h-12 w-40 bg-gray-700/30" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-800/30 rounded-lg overflow-hidden border border-gray-700/20">
                    <Skeleton className="h-48 w-full bg-gray-700/30" />
                    <div className="p-4">
                      <Skeleton className="h-5 w-full mb-2 bg-gray-700/30" />
                      <Skeleton className="h-4 w-20 mb-3 bg-gray-700/30" />
                      <Skeleton className="h-4 w-24 mb-2 bg-gray-700/30" />
                      <Skeleton className="h-4 w-16 bg-gray-700/30" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-white/10 text-white overflow-hidden">
        <div className="absolute inset-0 pt-16">
          <div className="h-full w-full overflow-y-auto px-8 py-8">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-700 bg-transparent">
                <Link href="/dashboard/explore">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Browse Content
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show not authenticated state
  if (!user) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-white/10 text-white overflow-hidden">
        <div className="absolute inset-0 pt-16">
          <div className="h-full w-full overflow-y-auto px-8 py-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="max-w-md mx-auto text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700/50">
                  <AlertCircle className="h-12 w-12 text-gray-500" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Authentication Required</h3>
                <p className="text-gray-400 mb-8 text-base">
                  Please log in to view your purchases and access your premium content.
                </p>
                <Button asChild className="bg-red-600 hover:bg-red-700 h-12 px-6">
                  <Link href="/login">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-white/10 relative overflow-hidden">
      {/* Enhanced gradient background with depth and subtle white accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-gray-900/70 to-white/5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-gray-800/60 to-white/8 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-black/95 via-gray-900/80 to-transparent pointer-events-none" />

      <div className="absolute inset-0 pt-16">
        <div className="h-full w-full overflow-y-auto">
          {/* Header Section */}
          <div className="w-full px-8 py-8 sticky top-0 z-20 bg-gradient-to-br from-black/95 via-gray-900/90 to-white/5 backdrop-blur-md border-b border-gray-700/20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">My Collection</h1>
                  <p className="text-gray-300 text-base">
                    {purchases.length} premium content items • $
                    {purchases.reduce((sum, p) => sum + p.price, 0).toFixed(2)} total value
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={fetchPurchases}
                    variant="ghost"
                    size="sm"
                    className="h-10 px-3 text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-10 w-10 p-0",
                      viewMode === "grid"
                        ? "bg-gray-700 text-white hover:bg-gray-600"
                        : "text-gray-400 hover:text-white hover:bg-gray-800",
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-10 w-10 p-0",
                      viewMode === "list"
                        ? "bg-gray-700 text-white hover:bg-gray-600"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50",
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-8 bg-gray-800/50 rounded-lg p-1 backdrop-blur-sm">
                {[
                  { value: "all", label: "All Items" },
                  { value: "downloads", label: "Downloads" },
                  { value: "favorites", label: "Favorites" },
                  { value: "recent", label: "Recent" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as TabType)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                      activeTab === tab.value
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search your collection..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-gray-800/50 border-gray-700/50 text-white placeholder:text-gray-400 h-12 rounded-lg focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                  />
                </div>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-48 h-12 bg-gray-800/50 border-gray-700/50 text-white rounded-lg focus:border-gray-600 focus:ring-1 focus:ring-gray-600">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date Added" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="date">Date Added</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                  <SelectTrigger className="w-48 h-12 bg-gray-800/50 border-gray-700/50 text-white rounded-lg focus:border-gray-600 focus:ring-1 focus:ring-gray-600">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="bundle">Bundles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          </div>

          {/* Content Section */}
          <div className="w-full p-8">
            <div className="max-w-7xl mx-auto relative z-10">
              <AnimatePresence mode="wait">
                {filteredAndSortedPurchases.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    className="flex items-center justify-center min-h-96 relative z-10"
                  >
                    <div className="max-w-md mx-auto text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700/50">
                        <Package className="h-12 w-12 text-gray-500" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-white">
                        {searchQuery
                          ? "No matches found"
                          : activeTab === "favorites"
                            ? "No favorites yet"
                            : activeTab === "recent"
                              ? "No recent activity"
                              : purchases.length === 0
                                ? "No purchases yet"
                                : "Your collection awaits"}
                      </h3>
                      <p className="text-gray-400 mb-8 text-base">
                        {searchQuery
                          ? "Try adjusting your search or filters to discover your content."
                          : purchases.length === 0
                            ? "Start building your premium content library with exclusive downloads and bundles."
                            : "Start exploring your content with the filters above."}
                      </p>
                      {!searchQuery && purchases.length === 0 && (
                        <Button asChild className="bg-red-600 hover:bg-red-700 h-12 px-6">
                          <Link href="/dashboard/explore">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Explore Premium Content
                          </Link>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
                  >
                    <PurchasesCollectionDisplay
                      purchases={filteredAndSortedPurchases}
                      viewMode={viewMode}
                      handleDownload={handleDownload}
                      toggleFavorite={toggleFavorite}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
