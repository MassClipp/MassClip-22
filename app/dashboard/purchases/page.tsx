"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  AlertCircle,
  Search,
  Package,
  Calendar,
  ExternalLink,
  Play,
  Download,
  Eye,
  Heart,
  Star,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Clock,
  DollarSign,
  FileVideo,
  Music,
  ImageIcon,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Purchase {
  id: string
  title?: string
  description?: string
  price: number
  currency: string
  status: string
  createdAt: any
  updatedAt: any
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
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.status}`)
      }

      const data = await response.json()

      // Enhanced purchase normalization with additional fields
      const normalizedPurchases = (data.purchases || []).map((purchase: any) => ({
        id: purchase.id || "",
        title: purchase.title || purchase.metadata?.title || "Untitled Purchase",
        description: purchase.description || purchase.metadata?.description || "",
        price: purchase.price || 0,
        currency: purchase.currency || "usd",
        status: purchase.status || "completed",
        createdAt: purchase.createdAt || new Date(),
        updatedAt: purchase.updatedAt || new Date(),
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
    } catch (err) {
      console.error("Error fetching purchases:", err)
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
    if (type === "bundle") return <Package className="h-5 w-5" />
    if (type === "subscription") return <Calendar className="h-5 w-5" />

    switch (contentType) {
      case "video":
        return <FileVideo className="h-5 w-5" />
      case "audio":
        return <Music className="h-5 w-5" />
      case "image":
        return <ImageIcon className="h-5 w-5" />
      default:
        return <Play className="h-5 w-5" />
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 pt-16">
          <div className="h-full w-full overflow-y-auto">
            {/* Header Skeleton */}
            <div className="w-full px-8 py-12 border-b border-white/10 bg-black/20 backdrop-blur-xl">
              <Skeleton className="h-16 w-80 mb-8 bg-white/10" />
              <div className="flex gap-8 mb-8">
                <Skeleton className="h-12 w-32 bg-white/10" />
                <Skeleton className="h-12 w-32 bg-white/10" />
                <Skeleton className="h-12 w-32 bg-white/10" />
              </div>
              <div className="flex gap-4 mb-8">
                <Skeleton className="h-14 flex-1 bg-white/10" />
                <Skeleton className="h-14 w-40 bg-white/10" />
                <Skeleton className="h-14 w-40 bg-white/10" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <Skeleton className="h-48 w-full bg-white/10" />
                    <div className="p-6">
                      <Skeleton className="h-6 w-full mb-3 bg-white/10" />
                      <Skeleton className="h-4 w-24 mb-4 bg-white/10" />
                      <div className="flex gap-2">
                        <Skeleton className="h-10 flex-1 bg-white/10" />
                        <Skeleton className="h-10 w-10 bg-white/10" />
                      </div>
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

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 pt-16">
          <div className="h-full w-full overflow-y-auto px-8 py-12">
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
            <Button
              onClick={fetchPurchases}
              className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              variant="default"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 pt-16">
        <div className="h-full w-full overflow-y-auto">
          {/* Premium Header Section */}
          <div className="w-full px-8 py-12 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                    My Collection
                  </h1>
                  <p className="text-white/60 text-lg">
                    {purchases.length} premium content items • $
                    {purchases.reduce((sum, p) => sum + p.price, 0).toFixed(2)} total value
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-10 w-10 p-0",
                      viewMode === "grid"
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10",
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
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10",
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Enhanced Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="mb-8">
                <TabsList className="bg-white/10 backdrop-blur-sm border-0 h-14 p-1">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 h-12 px-6 text-base font-medium"
                  >
                    All Items
                  </TabsTrigger>
                  <TabsTrigger
                    value="downloads"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 h-12 px-6 text-base font-medium"
                  >
                    Downloads
                  </TabsTrigger>
                  <TabsTrigger
                    value="favorites"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 h-12 px-6 text-base font-medium"
                  >
                    Favorites
                  </TabsTrigger>
                  <TabsTrigger
                    value="recent"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 h-12 px-6 text-base font-medium"
                  >
                    Recent
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Enhanced Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 h-5 w-5" />
                  <Input
                    placeholder="Search your collection..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-14 text-lg rounded-xl focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 backdrop-blur-sm"
                  />
                </div>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-48 h-14 bg-white/10 border-white/20 text-white rounded-xl backdrop-blur-sm">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 border-white/20 backdrop-blur-xl">
                    <SelectItem value="date">Date Added</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                  <SelectTrigger className="w-48 h-14 bg-white/10 border-white/20 text-white rounded-xl backdrop-blur-sm">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800/95 border-white/20 backdrop-blur-xl">
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

          {/* Premium Content Section */}
          <div className="w-full p-8">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                {filteredAndSortedPurchases.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    className="flex items-center justify-center min-h-96"
                  >
                    <div className="max-w-md mx-auto text-center">
                      <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm">
                        <Package className="h-16 w-16 text-white/40" />
                      </div>
                      <h3 className="text-3xl font-bold mb-4 text-white">
                        {searchQuery
                          ? "No matches found"
                          : activeTab === "favorites"
                            ? "No favorites yet"
                            : activeTab === "recent"
                              ? "No recent activity"
                              : "Your collection awaits"}
                      </h3>
                      <p className="text-white/60 mb-8 text-lg leading-relaxed">
                        {searchQuery
                          ? "Try adjusting your search or filters to discover your content."
                          : "Start building your premium content library with exclusive downloads and bundles."}
                      </p>
                      {!searchQuery && (
                        <Button
                          asChild
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-14 px-8 text-lg font-medium rounded-xl"
                        >
                          <Link href="/dashboard/explore">
                            <ExternalLink className="h-5 w-5 mr-2" />
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
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAndSortedPurchases.map((purchase, index) => (
                          <motion.div
                            key={purchase.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <div className="bg-white/5 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-500 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
                              {/* Enhanced Thumbnail */}
                              <div className="relative aspect-video overflow-hidden">
                                {getThumbnailUrl(purchase) ? (
                                  <img
                                    src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                                    alt={purchase.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
                                    {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                  </div>
                                )}

                                {/* Overlay with actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => handleDownload(purchase)}
                                      size="sm"
                                      className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      asChild
                                      size="sm"
                                      className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                                    >
                                      <Link
                                        href={
                                          purchase.type === "bundle"
                                            ? `/bundles/${purchase.bundleId}`
                                            : `/product-box/${purchase.productBoxId}/content`
                                        }
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </div>
                                </div>

                                {/* Status badges */}
                                <div className="absolute top-3 left-3 flex gap-2">
                                  <Badge className="bg-black/50 text-white border-0 backdrop-blur-sm">
                                    {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                    <span className="ml-1 capitalize">
                                      {purchase.metadata?.contentType || purchase.type}
                                    </span>
                                  </Badge>
                                </div>

                                {/* Favorite button */}
                                <Button
                                  onClick={() => toggleFavorite(purchase.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="absolute top-3 right-3 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                                >
                                  <Heart
                                    className={cn(
                                      "h-4 w-4 transition-colors",
                                      purchase.isFavorite ? "fill-red-500 text-red-500" : "text-white",
                                    )}
                                  />
                                </Button>

                                {/* Progress bar for downloads */}
                                {purchase.downloadProgress && purchase.downloadProgress > 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <Progress value={purchase.downloadProgress} className="h-1 bg-white/20" />
                                  </div>
                                )}
                              </div>

                              {/* Enhanced Content */}
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="text-lg font-semibold text-white line-clamp-2 leading-tight">
                                    {purchase.title}
                                  </h3>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/60 hover:text-white"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-slate-800/95 border-white/20 backdrop-blur-xl">
                                      <DropdownMenuItem className="text-white hover:bg-white/10">
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Share
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-2 mb-4">
                                  <span className="text-white/60 text-sm">{purchase.creatorUsername}</span>
                                  {purchase.rating && purchase.rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-yellow-400 text-xs font-medium">{purchase.rating}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDate(purchase.createdAt)}</span>
                                  </div>
                                  {purchase.metadata?.duration && (
                                    <div className="flex items-center gap-1">
                                      <Play className="h-3 w-3" />
                                      <span>{formatDuration(purchase.metadata.duration)}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-white font-semibold">
                                    <DollarSign className="h-4 w-4" />
                                    <span>{purchase.price.toFixed(2)}</span>
                                  </div>
                                  {purchase.metadata?.contentCount && (
                                    <Badge variant="secondary" className="bg-white/10 text-white/80 border-0">
                                      {purchase.metadata.contentCount} items
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredAndSortedPurchases.map((purchase, index) => (
                          <motion.div
                            key={purchase.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="group"
                          >
                            <div className="bg-white/5 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:bg-white/10">
                              <div className="flex items-center p-6">
                                {/* List view thumbnail */}
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 mr-6">
                                  {getThumbnailUrl(purchase) ? (
                                    <img
                                      src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                                      alt={purchase.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-pink-600/20">
                                      {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-xl font-semibold text-white mb-1 truncate">
                                        {purchase.title}
                                      </h3>
                                      <p className="text-white/60 text-sm mb-2">{purchase.creatorUsername}</p>
                                      <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span>{formatDate(purchase.createdAt)}</span>
                                        {purchase.metadata?.duration && (
                                          <span>{formatDuration(purchase.metadata.duration)}</span>
                                        )}
                                        {purchase.metadata?.contentCount && (
                                          <span>{purchase.metadata.contentCount} items</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 ml-6">
                                      <Button
                                        onClick={() => toggleFavorite(purchase.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-10 w-10 p-0 text-white/60 hover:text-white"
                                      >
                                        <Heart
                                          className={cn(
                                            "h-4 w-4 transition-colors",
                                            purchase.isFavorite ? "fill-red-500 text-red-500" : "text-white/60",
                                          )}
                                        />
                                      </Button>
                                      <Button
                                        onClick={() => handleDownload(purchase)}
                                        variant="outline"
                                        className="border-white/20 hover:bg-white/10 bg-transparent text-white h-10 px-4"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </Button>
                                      <Button
                                        asChild
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-10 px-4"
                                      >
                                        <Link
                                          href={
                                            purchase.type === "bundle"
                                              ? `/bundles/${purchase.bundleId}`
                                              : `/product-box/${purchase.productBoxId}/content`
                                          }
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View
                                        </Link>
                                      </Button>
                                      <span className="text-xl font-semibold text-white ml-2">
                                        ${purchase.price.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
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
