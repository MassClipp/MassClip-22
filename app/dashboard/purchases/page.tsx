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
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
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

  // Update the ContentCard component to match the reference design
  // and improve the visual density

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
      <div className="flex-shrink-0 w-full">
        <div
          className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Video/Thumbnail */}
          {content.contentType === "video" ? (
            <>
              <img
                src={content.thumbnailUrl || "/placeholder.svg?height=480&width=270&text=Video"}
                alt={content.title}
                className={`w-full h-full object-cover ${isPlaying ? "hidden" : "block"}`}
              />
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${isPlaying ? "block" : "hidden"}`}
                preload="metadata"
                onClick={togglePlay}
                onEnded={() => setIsPlaying(false)}
              >
                <source src={content.fileUrl} type="video/mp4" />
              </video>

              {/* Play button overlay - only show when not playing */}
              {!isPlaying && isHovered && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <Play className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}
            </>
          ) : content.contentType === "audio" ? (
            <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
              <Music className="h-8 w-8 text-purple-400" />
            </div>
          ) : content.contentType === "image" ? (
            <img
              src={content.fileUrl || content.thumbnailUrl || "/placeholder.svg?height=480&width=270&text=Image"}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <File className="h-8 w-8 text-zinc-400" />
            </div>
          )}

          {/* Action buttons - only show on hover */}
          {isHovered && (
            <>
              {/* Download button */}
              <div className="absolute bottom-2 right-2 z-20">
                <button
                  className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                  onClick={handleDownload}
                  aria-label="Download"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                </button>
              </div>

              {/* Favorite button */}
              <div className="absolute bottom-2 left-2 z-20">
                <button
                  className={`bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300 ${
                    isFavorite ? "text-red-500" : "text-white"
                  }`}
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* File info below video */}
        <div className="mt-1 flex justify-between items-center">
          <span className="text-xs text-zinc-400">video</span>
          <span className="text-xs text-zinc-400">{formatFileSize(content.fileSize)}</span>
        </div>
      </div>
    )
  }

  // Update the PurchaseCard component to match the reference design
  const PurchaseCard = ({ purchase }: { purchase: UnifiedPurchase }) => {
    const isExpanded = expandedPurchases[purchase.id] || false
    const displayItems = isExpanded ? purchase.items : purchase.items.slice(0, 5)
    const hasMoreItems = purchase.items.length > 5

    return (
      <motion.div variants={itemVariants}>
        <div className="bg-zinc-900/40 rounded-lg overflow-hidden mb-4">
          <div className="p-4 flex items-center gap-4">
            {/* Bundle Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-lg">
                <Package className="h-5 w-5 text-zinc-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-white">{purchase.productBoxTitle || "Untitled"}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-400">Bundle</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{purchase.creatorName || purchase.creatorUsername || "Unknown Creator"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(purchase.purchasedAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{formatPrice(purchase.amount || 0, purchase.currency || "usd")}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAccess(purchase)}
                  className="bg-white text-black hover:bg-zinc-200 font-medium transition-colors duration-200 h-9 px-3 rounded-lg"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Access Bundle
                </Button>
              </div>
            </div>
          </div>

          {/* Content Items Grid */}
          {purchase.items && purchase.items.length > 0 && (
            <div className="p-4 border-t border-zinc-800/50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-white">Bundle Content ({purchase.totalItems} items)</h4>
                {hasMoreItems && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(purchase.id)}
                    className="text-xs text-zinc-400 hover:text-white h-7 px-2"
                  >
                    {isExpanded ? (
                      <>
                        Show Less <ChevronUp className="ml-1 h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Show All <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {displayItems.map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))}
              </div>
              {!isExpanded && hasMoreItems && (
                <div className="mt-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(purchase.id)}
                    className="text-xs text-zinc-400 hover:text-white h-7"
                  >
                    Show {purchase.items.length - 5} More <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (loading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <motion.div
        className="flex-1 container mx-auto px-6 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Clean Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-zinc-800/50 pb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">My Purchases</h1>
            <p className="text-zinc-400 mt-1">Access your purchased content and download history</p>
          </div>

          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Clean Filters */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-zinc-600 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="creator">Creator Name</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Clean Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Purchases</p>
                  <p className="text-2xl font-bold text-white">{purchases.length}</p>
                </div>
                <ShoppingBag className="h-5 w-5 text-zinc-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Items</p>
                  <p className="text-2xl font-bold text-white">
                    {purchases.reduce((sum, p) => sum + (p.totalItems || 0), 0)}
                  </p>
                </div>
                <Video className="h-5 w-5 text-zinc-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Bundles</p>
                  <p className="text-2xl font-bold text-white">{purchases.length}</p>
                </div>
                <Package className="h-5 w-5 text-zinc-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Clean Content */}
        {filteredPurchases.length > 0 ? (
          <motion.div variants={itemVariants} className="flex-1">
            <div className="space-y-4">
              {filteredPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="flex-1 flex items-center justify-center min-h-[400px]">
            <Card className="border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm w-full max-w-2xl">
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Purchases Yet</h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                  {searchTerm
                    ? "No purchases match your current search."
                    : "You haven't purchased any content yet. Explore creators and find content you love."}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => window.open("/dashboard/explore", "_blank")}
                    className="bg-white text-black hover:bg-zinc-200 font-medium"
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
