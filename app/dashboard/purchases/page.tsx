"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  RefreshCw,
  Eye,
  ExternalLink,
  TestTube,
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
  type: string
  stripeMode?: string
  sessionId?: string
}

interface PurchaseStats {
  totalPurchases: number
  totalSpent: number
  currency: string
  testPurchases: number
  livePurchases: number
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"all" | "test" | "live">("all")

  const fetchPurchases = async () => {
    if (!user) return

    try {
      console.log("🔍 [Purchases Page] Fetching user purchases...")

      const idToken = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("✅ [Purchases Page] Purchases fetched:", {
        count: data.purchases?.length || 0,
        stats: data.stats,
      })

      setPurchases(data.purchases || [])
      setStats(data.stats || null)
      setError(null)
    } catch (error) {
      console.error("❌ [Purchases Page] Error fetching purchases:", error)
      setError(error instanceof Error ? error.message : "Failed to load purchases")
      toast({
        title: "Error",
        description: "Failed to load your purchases. Please try again.",
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

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchPurchases()
  }

  const filteredPurchases = purchases.filter((purchase) => {
    if (activeTab === "all") return true
    if (activeTab === "test") return purchase.stripeMode === "test"
    if (activeTab === "live") return purchase.stripeMode === "live"
    return true
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-800/30 border-gray-700/50">
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
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
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800/30 border-gray-700/50">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">Error Loading Purchases</CardTitle>
            <CardDescription className="text-gray-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-gray-400">View and manage your purchased content</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Purchases</CardTitle>
                <Package className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalPurchases}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalSpent, stats.currency)}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Test Purchases</CardTitle>
                <TestTube className="h-4 w-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">{stats.testPurchases}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Live Purchases</CardTitle>
                <Eye className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{stats.livePurchases}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-800/30 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "all" ? "bg-white text-black" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            All ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "test" ? "bg-amber-500 text-black" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            Test ({purchases.filter((p) => p.stripeMode === "test").length})
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "live" ? "bg-green-500 text-black" : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            Live ({purchases.filter((p) => p.stripeMode === "live").length})
          </button>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length === 0 ? (
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {activeTab === "all" ? "No purchases yet" : `No ${activeTab} purchases`}
              </h3>
              <p className="text-gray-400 mb-6">
                {activeTab === "all"
                  ? "Start exploring our content to make your first purchase"
                  : `You haven't made any ${activeTab} purchases yet`}
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
              >
                <Link href="/dashboard/explore">Browse Content</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => (
              <Card
                key={purchase.id}
                className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/40 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Thumbnail */}
                      <div className="relative">
                        {purchase.thumbnailUrl ? (
                          <img
                            src={purchase.thumbnailUrl || "/placeholder.svg"}
                            alt={purchase.itemTitle}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-gray-700 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        {purchase.stripeMode === "test" && (
                          <Badge className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs px-1 py-0">
                            Test
                          </Badge>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white mb-1">{purchase.itemTitle}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(purchase.purchasedAt), "MMM d, yyyy")}
                          </span>
                          {purchase.creatorUsername && <span>by @{purchase.creatorUsername}</span>}
                          <Badge variant="outline" className="text-xs">
                            {purchase.type.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {formatCurrency(purchase.amount, purchase.currency)}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{purchase.status}</div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          asChild
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                        >
                          <Link href={`/product-box/${purchase.productBoxId}/content`}>
                            <Download className="h-3 w-3 mr-1" />
                            Access
                          </Link>
                        </Button>

                        {purchase.creatorUsername && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-gray-600 hover:bg-gray-700 bg-transparent"
                          >
                            <Link href={`/creator/${purchase.creatorUsername}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Creator
                            </Link>
                          </Button>
                        )}
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
  )
}
