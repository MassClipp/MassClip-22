"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ShoppingBag, ExternalLink, RefreshCw } from "lucide-react"

interface Purchase {
  id: string
  productBoxId: string
  bundleTitle: string
  productBoxTitle: string
  thumbnailUrl?: string
  productBoxThumbnail?: string
  creatorUsername: string
  creatorId: string
  purchaseDate: string | Date
  purchasedAt: string | Date
  amount: number
  currency: string
  status: string
  source: string
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    }
  }, [user])

  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      console.log(`🔍 [Purchases Page] Fetching purchases for user: ${user.uid}`)

      const idToken = await user.getIdToken()

      // Try unified purchases API first
      const unifiedResponse = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (unifiedResponse.ok) {
        const responseData = await unifiedResponse.json()
        console.log(`📦 [Purchases Page] Unified purchases response:`, responseData)

        // Handle both array and object responses
        let unifiedPurchases = []
        if (Array.isArray(responseData)) {
          unifiedPurchases = responseData
        } else if (responseData.purchases && Array.isArray(responseData.purchases)) {
          unifiedPurchases = responseData.purchases
        }

        console.log(`✅ [Purchases Page] Found ${unifiedPurchases.length} purchases from unified API`)

        if (unifiedPurchases.length > 0) {
          setPurchases(unifiedPurchases)
          setLoading(false)
          return
        }
      }

      // Fallback to legacy purchases API
      console.log(`🔍 [Purchases Page] Trying legacy purchases API...`)

      const legacyResponse = await fetch("/api/user/purchases", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (legacyResponse.ok) {
        const legacyPurchases = await legacyResponse.json()
        console.log(`📦 [Purchases Page] Legacy purchases response:`, legacyPurchases)

        const purchasesArray = Array.isArray(legacyPurchases) ? legacyPurchases : []
        console.log(`✅ [Purchases Page] Found ${purchasesArray.length} purchases from legacy API`)

        // Transform legacy purchases to match expected format
        const transformedPurchases = purchasesArray.map((purchase: any) => ({
          id: purchase.id || purchase.sessionId || purchase.productBoxId,
          productBoxId: purchase.productBoxId || purchase.itemId,
          bundleTitle: purchase.itemTitle || purchase.bundleTitle || "Untitled Bundle",
          productBoxTitle: purchase.itemTitle || purchase.bundleTitle || "Untitled Bundle",
          thumbnailUrl: purchase.thumbnailUrl || purchase.customPreviewThumbnail,
          productBoxThumbnail: purchase.thumbnailUrl || purchase.customPreviewThumbnail,
          creatorUsername: purchase.creatorUsername || "Unknown",
          creatorId: purchase.creatorId || "",
          purchaseDate: purchase.purchasedAt || purchase.timestamp || purchase.createdAt,
          purchasedAt: purchase.purchasedAt || purchase.timestamp || purchase.createdAt,
          amount: purchase.amount || 0,
          currency: purchase.currency || "usd",
          status: purchase.status || "completed",
          source: "legacy",
        }))

        setPurchases(transformedPurchases)
      } else {
        console.error(`❌ [Purchases Page] Legacy API failed:`, legacyResponse.status)
        setError("Failed to load purchases")
      }
    } catch (error: any) {
      console.error(`❌ [Purchases Page] Error fetching purchases:`, error)
      setError(error.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | Date): string => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Unknown date"
    }
  }

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Purchases</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <Button onClick={fetchPurchases} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No purchases yet</h2>
            <p className="text-gray-600 mb-6">Browse creators to find premium content to purchase</p>
            <Button onClick={() => (window.location.href = "/dashboard")}>Browse Content</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{purchase.bundleTitle}</CardTitle>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {purchase.source}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  by @{purchase.creatorUsername} • {formatDate(purchase.purchaseDate)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Thumbnail */}
                {purchase.thumbnailUrl && (
                  <div className="mb-4">
                    <img
                      src={purchase.thumbnailUrl || "/placeholder.svg"}
                      alt={purchase.bundleTitle}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=128&width=200"
                      }}
                    />
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">{formatPrice(purchase.amount, purchase.currency)}</span>
                  <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>{purchase.status}</Badge>
                </div>

                {/* Access Button */}
                <Button
                  onClick={() => (window.location.href = `/product-box/${purchase.productBoxId}/content`)}
                  className="w-full"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Access Content
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Debug Info */}
      {purchases.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-gray-500 space-y-1">
              <div>Total purchases found: {purchases.length}</div>
              <div>Sources: {Array.from(new Set(purchases.map((p) => p.source))).join(", ")}</div>
              <div>User ID: {user?.uid}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
