"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, ShoppingBag, Eye, DollarSign, Package } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FullscreenWrapper } from "@/components/fullscreen-wrapper"
import Link from "next/link"
import Image from "next/image"

interface SafePurchase {
  id: string
  productBoxId: string
  title: string
  thumbnailUrl: string
  creatorUsername: string
  creatorId: string
  purchaseDate: string
  amount: number
  currency: string
  totalItems: number
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()
  const [purchases, setPurchases] = useState<SafePurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    fetchPurchases()
  }, [user, authLoading, router])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)
      setPurchases([]) // Reset to empty array

      console.log(`🔍 [Purchases Page] Fetching purchases for user: ${user?.uid}`)

      if (!user) {
        throw new Error("User not authenticated")
      }

      const token = await user.getIdToken()

      // Try the unified purchases endpoint first
      const response = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // No purchases found - this is normal
          console.log(`ℹ️ [Purchases Page] No purchases found for user`)
          setPurchases([])
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`✅ [Purchases Page] Raw response:`, data)

      // Safely extract purchases array
      let rawPurchases: any[] = []

      if (Array.isArray(data)) {
        rawPurchases = data
      } else if (data && typeof data === "object") {
        if (Array.isArray(data.purchases)) {
          rawPurchases = data.purchases
        } else if (Array.isArray(data.data)) {
          rawPurchases = data.data
        }
      }

      console.log(`📦 [Purchases Page] Found ${rawPurchases.length} raw purchases`)

      // Transform to safe format
      const safePurchases: SafePurchase[] = []

      for (const rawPurchase of rawPurchases) {
        try {
          // Skip if not a valid object
          if (!rawPurchase || typeof rawPurchase !== "object") {
            continue
          }

          // Create safe purchase object with all required fields
          const safePurchase: SafePurchase = {
            id: String(
              rawPurchase.id ||
                rawPurchase.sessionId ||
                rawPurchase.purchaseId ||
                rawPurchase.productBoxId ||
                `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ),
            productBoxId: String(rawPurchase.productBoxId || rawPurchase.bundleId || rawPurchase.itemId || ""),
            title: String(
              rawPurchase.bundleTitle ||
                rawPurchase.productBoxTitle ||
                rawPurchase.title ||
                rawPurchase.itemTitle ||
                "Untitled Purchase",
            ),
            thumbnailUrl: String(
              rawPurchase.thumbnailUrl ||
                rawPurchase.productBoxThumbnail ||
                rawPurchase.previewImage ||
                rawPurchase.customPreviewThumbnail ||
                "",
            ),
            creatorUsername: String(
              rawPurchase.creatorUsername || (rawPurchase.creator && rawPurchase.creator.username) || "Unknown",
            ),
            creatorId: String(rawPurchase.creatorId || (rawPurchase.creator && rawPurchase.creator.id) || ""),
            purchaseDate: String(
              rawPurchase.purchaseDate || rawPurchase.purchasedAt || rawPurchase.createdAt || new Date().toISOString(),
            ),
            amount: Number(rawPurchase.amount) || 0,
            currency: String(rawPurchase.currency || "usd"),
            totalItems: Number(
              rawPurchase.totalItems ||
                rawPurchase.contentCount ||
                (Array.isArray(rawPurchase.items) ? rawPurchase.items.length : 0) ||
                (Array.isArray(rawPurchase.contents) ? rawPurchase.contents.length : 0) ||
                0,
            ),
          }

          // Only add if we have essential data
          if (safePurchase.productBoxId && safePurchase.title) {
            safePurchases.push(safePurchase)
          }
        } catch (transformError) {
          console.warn(`⚠️ [Purchases Page] Error transforming purchase:`, transformError)
          continue
        }
      }

      // Remove duplicates by productBoxId
      const uniquePurchases = safePurchases.filter(
        (purchase, index, self) => index === self.findIndex((p) => p.productBoxId === purchase.productBoxId),
      )

      console.log(`✅ [Purchases Page] Processed ${uniquePurchases.length} valid purchases`)
      setPurchases(uniquePurchases)
    } catch (error: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", error)
      setError(error.message || "Failed to load purchases")
      setPurchases([]) // Ensure empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContent = (purchase: SafePurchase) => {
    if (!purchase.productBoxId) {
      console.warn(`⚠️ [Purchases Page] No product box ID for purchase:`, purchase)
      return
    }
    console.log(`🔗 [Purchases Page] Opening content for:`, purchase.title)
    router.push(`/product-box/${purchase.productBoxId}/content`)
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <FullscreenWrapper className="bg-black">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-8">My Purchases</h1>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full bg-gray-800" />
                <Skeleton className="h-4 w-20 bg-gray-800" />
                <Skeleton className="h-10 w-full bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </FullscreenWrapper>
    )
  }

  return (
    <FullscreenWrapper className="bg-black">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Purchases</h1>
          <Button
            onClick={fetchPurchases}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-transparent border-gray-700 text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Border Line */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mb-8"></div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="max-w-md mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-4">No purchases found</div>
            <div className="text-gray-500 text-sm mb-4">
              {error ? "There was an error loading your purchases." : "You haven't made any purchases yet."}
            </div>
            <Button onClick={fetchPurchases} className="mb-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              {error ? "Try Again" : "Check Again"}
            </Button>
            {!error && (
              <div className="text-gray-500 text-sm">
                <Link href="/dashboard/explore" className="text-blue-400 hover:text-blue-300">
                  Browse creators
                </Link>{" "}
                to find premium content to purchase
              </div>
            )}
          </div>
        ) : (
          /* Purchases Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {purchases.map((purchase, index) => (
              <Card
                key={purchase.id}
                className="bg-gray-900/50 border-gray-800 overflow-hidden group hover:bg-gray-900/70 transition-all duration-300 relative"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.6s ease-out forwards",
                }}
              >
                <div className="relative">
                  {/* Creator Username - Top Left */}
                  <div className="absolute top-3 left-3 z-10">
                    <Link
                      href={`/creator/${purchase.creatorUsername}`}
                      className="text-xs text-white/80 hover:text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
                    >
                      {purchase.creatorUsername}
                    </Link>
                  </div>

                  {/* Thumbnail - 1:1 Aspect Ratio */}
                  <div className="aspect-square relative bg-gray-800">
                    {purchase.thumbnailUrl ? (
                      <Image
                        src={purchase.thumbnailUrl || "/placeholder.svg"}
                        alt={purchase.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        onError={(e) => {
                          console.warn(`⚠️ [Purchases Page] Image failed to load:`, purchase.thumbnailUrl)
                          // Hide the image on error
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-gray-500 h-12 w-12" />
                      </div>
                    )}
                  </div>

                  {/* Border Line */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="text-white text-sm font-medium mb-3 line-clamp-2 min-h-[2.5rem]">
                      {purchase.title}
                    </h3>

                    {/* Purchase Info */}
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />${purchase.amount.toFixed(2)}
                      </span>
                      {purchase.totalItems > 0 && (
                        <span className="flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          {purchase.totalItems} items
                        </span>
                      )}
                    </div>

                    {/* Open Button */}
                    <Button
                      onClick={() => handleOpenContent(purchase)}
                      className="w-full bg-white text-black hover:bg-gray-100 font-medium"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
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
    </FullscreenWrapper>
  )
}
