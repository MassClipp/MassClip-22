"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  Package,
  DollarSign,
  Calendar,
  User,
  Play,
  Download,
  Heart,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface Purchase {
  id: string
  type: "bundle" | "individual"
  title: string
  description?: string
  price: number
  currency: string
  purchaseDate: Date
  creatorUsername: string
  creatorId: string
  contentItems?: ContentItem[]
  coverImageUrl?: string
  customPreviewThumbnail?: string
}

interface ContentItem {
  id: string
  title: string
  type: "video" | "audio" | "image" | "document"
  url: string
  thumbnailUrl?: string
  duration?: number
  size?: number
}

export default function FullScreenMyPurchasesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  // Fetch purchases
  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching purchases:", error)
      toast({
        title: "Error",
        description: "Failed to load purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Refresh purchases
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPurchases()
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Purchase library updated",
    })
  }

  // Filter and sort purchases
  const filteredPurchases = purchases
    .filter(
      (purchase) =>
        purchase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorUsername.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        case "oldest":
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
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

  // Toggle purchase expansion
  const toggleExpanded = (purchaseId: string) => {
    const newExpanded = new Set(expandedPurchases)
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId)
    } else {
      newExpanded.add(purchaseId)
    }
    setExpandedPurchases(newExpanded)
  }

  // Calculate statistics
  const totalPurchases = purchases.length
  const totalItems = purchases.reduce((sum, purchase) => sum + (purchase.contentItems?.length || 0), 0)
  const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.price, 0)

  // Format price
  const formatPrice = (price: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  useEffect(() => {
    fetchPurchases()
  }, [user])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading your purchases...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black overflow-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#3f3f46 #18181b",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #18181b;
        }
        div::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>

      <div className="min-h-full w-full pt-24 px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
            <p className="text-zinc-400">Your purchased content library</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-white">{totalPurchases}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-white">{totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-white">{formatPrice(totalSpent)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-zinc-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">
                {searchTerm ? "No matching purchases" : "No purchases yet"}
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Start exploring and purchasing premium content from creators"}
              </p>
              {!searchTerm && (
                <Button
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                  onClick={() => (window.location.href = "/")}
                >
                  Explore Content
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredPurchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="bg-zinc-900/60 backdrop-blur-sm border-zinc-800/50 overflow-hidden hover:border-zinc-700/50 transition-all duration-300">
                    <CardContent className="p-0">
                      {/* Purchase Header */}
                      <div className="p-6 border-b border-zinc-800/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {purchase.coverImageUrl ? (
                                <img
                                  src={purchase.coverImageUrl || "/placeholder.svg"}
                                  alt={purchase.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-zinc-600" />
                              )}
                            </div>

                            {/* Purchase Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-white truncate">{purchase.title}</h3>
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-0 flex-shrink-0">
                                  {purchase.type === "bundle" ? "Bundle" : "Individual"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-zinc-400 mb-2">
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>{purchase.creatorUsername}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(purchase.purchaseDate)}</span>
                                </div>
                                <div className="text-green-400 font-medium">
                                  {formatPrice(purchase.price, purchase.currency)}
                                </div>
                              </div>

                              {purchase.description && (
                                <p className="text-sm text-zinc-500 line-clamp-2">{purchase.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                              onClick={() => toggleExpanded(purchase.id)}
                            >
                              {expandedPurchases.has(purchase.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Access
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {expandedPurchases.has(purchase.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 pt-0">
                              <div className="mb-4">
                                <h4 className="text-sm font-medium text-zinc-300 mb-3">
                                  Content ({purchase.contentItems?.length || 0} items)
                                </h4>
                              </div>

                              {purchase.contentItems && purchase.contentItems.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  {purchase.contentItems.map((item) => (
                                    <div
                                      key={item.id}
                                      className="bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors"
                                    >
                                      {/* Content Thumbnail */}
                                      <div className="aspect-video bg-zinc-900 rounded-lg mb-3 overflow-hidden relative group">
                                        {item.thumbnailUrl ? (
                                          <img
                                            src={item.thumbnailUrl || "/placeholder.svg"}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Play className="h-8 w-8 text-zinc-600" />
                                          </div>
                                        )}

                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Play className="h-8 w-8 text-white" />
                                        </div>
                                      </div>

                                      {/* Content Info */}
                                      <div className="space-y-2">
                                        <h5 className="font-medium text-white text-sm line-clamp-1">{item.title}</h5>

                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                          <span className="capitalize">{item.type}</span>
                                          {item.size && <span>{formatFileSize(item.size)}</span>}
                                        </div>

                                        {/* Content Actions */}
                                        <div className="flex gap-2 pt-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-700 bg-transparent"
                                          >
                                            <Download className="h-3 w-3 mr-1" />
                                            Download
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2 border-zinc-700 text-zinc-300 hover:bg-zinc-700 bg-transparent"
                                          >
                                            <Heart className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                                  <p className="text-sm text-zinc-500">No content items found</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
