"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, Package, AlertCircle, RefreshCw, Eye, TestTube } from "lucide-react"

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

  const filteredPurchases = purchases.filter(purchase => {
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
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalSpent, stats.currency)}
                </div>
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
              activeTab === "all"
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            All ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab ===
