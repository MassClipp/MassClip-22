"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Download,
  Eye,
  Search,
  Package,
  Calendar,
  DollarSign,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  FileText,
  ExternalLink,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

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
  metadata?: {
    title?: string
    description?: string
    contentCount?: number
    [key: string]: any
  }
}

type ViewMode = "grid" | "list"
type SortOption = "newest" | "oldest" | "price-high" | "price-low" | "title"

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

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

      // Ensure all purchases have required fields with fallbacks
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
        thumbnailUrl: purchase.thumbnailUrl || "",
        metadata: {
          ...purchase.metadata,
          contentCount: purchase.metadata?.contentCount || 0,
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

  const sortPurchases = (purchases: Purchase[], sortBy: SortOption) => {
    return [...purchases].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "price-high":
          return b.price - a.price
        case "price-low":
          return a.price - b.price
        case "title":
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })
  }

  const filteredPurchases = sortPurchases(
    purchases.filter((purchase) => {
      const matchesSearch =
        searchQuery === "" ||
        (purchase.title && purchase.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.description && purchase.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (purchase.creatorUsername && purchase.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = filterStatus === "all" || purchase.status === filterStatus

      return matchesSearch && matchesStatus
    }),
    sortBy,
  )

  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(price)
    } catch {
      return `$${price.toFixed(2)}`
    }
  }

  const formatDate = (date: any) => {
    try {
      let dateObj = date
      if (date?.toDate) {
        dateObj = date.toDate()
      } else if (typeof date === "string") {
        dateObj = new Date(date)
      }
      return formatDistanceToNow(dateObj, { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bundle":
        return <Package className="h-4 w-4" />
      case "subscription":
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-3 bg-zinc-800" />
            <Skeleton className="h-5 w-96 bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <Skeleton className="h-40 w-full mb-4 bg-zinc-800" />
                  <Skeleton className="h-6 w-3/4 mb-2 bg-zinc-800" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchPurchases} className="mt-4 bg-red-600 hover:bg-red-700" variant="default">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <Package className="h-6 w-6 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold">My Purchases</h1>
          </div>
          <p className="text-zinc-400 text-lg">Access and manage your premium content collection</p>
        </div>

        {/* Controls */}
        <div className="mb-8 space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
                <Input
                  placeholder="Search by title, creator, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white h-12">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white h-12">
                  {sortBy.includes("newest") || sortBy.includes("oldest") ? (
                    sortBy === "newest" ? (
                      <SortDesc className="h-4 w-4 mr-2" />
                    ) : (
                      <SortAsc className="h-4 w-4 mr-2" />
                    )
                  ) : (
                    <SortAsc className="h-4 w-4 mr-2" />
                  )}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {filteredPurchases.length} of {purchases.length} purchases
              </span>
              {searchQuery && (
                <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                  Searching: "{searchQuery}"
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-red-600 hover:bg-red-700" : "hover:bg-zinc-800"}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-red-600 hover:bg-red-700" : "hover:bg-zinc-800"}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {filteredPurchases.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-zinc-900 rounded-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {searchQuery || filterStatus !== "all" ? "No purchases match your filters" : "No purchases yet"}
                </h3>
                <p className="text-zinc-400 mb-6">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filters to find what you're looking for."
                    : "Start exploring premium content to build your collection."}
                </p>
                {!searchQuery && filterStatus === "all" && (
                  <Button asChild className="bg-red-600 hover:bg-red-700">
                    <Link href="/dashboard/explore">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Explore Content
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPurchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 group overflow-hidden">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                      {purchase.thumbnailUrl ? (
                        <img
                          src={purchase.thumbnailUrl || "/placeholder.svg"}
                          alt={purchase.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            {getTypeIcon(purchase.type || "product_box")}
                            <p className="text-xs text-zinc-500 mt-2">{purchase.type || "Content"}</p>
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge className={`${getStatusColor(purchase.status)} border text-xs`}>{purchase.status}</Badge>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className="border-zinc-600 bg-black/50 text-zinc-300 text-xs">
                          {getTypeIcon(purchase.type || "product_box")}
                          <span className="ml-1 capitalize">{purchase.type || "Content"}</span>
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      {/* Title and Creator */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2">{purchase.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>by {purchase.creatorUsername}</span>
                          <span>•</span>
                          <span>{formatDate(purchase.createdAt)}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {purchase.description && (
                        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{purchase.description}</p>
                      )}

                      {/* Price and Content Count */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <span className="font-semibold text-green-400">
                            {formatPrice(purchase.price, purchase.currency)}
                          </span>
                        </div>
                        {purchase.metadata?.contentCount && (
                          <div className="text-xs text-zinc-500">{purchase.metadata.contentCount} items</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {purchase.status === "completed" && (
                          <>
                            <Button
                              onClick={() => handleDownload(purchase)}
                              size="sm"
                              variant="outline"
                              className="flex-1 border-zinc-700 hover:bg-zinc-800"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button asChild size="sm" className="flex-1 bg-red-600 hover:bg-red-700">
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
                          </>
                        )}
                        {purchase.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="w-full border-zinc-700 bg-transparent"
                          >
                            Processing...
                          </Button>
                        )}
                        {purchase.status === "failed" && (
                          <Button
                            onClick={fetchPurchases}
                            size="sm"
                            variant="outline"
                            className="w-full border-red-700 text-red-400 hover:bg-red-900/20 bg-transparent"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {filteredPurchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        {/* Thumbnail */}
                        <div className="w-24 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg overflow-hidden flex-shrink-0">
                          {purchase.thumbnailUrl ? (
                            <img
                              src={purchase.thumbnailUrl || "/placeholder.svg"}
                              alt={purchase.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getTypeIcon(purchase.type || "product_box")}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-white truncate">{purchase.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <span>by {purchase.creatorUsername}</span>
                                <span>•</span>
                                <span>{formatDate(purchase.createdAt)}</span>
                                {purchase.metadata?.contentCount && (
                                  <>
                                    <span>•</span>
                                    <span>{purchase.metadata.contentCount} items</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <Badge className={`${getStatusColor(purchase.status)} border text-xs`}>
                                {purchase.status}
                              </Badge>
                              <span className="font-semibold text-green-400">
                                {formatPrice(purchase.price, purchase.currency)}
                              </span>
                            </div>
                          </div>

                          {purchase.description && (
                            <p className="text-sm text-zinc-400 mb-3 line-clamp-1">{purchase.description}</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            {purchase.status === "completed" && (
                              <>
                                <Button
                                  onClick={() => handleDownload(purchase)}
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-700 hover:bg-zinc-800"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                <Button asChild size="sm" className="bg-red-600 hover:bg-red-700">
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
                              </>
                            )}
                            {purchase.status === "pending" && (
                              <Button size="sm" variant="outline" disabled className="border-zinc-700 bg-transparent">
                                Processing...
                              </Button>
                            )}
                            {purchase.status === "failed" && (
                              <Button
                                onClick={fetchPurchases}
                                size="sm"
                                variant="outline"
                                className="border-red-700 text-red-400 hover:bg-red-900/20 bg-transparent"
                              >
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
