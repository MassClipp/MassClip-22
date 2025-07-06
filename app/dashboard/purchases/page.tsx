"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  Calendar,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

interface Purchase {
  id: string
  type: "product_box" | "bundle" | "premium_video"
  itemId: string
  itemTitle: string
  itemDescription?: string
  amount: number
  currency: string
  purchasedAt: Date
  status: string
  thumbnailUrl?: string
  creatorUsername?: string
  creatorName?: string
  sessionId?: string
  downloadCount?: number
  lastDownloaded?: Date
  tags?: string[]
  stripeMode?: "test" | "live"
}

interface PurchaseStats {
  totalPurchases: number
  totalSpent: number
  currency: string
  thisMonth: number
  lastDownload?: Date
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("date-desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = useState("all")

  const fetchPurchases = async (showToast = false) => {
    if (!user) return

    try {
      if (showToast) setRefreshing(true)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      // Transform the data to match our interface
      const transformedPurchases: Purchase[] = data.purchases.map((p: any) => ({
        ...p,
        purchasedAt: new Date(p.purchasedAt),
        lastDownloaded: p.lastDownloaded ? new Date(p.lastDownloaded) : undefined,
      }))

      setPurchases(transformedPurchases)
      setStats(data.stats)
      setError(null)

      if (showToast) {
        toast({
          title: "Purchases Updated",
          description: `Found ${transformedPurchases.length} purchases`,
        })
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load purchases"
      setError(errorMessage)

      if (showToast) {
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchPurchases()
    } else if (!authLoading && !user) {
      setError("Please log in to view your purchases")
      setLoading(false)
    }
  }, [user, authLoading])

  // Filter and sort purchases
  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.creatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.creatorUsername?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === "all" || purchase.type === selectedType
    const matchesStatus = selectedStatus === "all" || purchase.status === selectedStatus
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "downloads" && purchase.downloadCount && purchase.downloadCount > 0) ||
      (activeTab === "favorites" && purchase.tags?.includes("favorite")) ||
      (activeTab === "recent" && new Date().getTime() - purchase.purchasedAt.getTime() < 7 * 24 * 60 * 60 * 1000)

    return matchesSearch && matchesType && matchesStatus && matchesTab
  })

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return b.purchasedAt.getTime() - a.purchasedAt.getTime()
      case "date-asc":
        return a.purchasedAt.getTime() - b.purchasedAt.getTime()
      case "amount-desc":
        return b.amount - a.amount
      case "amount-asc":
        return a.amount - b.amount
      case "title-asc":
        return a.itemTitle.localeCompare(b.itemTitle)
      case "title-desc":
        return b.itemTitle.localeCompare(a.itemTitle)
      default:
        return 0
    }
  })

  const handleRefresh = () => {
    fetchPurchases(true)
  }

  const formatCurrency = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product_box":
        return <ShoppingBag className="h-4 w-4" />
      case "bundle":
        return <Grid3X3 className="h-4 w-4" />
      case "premium_video":
        return <Eye className="h-4 w-4" />
      default:
        return <ShoppingBag className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 backdrop-blur-sm" />
        <div className="relative">
          <div className="px-4 max-w-7xl mx-auto py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-red-500 animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-light text-white mb-2">Loading your collection...</h2>
                <p className="text-gray-400">Fetching your premium content purchases</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 backdrop-blur-sm" />
        <div className="relative">
          <div className="px-4 max-w-7xl mx-auto py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="w-full max-w-md bg-gray-800/30 border-red-500/30 backdrop-blur-sm">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Failed to Load Purchases</h3>
                  <p className="text-gray-400 text-sm mb-4">{error}</p>
                  <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 text-white">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 backdrop-blur-sm" />
      <div className="relative">
        <div className="px-4 max-w-7xl mx-auto py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-light text-white mb-2">My Collection</h1>
                <p className="text-gray-400">
                  {stats ? (
                    <>
                      {stats.totalPurchases} premium content items • {formatCurrency(stats.totalSpent, stats.currency)}{" "}
                      total value
                    </>
                  ) : (
                    "Loading your premium content library..."
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  className="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50 backdrop-blur-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <div className="flex bg-gray-800/30 rounded-lg border border-gray-700/50 backdrop-blur-sm">
                  <Button
                    onClick={() => setViewMode("grid")}
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className={
                      viewMode === "grid"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                    }
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setViewMode("list")}
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className={
                      viewMode === "list"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                    }
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-8 w-8 text-red-400" />
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.totalPurchases}</p>
                        <p className="text-gray-400 text-sm">Total Items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-green-400" />
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(stats.totalSpent, stats.currency)}
                        </p>
                        <p className="text-gray-400 text-sm">Lifetime Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-8 w-8 text-blue-400" />
                      <div>
                        <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
                        <p className="text-gray-400 text-sm">This Month</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {stats.lastDownload ? formatDate(stats.lastDownload) : "Never"}
                        </p>
                        <p className="text-gray-400 text-sm">Last Download</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                All Items
              </TabsTrigger>
              <TabsTrigger value="downloads" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Downloads
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Favorites
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 backdrop-blur-sm">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search your collection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700/50 text-white">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="date-desc">Date Added</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Price: High to Low</SelectItem>
                    <SelectItem value="amount-asc">Price: Low to High</SelectItem>
                    <SelectItem value="title-asc">Title: A to Z</SelectItem>
                    <SelectItem value="title-desc">Title: Z to A</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36 bg-gray-800/50 border-gray-700/50 text-white">
                    <Filter className="h-4 w-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="product_box">Product Boxes</SelectItem>
                    <SelectItem value="bundle">Bundles</SelectItem>
                    <SelectItem value="premium_video">Premium Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content */}
          <TabsContent value={activeTab} className="mt-0">
            {sortedPurchases.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/30 flex items-center justify-center border border-gray-700/50">
                  <ShoppingBag className="h-12 w-12 text-gray-500" />
                </div>
                <h3 className="text-2xl font-light text-white mb-2">
                  {purchases.length === 0 ? "No purchases yet" : "No items match your filters"}
                </h3>
                <p className="text-gray-400 mb-6">
                  {purchases.length === 0
                    ? "Start building your premium content library with exclusive downloads and bundles."
                    : "Try adjusting your search terms or filters to find what you're looking for."}
                </p>
                {purchases.length === 0 && (
                  <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                    <Link href="/dashboard/explore">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Explore Premium Content
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
                }
              >
                {sortedPurchases.map((purchase) => (
                  <Card
                    key={purchase.id}
                    className={`bg-gray-800/30 border-gray-700/50 hover:border-red-500/50 transition-all duration-200 backdrop-blur-sm group ${
                      viewMode === "list" ? "flex" : ""
                    }`}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="relative aspect-video bg-gray-900/50 rounded-t-lg overflow-hidden">
                          {purchase.thumbnailUrl ? (
                            <Image
                              src={purchase.thumbnailUrl || "/placeholder.svg"}
                              alt={purchase.itemTitle}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getTypeIcon(purchase.type)}
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
                          </div>
                          {purchase.stripeMode === "test" && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Test</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-white line-clamp-2 flex-1">{purchase.itemTitle}</h3>
                            <span className="text-green-400 font-medium ml-2 whitespace-nowrap">
                              {formatCurrency(purchase.amount, purchase.currency)}
                            </span>
                          </div>

                          {purchase.creatorName && (
                            <p className="text-gray-400 text-sm mb-2">by {purchase.creatorName}</p>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>{formatDate(purchase.purchasedAt)}</span>
                            <div className="flex items-center gap-1">
                              {getTypeIcon(purchase.type)}
                              <span className="capitalize">{purchase.type.replace("_", " ")}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button asChild size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                              <Link href={`/${purchase.type}/${purchase.itemId}/content`}>
                                <Download className="h-3 w-3 mr-1" />
                                Access
                              </Link>
                            </Button>
                            {purchase.creatorUsername && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700/50 bg-transparent"
                              >
                                <Link href={`/creator/${purchase.creatorUsername}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-gray-900/50 rounded-l-lg overflow-hidden flex-shrink-0">
                          {purchase.thumbnailUrl ? (
                            <Image
                              src={purchase.thumbnailUrl || "/placeholder.svg"}
                              alt={purchase.itemTitle}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getTypeIcon(purchase.type)}
                            </div>
                          )}
                        </div>
                        <CardContent className="flex-1 p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-white">{purchase.itemTitle}</h3>
                              <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
                              {purchase.stripeMode === "test" && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Test</Badge>
                              )}
                            </div>
                            {purchase.creatorName && (
                              <p className="text-gray-400 text-sm mb-1">by {purchase.creatorName}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{formatDate(purchase.purchasedAt)}</span>
                              <div className="flex items-center gap-1">
                                {getTypeIcon(purchase.type)}
                                <span className="capitalize">{purchase.type.replace("_", " ")}</span>
                              </div>
                              <span className="text-green-400 font-medium">
                                {formatCurrency(purchase.amount, purchase.currency)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                              <Link href={`/${purchase.type}/${purchase.itemId}/content`}>
                                <Download className="h-3 w-3 mr-1" />
                                Access
                              </Link>
                            </Button>
                            {purchase.creatorUsername && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700/50 bg-transparent"
                              >
                                <Link href={`/creator/${purchase.creatorUsername}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </div>
    </div>
  )
}
