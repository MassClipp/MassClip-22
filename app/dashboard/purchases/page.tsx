"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface Purchase {
  id: string
  productBoxId: string
  itemTitle: string
  itemDescription?: string
  amount: number
  currency: string
  purchasedAt: Date
  status: string
  thumbnailUrl?: string
  creatorUsername?: string
  creatorName?: string
  type: "product_box" | "bundle" | "subscription"
  sessionId?: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth()
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

      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch purchases" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (error) {
      console.error("Error fetching purchases:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to load purchases"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
  const filteredPurchases = purchases
    .filter((purchase) => {
      const matchesSearch =
        purchase.itemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.creatorUsername?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = filterType === "all" || purchase.type === filterType
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "recent" && new Date(purchase.purchasedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) ||
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
        default:
          return 0
      }
    })

  const totalValue = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-red-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-light text-white mb-2">Loading your collection...</h2>
            <p className="text-gray-400">Please wait while we fetch your purchases</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <div className="relative flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-white">Unable to Load Purchases</CardTitle>
              <CardDescription className="text-gray-400">{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button onClick={fetchPurchases} className="w-full bg-red-600 hover:bg-red-700 text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-gray-600 hover:bg-gray-700 text-white bg-transparent"
              >
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="relative">
        {/* Header */}
        <div className="px-4 max-w-7xl mx-auto pt-8 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Collection</h1>
              <p className="text-gray-400 text-lg">
                {purchases.length} premium content items • ${totalValue.toFixed(2)} total value
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchPurchases}
                variant="outline"
                size="sm"
                className="border-gray-600 hover:bg-gray-700 text-white bg-transparent backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 backdrop-blur-sm border border-gray-700/50">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 max-w-7xl mx-auto mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-red-600">
                All Items
              </TabsTrigger>
              <TabsTrigger value="downloads" className="data-[state=active]:bg-red-600">
                Downloads
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-red-600">
                Favorites
              </TabsTrigger>
              <TabsTrigger value="recent" className="data-[state=active]:bg-red-600">
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Controls */}
        <div className="px-4 max-w-7xl mx-auto mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search your collection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 backdrop-blur-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700/50 text-white backdrop-blur-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="date">Date Added</SelectItem>
                  <SelectItem value="amount">Price</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
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
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 max-w-7xl mx-auto pb-8">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-700/20 to-gray-800/20 flex items-center justify-center border border-gray-700/30">
                <Package className="h-12 w-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                {purchases.length === 0 ? "No purchases yet" : "No items match your search"}
              </h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                {purchases.length === 0
                  ? "Start building your premium content library with exclusive downloads and bundles."
                  : "Try adjusting your search terms or filters to find what you're looking for."}
              </p>
              {purchases.length === 0 && (
                <Button
                  asChild
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                >
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
              {filteredPurchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} viewMode={viewMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PurchaseCardProps {
  purchase: Purchase
  viewMode: "grid" | "list"
}

function PurchaseCard({ purchase, viewMode }: PurchaseCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product_box":
        return <Package className="h-4 w-4" />
      case "bundle":
        return <Grid3X3 className="h-4 w-4" />
      case "subscription":
        return <Clock className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  if (viewMode === "list") {
    return (
      <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gray-700/50 flex items-center justify-center overflow-hidden">
              {purchase.thumbnailUrl ? (
                <img
                  src={purchase.thumbnailUrl || "/placeholder.svg"}
                  alt={purchase.itemTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white truncate">{purchase.itemTitle}</h3>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {getTypeIcon(purchase.type)}
                  <span className="ml-1 capitalize">{purchase.type.replace("_", " ")}</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-400 mb-2">
                by {purchase.creatorName || purchase.creatorUsername || "Unknown Creator"}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(purchase.purchasedAt), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />${purchase.amount.toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(purchase.status)}`} />
                  <span className="capitalize">{purchase.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-gray-600 hover:bg-gray-700 text-white bg-transparent"
              >
                <Link href={`/product-box/${purchase.productBoxId}/content`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <Link href={`/product-box/${purchase.productBoxId}/content`}>
                  <Download className="h-4 w-4 mr-2" />
                  Access
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 group">
      <div className="aspect-video relative overflow-hidden rounded-t-lg bg-gray-700/50">
        {purchase.thumbnailUrl ? (
          <img
            src={purchase.thumbnailUrl || "/placeholder.svg"}
            alt={purchase.itemTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className="border-gray-600 text-gray-300 bg-black/50 backdrop-blur-sm">
            {getTypeIcon(purchase.type)}
            <span className="ml-1 capitalize">{purchase.type.replace("_", " ")}</span>
          </Badge>
        </div>
        <div className="absolute top-2 right-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(purchase.status)}`} />
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-white line-clamp-2 mb-1">{purchase.itemTitle}</h3>
            <p className="text-sm text-gray-400">
              by {purchase.creatorName || purchase.creatorUsername || "Unknown Creator"}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(purchase.purchasedAt), "MMM d")}
            </span>
            <span className="flex items-center gap-1 font-medium text-white">
              <DollarSign className="h-3 w-3" />${purchase.amount.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="flex-1 border-gray-600 hover:bg-gray-700 text-white bg-transparent"
            >
              <Link href={`/product-box/${purchase.productBoxId}/content`}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Link>
            </Button>
            <Button asChild size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              <Link href={`/product-box/${purchase.productBoxId}/content`}>
                <Download className="h-4 w-4 mr-2" />
                Access
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
