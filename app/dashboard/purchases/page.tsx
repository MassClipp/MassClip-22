"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Play,
  Calendar,
  DollarSign,
  User,
  Package,
  Video,
  RefreshCw,
  Search,
  ShoppingBag,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  File,
  Music,
  Pause,
  Filter,
} from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

interface UnifiedPurchaseItem {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
  displayTitle?: string
  displaySize?: string
  displayDuration?: string
  displayResolution?: string
  quality?: string
}

interface UnifiedPurchase {
  id: string
  productBoxId: string
  productBoxTitle: string
  productBoxDescription?: string
  productBoxThumbnail?: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  purchasedAt: Date
  amount: number
  currency: string
  sessionId: string
  items: UnifiedPurchaseItem[]
  totalItems: number
  totalSize: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
}

export default function MyPurchasesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<UnifiedPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("newest")
  const router = useRouter()
  const [expandedPurchases, setExpandedPurchases] = useState<Record<string, boolean>>({})

  // Toggle expanded state for a purchase
  const toggleExpanded = (purchaseId: string) => {
    setExpandedPurchases((prev) => ({
      ...prev,
      [purchaseId]: !prev[purchaseId],
    }))
  }

  // Fetch user purchases from unified collection
  const fetchPurchases = async () => {
    if (!user) {
      console.log("❌ [My Purchases] No user found")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [My Purchases] Fetching purchases for user:", user.uid)

      // Get the Firebase auth token
      const token = await user.getIdToken()

      // Try the main purchases API first (which checks all locations)
      const response = await fetch(`/api/user/purchases?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("🔍 [My Purchases] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [My Purchases] API error:", response.status, errorText)
        throw new Error(`API returned ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("✅ [My Purchases] API response:", data)

      const rawPurchases = data.purchases || []

      // Convert timestamps and ensure proper format
      const processedPurchases = rawPurchases.map((purchase: any) => ({
        ...purchase,
        purchasedAt: purchase.purchasedAt?.toDate ? purchase.purchasedAt.toDate() : new Date(purchase.purchasedAt),
        // Ensure we have the required fields for the UI
        productBoxId: purchase.itemId || purchase.productBoxId,
        productBoxTitle: purchase.itemTitle || purchase.productBoxTitle || "Unknown Product",
        productBoxDescription: purchase.itemDescription || purchase.productBoxDescription || "",
        productBoxThumbnail: purchase.thumbnailUrl || purchase.customPreviewThumbnail || "",
        items: purchase.items || [],
        totalItems: purchase.totalItems || (purchase.items ? purchase.items.length : 0),
      }))

      setPurchases(processedPurchases)

      if (refreshing) {
        toast({
          title: "Purchases refreshed",
          description: `Found ${processedPurchases.length} purchases`,
        })
      }

      console.log("✅ [My Purchases] Successfully loaded", processedPurchases.length, "purchases")
    } catch (error) {
      console.error("❌ [My Purchases] Error fetching purchases:", error)
      toast({
        title: "Error loading purchases",
        description: error instanceof Error ? error.message : "Failed to load your purchase history. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchPurchases()
  }, [user])

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPurchases()
  }

  // Filter and sort purchases
  const filteredPurchases = purchases
    .filter((purchase) => {
      const productBoxTitle = purchase.productBoxTitle || ""
      const creatorName = purchase.creatorName || ""

      const matchesSearch =
        productBoxTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creatorName.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime()
        case "oldest":
          return new Date(a.purchasedAt || 0).getTime() - new Date(b.purchasedAt || 0).getTime()
        case "price_high":
          return (b.amount || 0) - (a.amount || 0)
        case "price_low":
          return (a.amount || 0) - (b.amount || 0)
        case "creator":
          return (a.creatorName || "").localeCompare(b.creatorName || "")
        default:
          return 0
      }
    })

  // Calculate total spent safely
  const totalSpent = purchases.reduce((sum, p) => {
    const price = typeof p.amount === "number" && !isNaN(p.amount) ? p.amount : 0
    return sum + price
  }, 0)

  // Format price
  const formatPrice = (amount = 0, currency = "usd") => {
    if (typeof amount !== "number" || isNaN(amount)) {
      return "$0.00"
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  // Handle content access
  const handleAccess = (purchase: UnifiedPurchase) => {
    router.push(`/product-box/${purchase.productBoxId}/content`)
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // Update the ContentCard component to show video player directly
  const ContentCard = ({ content }: { content: UnifiedPurchaseItem }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)

    // Handle play/pause
    const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!videoRef.current) return

      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        // Pause all other videos first
        document.querySelectorAll("video").forEach((v) => {
          if (v !== videoRef.current) {
            v.pause()
          }
        })

        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.error("Error playing video:", error)
          })
      }
    }

    // Handle download
    const handleDownload = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!content.fileUrl) return

      const link = document.createElement("a")
      link.href = content.fileUrl
      link.download = content.filename || `${content.title}.mp4`
      link.click()
    }

    // Toggle favorite
    const toggleFavorite = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsFavorite(!isFavorite)
    }

    return (
      <div className="group relative w-full min-w-0">
        <div
          className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Direct Video Player - No Thumbnails */}
          {content.contentType === "video" ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                preload="metadata"
                onClick={togglePlay}
                onEnded={() => setIsPlaying(false)}
                poster={content.thumbnailUrl}
              >
                <source src={content.fileUrl} type="video/mp4" />
              </video>

              {/* Play/Pause Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <Play className="h-4 w-4 text-white ml-0.5" />
                  )}
                </button>
              </div>
            </>
          ) : content.contentType === "audio" ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
              <Music className="h-6 w-6 text-purple-400" />
            </div>
          ) : content.contentType === "image" ? (
            <img
              src={content.fileUrl || content.thumbnailUrl}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900/50">
              <File className="h-6 w-6 text-zinc-500" />
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1.5">
            <button
              className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-black/70 flex items-center justify-center transition-all duration-200"
              onClick={handleDownload}
              aria-label="Download"
              title="Download"
            >
              <Download className="h-3 w-3 text-white" />
            </button>
            <button
              className={`w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-black/70 flex items-center justify-center transition-all duration-200 ${
                isFavorite ? "text-red-400" : "text-white"
              }`}
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className="h-3 w-3" fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* File info */}
        <div className="mt-1.5 px-0.5">
          <div className="flex justify-between items-center text-xs text-zinc-500">
            <span className="capitalize truncate">{content.contentType}</span>
            <span className="text-xs">{formatFileSize(content.fileSize)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Update the PurchaseCard component with full-width grid
  const PurchaseCard = ({ purchase }: { purchase: UnifiedPurchase }) => {
    const isExpanded = expandedPurchases[purchase.id] || false
    const displayItems = isExpanded ? purchase.items : purchase.items.slice(0, 12)
    const hasMoreItems = purchase.items.length > 12

    return (
      <motion.div variants={itemVariants}>
        <div className="group bg-zinc-950/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-all duration-300 w-full">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800/50">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{purchase.productBoxTitle || "Untitled"}</h3>
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                      Bundle
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{purchase.creatorName || purchase.creatorUsername || "Unknown Creator"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(purchase.purchasedAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {formatPrice(purchase.amount || 0, purchase.currency || "usd")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleAccess(purchase)}
                className="bg-white text-black hover:bg-zinc-100 font-medium transition-all duration-200 h-10 px-6 rounded-xl shadow-sm"
              >
                <Play className="mr-2 h-4 w-4" />
                Access
              </Button>
            </div>
          </div>

          {/* Content Items - Full width grid that expands to fill container */}
          {purchase.items && purchase.items.length > 0 && (
            <div className="w-full">
              <div className="p-6 w-full">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-zinc-300">
                    Content <span className="text-zinc-500">({purchase.totalItems} items)</span>
                  </h4>
                  {hasMoreItems && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(purchase.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 h-8 px-3 rounded-lg"
                    >
                      {isExpanded ? (
                        <>
                          Show Less <ChevronUp className="ml-1.5 h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Show All <ChevronDown className="ml-1.5 h-3 w-3" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {/* Full-width responsive grid that fills the entire container */}
                <div className="w-full">
                  <div className="grid w-full auto-cols-fr grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {displayItems.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>
                </div>
                {!isExpanded && hasMoreItems && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(purchase.id)}
                      className="text-sm text-zinc-500 hover:text-zinc-300 h-9 px-4 rounded-lg"
                    >
                      Show {purchase.items.length - 12} More Items <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (loading && purchases.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white"></div>
          <span className="text-zinc-400">Loading purchases...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black w-full">
      <motion.div
        className="w-full max-w-none mx-auto px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
              <p className="text-zinc-400">Your purchased content library</p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="border-zinc-800 bg-zinc-950/50 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 transition-all duration-200 h-10 px-4 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 bg-zinc-950/50 border-zinc-800 focus:border-zinc-600 text-white placeholder:text-zinc-500 rounded-xl"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] h-12 pl-11 bg-zinc-950/50 border-zinc-800 text-white rounded-xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="creator">Creator Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-white">{purchases.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-white">
                    {purchases.reduce((sum, p) => sum + (p.totalItems || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center">
                  <Video className="h-5 w-5 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(totalSpent)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-zinc-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content */}
        {filteredPurchases.length > 0 ? (
          <motion.div variants={itemVariants} className="space-y-6 w-full">
            {filteredPurchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="flex items-center justify-center min-h-[400px]">
            <Card className="border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm w-full max-w-md">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="h-8 w-8 text-zinc-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">No Purchases Yet</h3>
                <p className="text-zinc-500 mb-6 leading-relaxed">
                  {searchTerm
                    ? "No purchases match your search criteria."
                    : "Start exploring and discover amazing content from creators."}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => router.push("/dashboard/explore")}
                    className="bg-white text-black hover:bg-zinc-100 font-medium h-11 px-6 rounded-xl"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Explore Content
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
