"use client"

import { useState, useEffect } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Download, Calendar, DollarSign, Package, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Purchase {
  id: string
  sessionId: string
  itemId: string
  itemType: string
  title: string
  description: string
  thumbnailUrl: string
  amount: number
  currency: string
  purchasedAt: any
  accessUrl: string
  creatorName: string
  contentCount: number
  environment: string
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useAuthContext()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailedError, setDetailedError] = useState<any>(null)

  const fetchPurchases = async () => {
    if (!user) {
      console.log("❌ [Purchases Page] No user found")
      setError("Please log in to view your purchases")
      setLoading(false)
      return
    }

    console.log("🔍 [Purchases Page] Fetching purchases for user:", user.uid)
    setLoading(true)
    setError(null)
    setDetailedError(null)

    try {
      // Get Firebase auth token
      const token = await user.getIdToken()
      console.log("✅ [Purchases Page] Got auth token")

      const response = await fetch(`/api/user/purchases?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📡 [Purchases Page] API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ [Purchases Page] API error:", errorData)
        setDetailedError(errorData)
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [Purchases Page] API response:", data)

      setPurchases(data.purchases || [])
      console.log(`📦 [Purchases Page] Loaded ${data.purchases?.length || 0} purchases`)
    } catch (err: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", err)
      setError(err.message || "Failed to fetch purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchPurchases()
    }
  }, [user, authLoading])

  const formatDate = (date: any) => {
    if (!date) return "Unknown"
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatAmount = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-white/60">Loading your purchases...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error loading purchases:</strong> {error}
          </AlertDescription>
        </Alert>

        {detailedError && (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-white/60 overflow-auto bg-black/20 p-4 rounded">
                {JSON.stringify(detailedError, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Package className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Debug section */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-white/60">
            <div>User ID: {user?.uid || "Not logged in"}</div>
            <div>Auth Loading: {authLoading.toString()}</div>
            <div>Page Loading: {loading.toString()}</div>
            <div>Error: {error || "None"}</div>
            <div>Timestamp: {new Date().toISOString()}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No purchases yet</h3>
            <p className="text-white/60 mb-6">
              You haven't purchased any content yet. Browse our catalog to get started!
            </p>
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/dashboard/explore">
                <Package className="h-4 w-4 mr-2" />
                Browse Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
        <p className="text-white/70">Access your purchased content and downloads</p>
      </div>

      <div className="grid gap-6">
        {purchases.map((purchase) => (
          <Card
            key={purchase.id}
            className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {purchase.thumbnailUrl && (
                      <img
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.title}
                        className="w-16 h-16 rounded-lg object-cover bg-white/5"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{purchase.title}</h3>
                      <p className="text-sm text-white/60">by {purchase.creatorName}</p>
                    </div>
                  </div>

                  {purchase.description && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">{purchase.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(purchase.purchasedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatAmount(purchase.amount, purchase.currency)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {purchase.contentCount || 0} items
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                  >
                    <Link href={purchase.accessUrl}>
                      <Download className="h-4 w-4 mr-2" />
                      Access Content
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Debug info for development */}
      {process.env.NODE_ENV === "development" && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-8">
          <CardHeader>
            <CardTitle className="text-white text-sm">Development Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-white/60 overflow-auto bg-black/20 p-4 rounded">
              {JSON.stringify(
                {
                  userUid: user?.uid,
                  purchaseCount: purchases.length,
                  purchases: purchases.map((p) => ({
                    id: p.id,
                    title: p.title,
                    itemType: p.itemType,
                    amount: p.amount,
                  })),
                },
                null,
                2,
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
