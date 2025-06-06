"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Play,
  Download,
  Calendar,
  DollarSign,
  User,
  Package,
  Video,
  Lock,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Purchase {
  id: string
  type: "video" | "product_box"
  itemId: string
  itemTitle: string
  itemDescription?: string
  creatorName: string
  creatorUsername: string
  price: number
  currency: string
  purchasedAt: any
  status: "completed" | "pending" | "failed"
  thumbnailUrl?: string
  accessUrl?: string
  downloadUrl?: string
  contentItems?: string[]
}

interface PurchaseWithContent extends Purchase {
  contentDetails?: {
    duration?: number
    fileSize?: number
    format?: string
    quality?: string
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1.0],
    },
  },
}

export default function MyPurchasesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<PurchaseWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("newest")

  // Fetch user purchases
  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log("🔍 [My Purchases] Fetching purchases for user:", user.uid)

      const response = await fetch("/api/user/purchases", {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }

      const data = await response.json()
      console.log("✅ [My Purchases] Loaded purchases:", data.purchases?.length || 0)

      setPurchases(data.purchases || [])

      if (refreshing) {
        toast({
          title: "Purchases refreshed",
          description: `Found ${data.purchases?.length || 0} purchases`,
        })
      }
    } catch (error) {
      console.error("❌ [My Purchases] Error fetching purchases:", error)
      toast({
        title: "Error loading purchases",
        description: "Failed to load your purchase history. Please try again.",
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
      const matchesSearch =
        purchase.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || purchase.type === filterType
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
        case "oldest":
          return new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime()
        case "price_high":
          return b.price - a.price
        case "price_low":
          return a.price - b.price
        case "creator":
          return a.creatorName.localeCompare(b.creatorName)
        default:
          return 0
      }
    })

  // Group purchases by type
  const videoPurchases = filteredPurchases.filter((p) => p.type === "video")
  const productBoxPurchases = filteredPurchases.filter((p) => p.type === "product_box")

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  // Handle content access
  const handleAccess = (purchase: Purchase) => {
    if (purchase.type === "video" && purchase.accessUrl) {
      window.open(purchase.accessUrl, "_blank")
    } else if (purchase.type === "product_box") {
      // Open product box viewer
      window.open(`/product-box/${purchase.itemId}`, "_blank")
    } else {
      toast({
        title: "Content not available",
        description: "This content is not currently accessible.",
        variant: "destructive",
      })
    }
  }

  // Handle download
  const handleDownload = async (purchase: Purchase) => {
    if (!purchase.downloadUrl) {
      toast({
        title: "Download not available",
        description: "This content doesn't support downloading.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(purchase.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${purchase.itemTitle}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `Downloading ${purchase.itemTitle}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Purchase card component
  const PurchaseCard = ({ purchase }: { purchase: PurchaseWithContent }) => (
    <motion.div variants={itemVariants}>
      <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group hover:border-zinc-700/50 transition-all duration-300">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
        <div className="relative">
          <CardContent className="p-0">
            <div className="flex gap-4 p-4">
              {/* Thumbnail */}
              <div className="aspect-video w-32 bg-zinc-800 rounded-lg overflow-hidden relative flex-shrink-0">
                {purchase.thumbnailUrl ? (
                  <img
                    src={purchase.thumbnailUrl || "/placeholder.svg"}
                    alt={purchase.itemTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {purchase.type === "video" ? (
                      <Video className="h-8 w-8 text-zinc-600" />
                    ) : (
                      <Package className="h-8 w-8 text-zinc-600" />
                    )}
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      purchase.type === "video"
                        ? "border-blue-500 text-blue-400 bg-blue-500/10"
                        : "border-purple-500 text-purple-400 bg-purple-500/10"
                    }`}
                  >
                    {purchase.type === "video" ? "Video" : "Bundle"}
                  </Badge>
                </div>

                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      purchase.status === "completed"
                        ? "border-green-500 text-green-400 bg-green-500/10"
                        : purchase.status === "pending"
                          ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
                          : "border-red-500 text-red-400 bg-red-500/10"
                    }`}
                  >
                    {purchase.status}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white truncate">{purchase.itemTitle}</h3>

                  {purchase.itemDescription && (
                    <p className="text-sm text-zinc-400 line-clamp-2">{purchase.itemDescription}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{purchase.creatorName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(purchase.purchasedAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{formatPrice(purchase.price, purchase.currency)}</span>
                    </div>
                  </div>

                  {/* Content details */}
                  {purchase.contentDetails && (
                    <div className="flex items-center gap-4 text-xs text-zinc-600">
                      {purchase.contentDetails.duration && (
                        <span>
                          {Math.floor(purchase.contentDetails.duration / 60)}:
                          {(purchase.contentDetails.duration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                      {purchase.contentDetails.quality && <span>{purchase.contentDetails.quality}</span>}
                      {purchase.contentDetails.fileSize && (
                        <span>{(purchase.contentDetails.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleAccess(purchase)}
                    disabled={purchase.status !== "completed"}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {purchase.type === "video" ? "Watch" : "Access"}
                  </Button>

                  {purchase.downloadUrl && (
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(purchase)}
                      disabled={purchase.status !== "completed"}
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => window.open(`/creator/${purchase.creatorUsername}`, "_blank")}
                    className="border-zinc-700 hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Creator
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  )

  if (loading && purchases.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            My Purchases
          </h1>
          <p className="text-zinc-400 mt-1">Access your purchased content and download history</p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
            />
          </div>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Videos Only</SelectItem>
            <SelectItem value="product_box">Bundles Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800">
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

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Purchases</p>
                <p className="text-2xl font-bold text-white">{purchases.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Videos</p>
                <p className="text-2xl font-bold text-white">{videoPurchases.length}</p>
              </div>
              <Video className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Bundles</p>
                <p className="text-2xl font-bold text-white">{productBoxPurchases.length}</p>
              </div>
              <Lock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Spent</p>
                <p className="text-2xl font-bold text-white">
                  ${purchases.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content */}
      {filteredPurchases.length > 0 ? (
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-zinc-900/50 border border-zinc-800">
              <TabsTrigger value="all">All Purchases ({filteredPurchases.length})</TabsTrigger>
              <TabsTrigger value="videos">Videos ({videoPurchases.length})</TabsTrigger>
              <TabsTrigger value="bundles">Bundles ({productBoxPurchases.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              {videoPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </TabsContent>

            <TabsContent value="bundles" className="space-y-4">
              {productBoxPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </TabsContent>
          </Tabs>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Purchases Yet</h3>
              <p className="text-zinc-400 mb-6">
                {searchTerm || filterType !== "all"
                  ? "No purchases match your current filters."
                  : "You haven't purchased any content yet. Explore creators and find content you love!"}
              </p>
              {!searchTerm && filterType === "all" && (
                <Button
                  onClick={() => window.open("/dashboard/explore", "_blank")}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Explore Content
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
