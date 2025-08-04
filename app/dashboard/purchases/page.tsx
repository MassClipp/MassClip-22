"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Package, Eye, Download, Calendar, DollarSign, User, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Purchase {
  id: string
  bundleId?: string
  productBoxId?: string
  itemId: string
  amount: number
  currency: string
  status: string
  createdAt: any
  purchasedAt: any
  userEmail: string
  userName: string
  item?: {
    title: string
    description?: string
    thumbnailUrl?: string
  }
  creator?: {
    displayName?: string
    name?: string
    username?: string
  }
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchases = async () => {
    if (!user?.uid) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Purchases Page] Fetching purchases for user:", user.uid)

      const response = await fetch(`/api/user/purchases?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("🔍 [Purchases Page] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [Purchases Page] API error:", errorText)

        // Check if response is HTML (error page) instead of JSON
        if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
          throw new Error(
            `Server error (${response.status}): The API endpoint returned an HTML error page instead of JSON data.`,
          )
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const responseText = await response.text()
      console.log("🔍 [Purchases Page] Raw response:", responseText.substring(0, 200))

      if (!responseText.trim()) {
        throw new Error("Empty response from server")
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ [Purchases Page] JSON parse error:", parseError)
        throw new Error("Invalid JSON response from server")
      }

      console.log("🔍 [Purchases Page] Parsed response:", data)

      if (data.success && Array.isArray(data.purchases)) {
        setPurchases(data.purchases)
        console.log(`✅ [Purchases Page] Loaded ${data.purchases.length} purchases`)
      } else {
        throw new Error(data.error || "Invalid response format")
      }
    } catch (err: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", err)
      setError(err.message || "Failed to load purchases")
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

  const formatAmount = (amount: number, currency = "usd") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100) // Convert from cents to dollars
    } catch {
      return `$${(amount / 100).toFixed(2)}`
    }
  }

  const formatDate = (dateField: any) => {
    if (!dateField) return "Unknown date"

    try {
      let date: Date

      if (dateField.toDate && typeof dateField.toDate === "function") {
        // Firestore Timestamp
        date = dateField.toDate()
      } else if (dateField.seconds) {
        // Firestore Timestamp object
        date = new Date(dateField.seconds * 1000)
      } else if (typeof dateField === "string") {
        date = new Date(dateField)
      } else if (dateField instanceof Date) {
        date = dateField
      } else {
        return "Invalid date"
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.warn("Date formatting error:", error)
      return "Invalid date"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading your purchases...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Error Loading Purchases</CardTitle>
              <CardDescription className="text-red-700">{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Debug Information:</h4>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    <strong>User ID:</strong> {user?.uid || "Not available"}
                  </p>
                  <p>
                    <strong>Auth Loading:</strong> {authLoading.toString()}
                  </p>
                  <p>
                    <strong>Page Loading:</strong> {loading.toString()}
                  </p>
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                  <p>
                    <strong>Timestamp:</strong> {new Date().toISOString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Purchases</h1>
            <p className="text-gray-600 mt-1">Access your purchased content and downloads</p>
          </div>
          <Button onClick={fetchPurchases} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Purchases List */}
        {purchases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Purchases Yet</h3>
              <p className="text-gray-600 text-center mb-4">
                You haven't made any purchases yet. Browse our content to get started!
              </p>
              <Button asChild>
                <Link href="/dashboard/explore">
                  <Eye className="h-4 w-4 mr-2" />
                  Explore Content
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      <img
                        src={purchase.item?.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.item?.title || "Purchase"}
                        className="w-20 h-20 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 truncate">
                            {purchase.item?.title || `Purchase ${purchase.id.slice(-8)}`}
                          </h3>
                          {purchase.item?.description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{purchase.item.description}</p>
                          )}
                        </div>
                        <Badge
                          variant={purchase.status === "completed" ? "default" : "secondary"}
                          className={purchase.status === "completed" ? "bg-green-100 text-green-800" : ""}
                        >
                          {purchase.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatAmount(purchase.amount, purchase.currency)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(purchase.createdAt || purchase.purchasedAt)}</span>
                        </div>
                        {purchase.creator && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>
                              {purchase.creator.displayName || purchase.creator.name}
                              {purchase.creator.username && (
                                <span className="text-gray-400"> (@{purchase.creator.username})</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button asChild size="sm">
                          <Link href={`/${purchase.bundleId ? "bundles" : "product-box"}/${purchase.itemId}/content`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Content
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/${purchase.bundleId ? "bundles" : "product-box"}/${purchase.itemId}`}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
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
  )
}
