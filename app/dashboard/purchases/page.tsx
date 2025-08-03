"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingBag, Eye, DollarSign, Package, User, AlertCircle, RefreshCw, Star } from "lucide-react"
import Link from "next/link"

interface Purchase {
  id: string
  itemId: string
  itemType: "bundle" | "product_box"
  title: string
  description: string
  thumbnailUrl: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  amount: number
  currency: string
  sessionId: string
  status: string
  purchasedAt: any
  accessUrl: string
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchPurchases()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setPurchases([])
        return
      }

      console.log("🔄 [Purchases] Fetching purchases for user:", user.uid)

      // Get user's purchases from their personal collection
      const idToken = await user.getIdToken()
      const response = await fetch(`/api/user/purchases?userId=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch purchases")
      }

      const data = await response.json()
      console.log("📦 [Purchases] Fetched purchases:", data.purchases?.length || 0)

      setPurchases(data.purchases || [])
    } catch (err: any) {
      console.error("❌ [Purchases] Error fetching purchases:", err)
      setError(err.message)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date"

    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      date = new Date(timestamp)
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-96 bg-white/10" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-20 h-20 rounded-lg bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4 bg-white/10" />
                    <Skeleton className="h-4 w-1/2 bg-white/10" />
                    <Skeleton className="h-4 w-1/4 bg-white/10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
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

        <div className="flex space-x-4">
          <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
            <Link href="/dashboard">
              <Package className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Please log in to view your purchases</p>
        </div>

        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">You need to be logged in to view your purchases.</p>
            <Button asChild className="bg-red-600 hover:bg-red-700">
              <Link href="/login">
                <User className="w-4 h-4 mr-2" />
                Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state
  if (purchases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
          <p className="text-white/70">Access your purchased content and downloads</p>
        </div>

        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              You haven't made any purchases yet. Explore our premium content library to find amazing content from
              talented creators.
            </p>
            <div className="space-y-3">
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link href="/dashboard/explore">
                  <Star className="w-4 h-4 mr-2" />
                  Explore Premium Content
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10">
                <Link href="/dashboard">
                  <Package className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Purchases list
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Purchases</h1>
        <p className="text-white/70">
          {purchases.length} purchase{purchases.length !== 1 ? "s" : ""} • Lifetime access to all content
        </p>
      </div>

      {/* Purchases Grid */}
      <div className="grid gap-6">
        {purchases.map((purchase, index) => (
          <Card
            key={purchase.sessionId}
            className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: "fadeInUp 0.6s ease-out forwards",
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  {purchase.thumbnailUrl ? (
                    <img
                      src={purchase.thumbnailUrl || "/placeholder.svg"}
                      alt={purchase.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=80&width=80&text=No+Image"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Purchase Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{purchase.title}</h3>
                      <p className="text-white/70 text-sm mb-2 line-clamp-2">{purchase.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-white/60">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {purchase.creatorName}
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />${purchase.amount.toFixed(2)}{" "}
                          {purchase.currency.toUpperCase()}
                        </span>
                        <span>{formatDate(purchase.purchasedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-4">
                <Button asChild className="bg-red-600 hover:bg-red-700 flex-1">
                  <Link href={purchase.accessUrl}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Content
                  </Link>
                </Button>
                {purchase.creatorUsername && (
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    <Link href={`/creator/${purchase.creatorUsername}`}>
                      <User className="w-4 h-4 mr-2" />
                      Creator Profile
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
