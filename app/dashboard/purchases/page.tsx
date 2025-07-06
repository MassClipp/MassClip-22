"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  ExternalLink,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Purchase {
  id: string
  productBoxId?: string
  bundleId?: string
  itemTitle: string
  itemDescription?: string
  thumbnailUrl?: string
  amount: number
  currency: string
  purchasedAt: Date
  status: string
  creatorUsername?: string
  creatorName?: string
  type: "product_box" | "bundle" | "subscription"
  sessionId?: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [filterType, setFilterType] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = useState("all")

  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching purchases:", error)
      setError(error instanceof Error ? error.message : "Failed to load purchases")
      toast({
        title: "Error",
        description: "Failed to load your purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      fetchPurchases()
    }
  }, [user, authLoading])

  // Filter and sort purchases
  const filteredPurchases = purchases
    .filter((purchase) => {
      const matchesSearch =
        purchase.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorUsername?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === "all" || purchase.type === filterType
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "recent" && isRecentPurchase(purchase)) ||
        (activeTab === "downloads" && purchase.type === "product_box") ||
        (activeTab === "favorites" && false) // TODO: Implement favorites

      return matchesSearch && matchesType && matchesTab
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
        case "amount":
          return b.amount - a.amount
        case "title":
          return a.itemTitle.localeCompare(b.itemTitle)
        case "creator":
          return (a.creatorName || "").localeCompare(b.creatorName || "")
        default:
          return 0
      }
    })

  const isRecentPurchase = (purchase: Purchase) => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return new Date(purchase.purchasedAt) > oneWeekAgo
  }

  const totalValue = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)
  const totalItems = purchases.length

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product_box":
        return <Package className="h-4 w-4" />
      case "bundle":
        return <ShoppingBag className="h-4 w-4" />
      case "subscription":
        return <RefreshCw className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
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
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="bg-gradient-to-t from-black/50 via-transparent to-black/20 min-h-screen">
          <div className="px-4 max-w-7xl mx-auto py-8">
            <div className="space-y-6">
              <Skeleton className="h-12 w-64 bg-gray-800" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-gray-800" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64 bg-gray-800" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="bg-gradient-to-t from-black/50 via-transparent to-black/20 min-h-screen w-full flex items-center justify-center">
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
              <p className="text-gray-400 mb-4">Please log in to view your purchases</p>
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link href="/login">Log In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="bg-gradient-to-t from-black/50 via-transparent to-black/20 min-h-screen">
        <div className="px-4 max-w-7xl mx-auto py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">My Collection</h1>
            <p className="text-gray-400">
              {totalItems} premium content items • ${totalValue.toFixed(2)} total value
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Package className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalItems}</p>
                    <p className="text-sm text-gray-400">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Total Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{purchases.filter(isRecentPurchase).length}</p>
                    <p className="text-sm text-gray-400">Recent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">
                All Items
              </TabsTrigger>
              <TabsTrigger value="downloads" className="data-[state=active]:bg-gray-700">
                Downloads
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-gray-700">
                Favorites
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-gray-700">
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search your collection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="date">Date Added</SelectItem>
                  <SelectItem value="amount">Price</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="product_box">Product Boxes</SelectItem>
                  <SelectItem value="bundle">Bundles</SelectItem>
                  <SelectItem value="subscription">Subscriptions</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex bg-gray-800/50 border border-gray-700/50 rounded-md backdrop-blur-sm">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={fetchPurchases}
                variant="outline"
                size="sm"
                className="border-gray-700/50 bg-gray-800/50 text-white hover:bg-gray-700/50 backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <Skeleton className="h-40 w-full mb-4 bg-gray-700" />
                    <Skeleton className="h-4 w-3/4 mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-1/2 bg-gray-700" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Error Loading Purchases</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredPurchases.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No purchases yet</h3>
                <p className="text-gray-400 mb-6">
                  Start building your premium content library with exclusive downloads and bundles.
                </p>
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <Link href="/dashboard/explore">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Explore Premium Content
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredPurchases.map((purchase) => (
                <Card
                  key={purchase.id}
                  className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/40 transition-colors"
                >
                  <CardContent className={viewMode === "grid" ? "p-6" : "p-4"}>
                    <div className={viewMode === "grid" ? "space-y-4" : "flex gap-4"}>
                      {/* Thumbnail */}
                      <div
                        className={viewMode === "grid" ? "aspect-video relative" : "w-24 h-16 relative flex-shrink-0"}
                      >
                        {purchase.thumbnailUrl ? (
                          <Image
                            src={purchase.thumbnailUrl || "/placeholder.svg"}
                            alt={purchase.itemTitle}
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700/50 rounded-lg flex items-center justify-center">
                            {getTypeIcon(purchase.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-white line-clamp-2">{purchase.itemTitle}</h3>
                          <Badge className={getStatusColor(purchase.status)}>
                            {purchase.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {purchase.status}
                          </Badge>
                        </div>

                        {purchase.itemDescription && (
                          <p className="text-sm text-gray-400 line-clamp-2">{purchase.itemDescription}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            {getTypeIcon(purchase.type)}
                            <span className="capitalize">{purchase.type.replace("_", " ")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${purchase.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(purchase.purchasedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {purchase.creatorName && (
                          <p className="text-sm text-gray-400">
                            by {purchase.creatorName}
                            {purchase.creatorUsername && ` (@${purchase.creatorUsername})`}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {purchase.type === "product_box" && purchase.productBoxId && (
                            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Link href={`/product-box/${purchase.productBoxId}/content`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Content
                              </Link>
                            </Button>
                          )}

                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                          >
                            <Link href={`/creator/${purchase.creatorUsername}`}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Creator Profile
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
