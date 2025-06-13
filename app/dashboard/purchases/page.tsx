"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Play,
  Calendar,
  DollarSign,
  User,
  Package,
  Video,
  Search,
  ShoppingBag,
  Eye,
  Download,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
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

  // Content card component with 9:16 aspect ratio and video playback
  const ContentCard = ({ content }: { content: UnifiedPurchaseItem }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

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
          className="group relative transition-all duration-300 rounded-lg"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md">
            {content.contentType === "video" ? (
              <>
                {/* Video thumbnail */}
                <img
                  src={content.thumbnailUrl || "/placeholder.svg?height=480&width=270&text=Video"}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />

                {/* Action buttons container */}
                <div
                  className="absolute bottom-2 right-2 z-20 transition-opacity duration-300"
                  style={{ opacity: isHovered ? 1 : 0 }}
                >
                  {/* Download button */}
                  <button
                    className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                    onClick={handleDownload}
                    aria-label="Download video"
                    title="Download video"
                  >
                    <Download className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>

                {/* Favorite button */}
                <div
                  className="absolute bottom-2 left-2 z-20 transition-opacity duration-300"
                  style={{ opacity: isHovered ? 1 : 0 }}
                >
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
            ) : (
              <img
                src={content.thumbnailUrl || "/placeholder.svg?height=480&width=270&text=Media"}
                alt={content.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* File info below video */}
        <div className="mt-1 flex justify-between items-center">
          <span className="text-xs text-zinc-400">video</span>
          <span className="text-xs text-zinc-400">{formatFileSize(content.fileSize)}</span>
        </div>
      </div>
    )
  }

  // Purchase card component
  const PurchaseCard = ({ purchase }: { purchase: UnifiedPurchase }) => {
    const isExpanded = expandedPurchases[purchase.id] || false
    const displayItems = isExpanded ? purchase.items : purchase.items.slice(0, 5)
    const hasMoreItems = purchase.items.length > 5

    return (
      <motion.div variants={itemVariants} className="mb-6 bg-zinc-900/40 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-zinc-800/50">
          {/* Purchase Header */}
          <div className="flex items-center gap-4">
            {/* Bundle Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 flex items-center justify-center bg-zinc-800 rounded-lg">
                <Package className="h-5 w-5 text-zinc-400" />
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">{purchase.productBoxTitle || "Untitled"}</h3>
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
        </div>

        {/* Content Items Grid */}
        {purchase.items && purchase.items.length > 0 && (
          <div className="p-4">
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
      <div className="container mx-auto px-4 py-6">
        {/* Search and Sort */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-1 focus:ring-zinc-700"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_high">Price: High to Low</option>
            <option value="price_low">Price: Low to High</option>
            <option value="creator">Creator Name</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Total Purchases</p>
                <p className="text-2xl font-bold text-white">{purchases.length}</p>
              </div>
              <ShoppingBag className="h-5 w-5 text-zinc-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Total Items</p>
                <p className="text-2xl font-bold text-white">
                  {purchases.reduce((sum, p) => sum + (p.totalItems || 0), 0)}
                </p>
              </div>
              <Video className="h-5 w-5 text-zinc-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Bundles</p>
                <p className="text-2xl font-bold text-white">{purchases.length}</p>
              </div>
              <Package className="h-5 w-5 text-zinc-500" />
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-400">Total Spent</p>
                <p className="text-2xl font-bold text-white">{formatPrice(totalSpent)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length > 0 ? (
          <div>
            {filteredPurchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] bg-zinc-900/40 rounded-lg">
            <div className="text-center p-8">
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
