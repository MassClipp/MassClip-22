"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
      const matchesSearch =
        searchQuery === "" ||
        (purchase.title && purchase.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.description && purchase.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.creatorUsername && purchase.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "downloads" && purchase.status === "completed") ||
        (activeTab === "favorites" && purchase.isFavorite) ||
        (activeTab === "recent" &&
          purchase.lastAccessed &&
          new Date().getTime() - purchase.lastAccessed.getTime() < 7 * 24 * 60 * 60 * 1000)

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white">
        <div className="pt-16 px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-12 w-80 mb-4 bg-gray-800" />
            <Skeleton className="h-6 w-64 mb-8 bg-gray-800" />
            <div className="flex gap-4 mb-8">
              <Skeleton className="h-10 w-24 bg-gray-800" />
              <Skeleton className="h-10 w-24 bg-gray-800" />
              <Skeleton className="h-10 w-24 bg-gray-800" />
              <Skeleton className="h-10 w-24 bg-gray-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden">
                  <Skeleton className="h-48 w-full bg-gray-700" />
                  <div className="p-4">
                    <Skeleton className="h-5 w-full mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-20 mb-3 bg-gray-700" />
                    <Skeleton className="h-4 w-24 bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white">
        <div className="pt-16 px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <Alert variant="destructive" className="bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={fetchPurchases} className="mt-4 bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white">
      {/* Top gradient overlay for depth */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      <div className="pt-16 relative z-20">
        {/* Header Section */}
        <div className="px-8 py-8 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                        : "text-gray-400 hover:text-white hover:bg-gray-800",
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
                    className="pl-12 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 h-12 rounded-lg focus:border-gray-600"
                  />
                </div>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-48 h-12 bg-gray-800/50 border-gray-700 text-white rounded-lg">
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
                  <SelectTrigger className="w-48 h-12 bg-gray-800/50 border-gray-700 text-white rounded-lg">
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
        </div>

        {/* Content Section */}
        <div className="px-8 py-8">
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
                    <div className="w-24 h-24 mx-auto mb-6 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700">
                      <Package className="h-12 w-12 text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-4 text-white">
                      {searchQuery
                        ? "No matches found"
                        : activeTab === "favorites"
                          ? "No favorites yet"
                          : activeTab === "recent"
                            ? "No recent activity"
                            : "Your collection awaits"}
                    </h3>
                    <p className="text-gray-400 mb-8 text-base">
                      {searchQuery
                        ? "Try adjusting your search or filters to discover your content."
                        : "Start building your premium content library with exclusive downloads and bundles."}
                    </p>
                    {!searchQuery && (
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg overflow-hidden border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 hover:transform hover:scale-[1.02]">
                            {/* Thumbnail */}
                            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800">
                              {getThumbnailUrl(purchase) ? (
                                <img
                                  src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                                  alt={purchase.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <div className="text-white">
                                      {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Content Type Badge */}
                              <div className="absolute top-3 left-3">
                                <Badge className="bg-black/70 text-white border-0 text-xs px-2 py-1">
                                  {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                  <span className="ml-1 capitalize">
                                    {purchase.metadata?.contentType || purchase.type?.replace("_", " ") || "Video"}
                                  </span>
                                </Badge>
                              </div>

                              {/* Favorite button */}
                              <Button
                                onClick={() => toggleFavorite(purchase.id)}
                                size="sm"
                                variant="ghost"
                                className="absolute top-3 right-3 h-8 w-8 p-0 bg-black/70 hover:bg-black/80 text-white"
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
                                  <Progress value={purchase.downloadProgress} className="h-1 bg-gray-600" />
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-base font-medium text-white line-clamp-1">{purchase.title}</h3>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-gray-800 border-gray-700">
                                    <DropdownMenuItem
                                      className="text-white hover:bg-gray-700"
                                      onClick={() => handleDownload(purchase)}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-white hover:bg-gray-700">
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

                              <p className="text-gray-400 text-sm mb-3">{purchase.creatorUsername}</p>

                              <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(purchase.createdAt)}</span>
                                </div>
                                <span>{purchase.metadata?.contentCount || 0} items</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-white font-medium">
                                  <DollarSign className="h-4 w-4" />
                                  <span>{purchase.price.toFixed(2)}</span>
                                </div>
                                <Button asChild size="sm" className="bg-gray-700 hover:bg-gray-600 text-white h-8 px-3">
                                  <Link
                                    href={
                                      purchase.type === "bundle"
                                        ? `/bundles/${purchase.bundleId}`
                                        : `/product-box/${purchase.productBoxId}/content`
                                    }
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Link>
                                </Button>
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
                        >
                          <div className="bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300">
                            <div className="flex items-center p-6">
                              {/* List view thumbnail */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-4 bg-gradient-to-br from-gray-700 to-gray-800">
                                {getThumbnailUrl(purchase) ? (
                                  <img
                                    src={getThumbnailUrl(purchase) || "/placeholder.svg"}
                                    alt={purchase.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                      <div className="text-white text-sm">
                                        {getContentIcon(purchase.type || "product_box", purchase.metadata?.contentType)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-white mb-1 truncate">{purchase.title}</h3>
                                    <p className="text-gray-400 text-sm mb-2">{purchase.creatorUsername}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                      <span>{formatDate(purchase.createdAt)}</span>
                                      <span>{purchase.metadata?.contentCount || 0} items</span>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3 ml-6">
                                    <Button
                                      onClick={() => toggleFavorite(purchase.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                                    >
                                      <Heart
                                        className={cn(
                                          "h-4 w-4 transition-colors",
                                          purchase.isFavorite ? "fill-red-500 text-red-500" : "text-gray-400",
                                        )}
                                      />
                                    </Button>
                                    <Button
                                      onClick={() => handleDownload(purchase)}
                                      variant="outline"
                                      size="sm"
                                      className="border-gray-600 hover:bg-gray-700 bg-transparent text-white h-8 px-3"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                    <Button
                                      asChild
                                      size="sm"
                                      className="bg-gray-700 hover:bg-gray-600 text-white h-8 px-3"
                                    >
                                      <Link
                                        href={
                                          purchase.type === "bundle"
                                            ? `/bundles/${purchase.bundleId}`
                                            : `/product-box/${purchase.productBoxId}/content`
                                        }
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Link>
                                    </Button>
                                    <span className="text-lg font-medium text-white ml-2">
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
  )
}
