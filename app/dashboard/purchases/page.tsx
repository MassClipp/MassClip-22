"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingBag,
  Calendar,
  DollarSign,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Package,
  Clock,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"

interface Purchase {
  id: string
  productBoxId: string
  sessionId: string
  amount: number
  currency: string
  status: string
  itemTitle: string
  itemDescription: string
  thumbnailUrl: string
  purchasedAt: Date
  isTestPurchase: boolean
  type: string
}

interface PurchasesResponse {
  success: boolean
  purchases: Purchase[]
  total: number
  source?: string
  error?: string
  details?: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard/purchases")
    }
  }, [user, authLoading, router])

  // Fetch purchases
  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Purchases Page] Fetching purchases...")

      const response = await fetch("/api/user/unified-purchases", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch purchases`)
      }

      const data: PurchasesResponse = await response.json()
      console.log("✅ [Purchases Page] API response:", data)

      if (data.success) {
        // Convert date strings back to Date objects
        const processedPurchases = data.purchases.map((purchase) => ({
          ...purchase,
          purchasedAt: new Date(purchase.purchasedAt),
        }))

        setPurchases(processedPurchases)
        setLastRefresh(new Date())

        // Only show error if there was a database issue but we still got some data
        if (data.error && data.purchases.length === 0) {
          console.warn("⚠️ [Purchases Page] API returned error but no purchases:", data.error)
        }
      } else {
        console.error("❌ [Purchases Page] API returned success: false")
        setPurchases([])
      }
    } catch (err: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", err)

      // Only show error for actual network/server issues
      if (err.message.includes("HTTP") || err.message.includes("fetch")) {
        setError(`Failed to load purchases: ${err.message}`)
      } else {
        // For other errors, just log them but don't show to user
        console.error("❌ [Purchases Page] Non-critical error:", err)
        setPurchases([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const handleRefresh = () => {
    fetchPurchases()
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "complete":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
          <p className="text-gray-600">View and manage your purchased content</p>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
          )}
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && purchases.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Purchases Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't purchased any content yet. Explore our creators and find something you like!
            </p>
            <Button asChild>
              <Link href="/">
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Purchases List */}
      {!loading && purchases.length > 0 && (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {purchase.thumbnailUrl ? (
                      <img
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.itemTitle}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{purchase.itemTitle}</h3>
                        {purchase.itemDescription && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{purchase.itemDescription}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {purchase.purchasedAt.toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {purchase.amount.toFixed(2)} {purchase.currency.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(purchase.status)}
                          <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
                          {purchase.isTestPurchase && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Test
                            </Badge>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {purchase.productBoxId && (
                            <Button asChild size="sm">
                              <Link href={`/product-box/${purchase.productBoxId}/content`}>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Access
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Purchase ID: {purchase.id.slice(-8)}</span>
                        {purchase.sessionId && <span>Session: {purchase.sessionId.slice(-8)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && purchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Purchase Summary</CardTitle>
            <CardDescription>Overview of your purchase history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{purchases.length}</div>
                <div className="text-sm text-gray-600">Total Purchases</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  ${purchases.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {purchases.filter((p) => p.status.toLowerCase() === "completed").length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
