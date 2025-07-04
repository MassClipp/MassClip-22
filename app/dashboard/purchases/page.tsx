"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Package, Calendar, DollarSign, AlertCircle, RefreshCw, Download } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface Purchase {
  id: string
  title?: string
  description?: string
  price?: number
  currency?: string
  status?: string
  purchaseDate?: any
  productType?: string
  creatorUsername?: string
  creatorId?: string
  productId?: string
  bundleId?: string
  productBoxId?: string
  stripeSessionId?: string
  metadata?: any
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()

  const fetchPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/user/unified-purchases", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Ensure all purchases have required fields with fallbacks
        const normalizedPurchases = (data.purchases || []).map((purchase: any) => ({
          id: purchase.id || "",
          title: purchase.title || purchase.productName || "Untitled Purchase",
          description: purchase.description || purchase.productDescription || "",
          price: typeof purchase.price === "number" ? purchase.price : 0,
          currency: purchase.currency || "usd",
          status: purchase.status || "completed",
          purchaseDate: purchase.purchaseDate || purchase.createdAt || new Date(),
          productType: purchase.productType || purchase.type || "unknown",
          creatorUsername: purchase.creatorUsername || purchase.creator || "Unknown Creator",
          creatorId: purchase.creatorId || "",
          productId: purchase.productId || "",
          bundleId: purchase.bundleId || "",
          productBoxId: purchase.productBoxId || "",
          stripeSessionId: purchase.stripeSessionId || "",
          metadata: purchase.metadata || {},
          ...purchase,
        }))

        setPurchases(normalizedPurchases)
      } else {
        throw new Error(data.error || "Failed to fetch purchases")
      }
    } catch (err) {
      console.error("Error fetching purchases:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchPurchases()
    } else if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Filter purchases based on search query with safe string operations
  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases

    const query = searchQuery.toLowerCase().trim()

    return purchases.filter((purchase) => {
      // Safely check each field with fallbacks
      const title = (purchase.title || "").toLowerCase()
      const description = (purchase.description || "").toLowerCase()
      const creatorUsername = (purchase.creatorUsername || "").toLowerCase()
      const productType = (purchase.productType || "").toLowerCase()
      const status = (purchase.status || "").toLowerCase()

      return (
        title.includes(query) ||
        description.includes(query) ||
        creatorUsername.includes(query) ||
        productType.includes(query) ||
        status.includes(query)
      )
    })
  }, [purchases, searchQuery])

  const formatDate = (date: any) => {
    try {
      if (!date) return "Unknown date"

      // Handle Firestore timestamp
      if (date.toDate && typeof date.toDate === "function") {
        return date.toDate().toLocaleDateString()
      }

      // Handle regular date
      if (date instanceof Date) {
        return date.toLocaleDateString()
      }

      // Handle string date
      if (typeof date === "string") {
        return new Date(date).toLocaleDateString()
      }

      return "Unknown date"
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Unknown date"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "active":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Purchases</h1>
          <p className="text-muted-foreground">View and manage your purchased content</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search purchases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchPurchases} className="ml-4 bg-transparent">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPurchases.length === 0 && purchases.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't purchased any content yet. Browse our catalog to find premium content.
              </p>
              <Button onClick={() => router.push("/dashboard/explore")}>Browse Content</Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && !error && filteredPurchases.length === 0 && purchases.length > 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">No purchases match your search query "{searchQuery}"</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Purchases List */}
        {!loading && !error && filteredPurchases.length > 0 && (
          <div className="grid gap-6">
            {filteredPurchases.map((purchase) => (
              <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2">{purchase.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {purchase.description || "No description available"}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(purchase.status || "")}>
                      {(purchase.status || "unknown").charAt(0).toUpperCase() + (purchase.status || "unknown").slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          ${(purchase.price || 0).toFixed(2)} {(purchase.currency || "USD").toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(purchase.purchaseDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{purchase.productType || "Unknown"}</span>
                      </div>
                      <div className="text-muted-foreground">by {purchase.creatorUsername || "Unknown Creator"}</div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Access Content
                      </Button>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
