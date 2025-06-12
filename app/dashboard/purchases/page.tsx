"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Play,
  Download,
  Calendar,
  DollarSign,
  User,
  Package,
  Video,
  RefreshCw,
  Search,
  ShoppingBag,
  Eye,
  ArrowUpRight,
  Pause,
  AlertCircle,
  FileText,
  Music,
  ImageIcon,
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
  const [debugInfo, setDebugInfo] = useState<any>(null)

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

  const handleDebug = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/debug-purchases?userId=${user.uid}`)
      const data = await response.json()
      setDebugInfo(data)
      console.log("🔍 [Debug] Purchase data:", data)

      toast({
        title: "Debug Info",
        description: `Main: ${data.mainPurchases?.length || 0}, User: ${data.userPurchases?.length || 0}, Unified: ${data.unifiedPurchases?.length || 0}`,
      })
    } catch (error) {
      console.error("Debug failed:", error)
    }
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

  // Get content type icon
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case "video":
        return <Video className="h-12 w-12 text-zinc-600" />
      case "audio":
        return <Music className="h-12 w-12 text-zinc-600" />
      case "image":
        return <ImageIcon className="h-12 w-12 text-zinc-600" />
      default:
        return <FileText className="h-12 w-12 text-zinc-600" />
    }
  }

  // Content card component with comprehensive metadata display
  const ContentCard = ({ content }: { content: UnifiedPurchaseItem }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const { toast } = useToast()

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
    }

    const formatDuration = (seconds?: number) => {
      if (!seconds) return ""
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }

    const togglePlay = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!videoRef.current) return

      if (isPlaying) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setIsPlaying(false)
      } else {
        document.querySelectorAll("video").forEach((v) => {
          if (v !== videoRef.current) {
            v.pause()
            v.currentTime = 0
          }
        })

        videoRef.current.muted = false
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.error("Error playing video:", error)
            setLoadError(true)
            toast({
              title: "Playback Error",
              description: "Unable to play this content. The file might be missing or corrupted.",
              variant: "destructive",
            })
          })
      }
    }

    const handleVideoEnd = () => {
      setIsPlaying(false)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }

    const handleVideoError = () => {
      console.error(`Video error for content: ${content.id}`, content)
      setLoadError(true)
    }

    const handleDownload = async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (isDownloading) return
      setIsDownloading(true)

      try {
        if (!content.fileUrl) {
          toast({
            title: "Download Error",
            description: "No download link available for this content.",
            variant: "destructive",
          })
          return
        }

        const response = await fetch(content.fileUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        const downloadLink = document.createElement("a")
        downloadLink.href = url
        downloadLink.download = content.filename
        downloadLink.style.display = "none"
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        window.URL.revokeObjectURL(url)

        toast({
          title: "Download Started",
          description: "Your content is downloading",
        })
      } catch (error) {
        console.error("Download failed:", error)
        toast({
          title: "Download Error",
          description: "There was an issue starting your download. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsDownloading(false)
      }
    }

    return (
      <div className="flex-shrink-0 w-full">
        <div
          className="relative group border border-transparent hover:border-white/20 transition-all duration-300 rounded-lg"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900 shadow-md">
            {/* Video content with exact same styling as bundle view */}
            {loadError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/50 text-center p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-xs text-zinc-400">Content unavailable</p>
              </div>
            ) : content.contentType === "video" && content.fileUrl ? (
              <>
                {/* VIDEO badge exactly like bundle view */}
                <div className="absolute top-2 left-2 z-30">
                  <Badge className="bg-red-600 text-white text-xs font-medium px-2 py-1">VIDEO</Badge>
                </div>

                <video
                  ref={videoRef}
                  className="w-full h-full object-cover cursor-pointer"
                  preload="metadata"
                  muted={false}
                  playsInline
                  onEnded={handleVideoEnd}
                  onError={handleVideoError}
                  onClick={togglePlay}
                  controls={false}
                >
                  <source src={content.fileUrl} type={content.mimeType} />
                </video>

                {/* File size overlay exactly like bundle view */}
                <div className="absolute bottom-2 left-2 z-30">
                  <div className="bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
                    {content.displaySize}
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                {content.thumbnailUrl ? (
                  <img
                    src={content.thumbnailUrl || "/placeholder.svg"}
                    alt={content.title}
                    className="w-full h-full object-cover"
                    onError={() => setLoadError(true)}
                  />
                ) : (
                  getContentTypeIcon(content.contentType)
                )}
              </div>
            )}

            {/* Play/Pause controls */}
            {content.contentType === "video" && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200 hover:bg-black/70"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
              </div>
            )}

            {/* Download button */}
            <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                className="bg-black/70 hover:bg-black/90 p-1.5 rounded-full transition-all duration-300"
                onClick={handleDownload}
                disabled={isDownloading || loadError}
                title="Download content"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Title and metadata exactly like bundle view */}
        <div className="mt-2 space-y-1">
          <div className="text-xs text-zinc-300 min-h-[2.5rem] line-clamp-2 font-light" title={content.displayTitle}>
            {content.displayTitle}
            {content.displayResolution && <span className="text-zinc-500 ml-1">({content.displayResolution})</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {content.displayDuration && <span>{content.displayDuration}</span>}
            <span>{content.contentType}</span>
            {content.quality && <span>{content.quality}</span>}
          </div>
        </div>
      </div>
    )
  }

  // Purchase card component
  const PurchaseCard = ({ purchase }: { purchase: UnifiedPurchase }) => (
    <motion.div variants={itemVariants}>
      <Card className="group border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-900/60">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Purchase Header */}
            <div className="flex items-center gap-6">
              {/* Minimal Thumbnail */}
              <div className="relative flex-shrink-0">
                <div className="aspect-square w-20 overflow-hidden rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                  {purchase.productBoxThumbnail ? (
                    <img
                      src={purchase.productBoxThumbnail || "/placeholder.svg?height=80&width=80"}
                      alt={purchase.productBoxTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-zinc-500" />
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute -top-1 -right-1">
                  <div className="h-3 w-3 rounded-full border-2 border-zinc-900 bg-green-500" />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{purchase.productBoxTitle || "Untitled"}</h3>
                    <Badge variant="outline" className="border-zinc-700 text-xs text-zinc-400">
                      Bundle
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-zinc-400">
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
                      <span className="font-medium text-white">
                        {formatPrice(purchase.amount || 0, purchase.currency || "usd")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAccess(purchase)}
                    className="bg-white text-black hover:bg-zinc-200 font-medium transition-colors duration-200"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Access Bundle
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open(`/creator/${purchase.creatorUsername}`, "_blank")}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Items Grid */}
            {purchase.items && purchase.items.length > 0 && (
              <div className="space-y-4">
                <div className="border-t border-zinc-800/50 pt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Bundle Content ({purchase.totalItems} items)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {purchase.items.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

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

          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              onClick={handleDebug}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Debug
            </Button>
          </div>
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
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

          <Card className="border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">Total Spent</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(totalSpent)}</p>
                </div>
                <DollarSign className="h-5 w-5 text-zinc-500" />
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
